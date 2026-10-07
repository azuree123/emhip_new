import { DatePipe, DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, HostListener, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  GuestPathway,
  RecordCmhtContactRequest,
  UrgentCaseContactDto,
  UrgentEpisodeRecordDto,
  UrgentEpisodeSummaryDto,
} from '../../core/api-models';
import { AuthService } from '../../core/auth.service';
import { Permissions } from '../../core/permissions';
import { UrgentCasesApiService } from '../../core/urgent-cases-api.service';
import { documentErrorMessage } from '../../core/documents-api.service';
import { CaseworkNoteDrawerComponent } from '../guest-workspace/casework-note-drawer.component';
import { StatusChip } from '../guest-workspace/guest-workspace.util';

const PATHWAY_CHIPS: Record<GuestPathway, StatusChip> = {
  MentalWellbeing: { label: 'Mental Wellbeing', bg: '#fff9e4', fg: '#9d852d' },
  ClinicalSupport: { label: 'Clinical Support', bg: '#ecf2ff', fg: '#345bb1' },
  CommunityRecovery: { label: 'Community Recovery', bg: '#eafdee', fg: '#147129' },
};

const NO_PATHWAY: StatusChip = { label: 'Not allocated', bg: '#f0f0f0', fg: '#646464' };

/** The countdown turns red when fewer than this many hours remain (record spec §2). */
const WARNING_HOURS = 6;

/** What changed, so the host list can refresh (and drop the case when it was resolved). */
export interface UrgentCaseRecordChange {
  guestId: string;
  resolved: boolean;
}

/**
 * "Urgent Case Record" — the full-screen record behind the Urgent Cases dashboard (clicking a case,
 * "View Urgent Case Record", and the resolved rows). Laid out from the customer's field
 * specification (EMHIP_Urgent_Case_Record_Spec.docx, Oct 2026):
 *
 *  1. Header — guest name (opens the workspace), reference, assigned CMHW, pathway at time of flag.
 *  2. Status bar — live 72-hour countdown (red under 6 hours), deadline, Open / Resolved.
 *  3. Flag details — raised by (from the login), raised at, risks, urgent case notes.
 *  4. Actions taken — "CMHT or other NHS team notified" recorded by hand (EMHIP has no CMHT
 *     integration, so there is no "Escalate" button), contacts logged since the flag, Add contact.
 *  5. Resolution — "Mark as resolved" asks for inpatient admission and any other external service;
 *     resolved by / at come from the login and the clock.
 *  6. One tab per urgent case ("Urgent Case 1, 2, …"); the open case is the default view.
 *  7. System audit trail at the bottom.
 *
 * The record does its own writes (CMHT contact, resolve, Add contact) and emits `changed` so the
 * host can refresh its lists. Every view and export is written to the guest's access log by the API.
 */
@Component({
  selector: 'emhip-urgent-episode-record',
  standalone: true,
  imports: [DatePipe, DecimalPipe, FormsModule, RouterLink, CaseworkNoteDrawerComponent],
  templateUrl: './urgent-episode-record.component.html',
  styleUrl: './urgent-episode-record.component.scss',
})
export class UrgentEpisodeRecordComponent {
  private readonly api = inject(UrgentCasesApiService);
  private readonly auth = inject(AuthService);

  readonly guestId = input.required<string>();
  /** The urgent case to open first; null picks the open one, else the newest. */
  readonly episodeId = input<string | null>(null);

  readonly closed = output<void>();
  readonly changed = output<UrgentCaseRecordChange>();

  readonly episodes = signal<UrgentEpisodeSummaryDto[]>([]);
  readonly selectedId = signal<string | null>(null);
  readonly record = signal<UrgentEpisodeRecordDto | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly exporting = signal(false);
  readonly exportError = signal<string | null>(null);
  readonly nowTick = signal(Date.now());

  /** Recording the CMHT call and resolving write clinical data. */
  readonly canAct = this.auth.hasPermission(Permissions.Guests.ClinicalEdit);
  /** "Add contact" writes a casework note, so it follows the notes-add claim. */
  readonly canAddContact = this.auth.hasPermission(Permissions.Guests.NotesAdd);
  readonly userName = this.auth.current().displayName;

  // ---- 2. Status bar ----

  /** Hours left until the deadline (negative once overdue); frozen at the resolution time. */
  readonly hoursRemaining = computed(() => {
    const r = this.record();
    if (!r) return 0;
    void this.nowTick();
    const end = r.isResolved && r.resolvedAt ? new Date(r.resolvedAt).getTime() : Date.now();
    return (new Date(r.deadlineAt).getTime() - end) / 3_600_000;
  });

  readonly countdownPct = computed(() => {
    const r = this.record();
    if (!r) return 0;
    return Math.min(100, Math.max(0, ((r.responseHours - this.hoursRemaining()) / r.responseHours) * 100));
  });

  /** red: under 6 hours left or overdue · amber: open · green: resolved. */
  readonly countdownTone = computed<'red' | 'amber' | 'green'>(() => {
    const r = this.record();
    if (r?.isResolved) return 'green';
    return this.hoursRemaining() < WARNING_HOURS ? 'red' : 'amber';
  });

  readonly countdownText = computed(() => {
    const r = this.record();
    if (!r) return '';
    const left = this.hoursRemaining();
    if (r.isResolved) {
      return left >= 0 ? `Resolved — ${this.hm(left)} before deadline` : `Resolved — ${this.hm(-left)} after deadline`;
    }
    return left >= 0 ? `${this.hm(left)} remaining` : `Overdue — ${this.hm(-left)} past deadline`;
  });

  // ---- 4. Actions taken: CMHT or other NHS team notified ----

  readonly cmhtEditing = signal(false);
  readonly savingCmht = signal(false);
  readonly cmhtError = signal<string | null>(null);
  cmhtForm: { notified: boolean | null; team: string; contactName: string; calledAt: string; notes: string } = this.emptyCmhtForm();

  readonly showContacts = signal(false);
  readonly contactDrawerOpen = signal(false);

  // ---- 5. Resolution ----

  readonly resolveOpen = signal(false);
  readonly savingResolve = signal(false);
  readonly resolveError = signal<string | null>(null);
  resolveForm: { inpatientAdmission: boolean | null; externalServices: string } = { inpatientAdmission: null, externalServices: '' };
  /** "Resolved at" shown in the confirmation — the moment the dialog opened. */
  readonly resolveAt = signal(new Date());

  readonly resolveWithinWindow = computed(() => {
    const r = this.record();
    return r ? this.resolveAt().getTime() <= new Date(r.deadlineAt).getTime() : false;
  });

  constructor() {
    effect((onCleanup) => {
      const guestId = this.guestId();
      const preferred = this.episodeId();
      let cancelled = false;
      onCleanup(() => (cancelled = true));
      this.loadEpisodes(guestId, preferred, () => cancelled);
    });
    effect((onCleanup) => {
      // The countdown is live: tick every 30 seconds.
      const handle = setInterval(() => this.nowTick.set(Date.now()), 30_000);
      onCleanup(() => clearInterval(handle));
    });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    // Escape closes the innermost layer; the Add Contact drawer handles its own.
    if (this.contactDrawerOpen()) return;
    if (this.resolveOpen()) {
      this.closeResolve();
      return;
    }
    this.closeFromBackdrop();
  }

  close(): void {
    if (this.savingCmht() || this.savingResolve()) return;
    this.closed.emit();
  }

  /** A stray click (or Escape) never throws away a half-typed CMHT call or resolution. */
  closeFromBackdrop(): void {
    const f = this.cmhtForm;
    const typing = this.cmhtEditing() && (f.team.trim() || f.contactName.trim() || f.notes.trim());
    if (typing || this.resolveOpen() || this.contactDrawerOpen()) return;
    this.close();
  }

  selectEpisode(id: string): void {
    if (id === this.selectedId()) return;
    this.selectedId.set(id);
    this.loadRecord(id, () => this.selectedId() !== id);
  }

  /** Re-fetches the current urgent case after a change. */
  reload(): void {
    const id = this.selectedId();
    if (!id) return;
    this.loadRecord(id, () => this.selectedId() !== id);
  }

  /** "Export Record" — the API renders the text file and logs the disclosure. */
  exportRecord(): void {
    const r = this.record();
    if (!r || this.exporting()) return;
    this.exporting.set(true);
    this.exportError.set(null);
    this.api.exportEpisodeRecord(r.id).subscribe({
      next: (blob) => {
        this.exporting.set(false);
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `urgent-case-G-${r.guestNumber}-${r.episodeNumber}.txt`;
        anchor.click();
        URL.revokeObjectURL(url);
      },
      error: (err: unknown) => {
        this.exporting.set(false);
        this.exportError.set(documentErrorMessage(err, 'Could not export this record.'));
      },
    });
  }

  // ---- CMHT contact ----

  editCmht(): void {
    const r = this.record();
    if (!r || r.isResolved || !this.canAct) return;
    const c = r.cmhtContact;
    this.cmhtForm = c
      ? {
          notified: c.notified,
          team: c.team ?? '',
          contactName: c.contactName ?? '',
          calledAt: c.calledAt ? this.localDateTime(new Date(c.calledAt)) : this.localDateTime(new Date()),
          notes: c.notes ?? '',
        }
      : this.emptyCmhtForm();
    this.cmhtError.set(null);
    this.cmhtEditing.set(true);
  }

  cancelCmht(): void {
    this.cmhtEditing.set(false);
    this.cmhtError.set(null);
  }

  setNotified(value: boolean): void {
    // Choosing Yes usually follows the call itself, so default the call time to now — unless
    // this is a saved "Yes" being edited, whose time is the call's real time.
    if (value && this.cmhtForm.notified !== true && this.record()?.cmhtContact?.notified !== true) {
      this.cmhtForm.calledAt = this.localDateTime(new Date());
    }
    this.cmhtForm.notified = value;
    this.cmhtError.set(null);
  }

  saveCmht(): void {
    const r = this.record();
    const f = this.cmhtForm;
    if (!r || this.savingCmht()) return;
    if (f.notified === null) {
      this.cmhtError.set('Choose Yes or No.');
      return;
    }
    if (f.notified && (!f.contactName.trim() || !f.calledAt)) {
      this.cmhtError.set('Enter the name of the person called and the date and time of the call.');
      return;
    }
    const calledAt = f.notified ? new Date(f.calledAt) : null;
    if (calledAt && calledAt.getTime() > Date.now() + 5 * 60_000) {
      this.cmhtError.set('The call cannot be in the future.');
      return;
    }
    const request: RecordCmhtContactRequest = {
      notified: f.notified,
      team: f.notified ? f.team.trim() || null : null,
      contactName: f.notified ? f.contactName.trim() : null,
      calledAt: calledAt ? calledAt.toISOString() : null,
      notes: f.notified ? f.notes.trim() || null : null,
    };
    this.savingCmht.set(true);
    this.cmhtError.set(null);
    this.api.recordCmhtContact(r.id, request).subscribe({
      next: () => {
        this.savingCmht.set(false);
        this.cmhtEditing.set(false);
        this.reload();
        this.changed.emit({ guestId: r.guestId, resolved: false });
      },
      error: (err: unknown) => {
        this.savingCmht.set(false);
        this.cmhtError.set(this.errorMessage(err, 'Could not save the CMHT contact. Please try again.'));
      },
    });
  }

  // ---- Contacts / Add contact ----

  contactLabel(c: UrgentCaseContactDto): string {
    if (c.isCpnContact) return 'CPN contact';
    switch (c.category) {
      case null:
        return 'Contact';
      case 'Afa':
        return 'AFA';
      case 'DailyLog':
        return 'Daily log';
      default:
        return c.category;
    }
  }

  openAddContact(): void {
    if (this.canAddContact) this.contactDrawerOpen.set(true);
  }

  closeAddContact(): void {
    this.contactDrawerOpen.set(false);
  }

  /** `submitted` is false for a draft save — the drawer stays open. */
  contactSaved(submitted: boolean): void {
    if (!submitted) return;
    const r = this.record();
    this.contactDrawerOpen.set(false);
    this.showContacts.set(true);
    this.reload();
    if (r) this.changed.emit({ guestId: r.guestId, resolved: false });
  }

  // ---- Resolve ----

  openResolve(): void {
    const r = this.record();
    if (!r || r.isResolved || !this.canAct) return;
    this.resolveForm = { inpatientAdmission: null, externalServices: '' };
    this.resolveAt.set(new Date());
    this.resolveError.set(null);
    this.resolveOpen.set(true);
  }

  closeResolve(): void {
    if (this.savingResolve()) return;
    this.resolveOpen.set(false);
  }

  submitResolve(): void {
    const r = this.record();
    const f = this.resolveForm;
    if (!r || this.savingResolve()) return;
    if (f.inpatientAdmission === null) {
      this.resolveError.set('Say whether this urgent case resulted in an inpatient admission.');
      return;
    }
    this.savingResolve.set(true);
    this.resolveError.set(null);
    this.api.resolveEpisode(r.id, { inpatientAdmission: f.inpatientAdmission, externalServicesInvolved: f.externalServices.trim() || null }).subscribe({
      next: () => {
        this.savingResolve.set(false);
        this.resolveOpen.set(false);
        this.reload();
        this.changed.emit({ guestId: r.guestId, resolved: true });
      },
      error: (err: unknown) => {
        this.savingResolve.set(false);
        this.resolveError.set(this.errorMessage(err, 'Could not resolve this urgent case. Please try again.'));
        // Someone else may have resolved it meanwhile — show the record as it now stands.
        if (err instanceof HttpErrorResponse && err.status === 400) this.reload();
      },
    });
  }

  // ---- display helpers ----

  pathwayChip(pathway: GuestPathway | null): StatusChip {
    return pathway ? PATHWAY_CHIPS[pathway] : NO_PATHWAY;
  }

  private emptyCmhtForm(): { notified: boolean | null; team: string; contactName: string; calledAt: string; notes: string } {
    return { notified: null, team: '', contactName: '', calledAt: this.localDateTime(new Date()), notes: '' };
  }

  /** "2026-10-07T14:05" in local time, for <input type="datetime-local">. */
  private localDateTime(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  /** A 400's own message (validation or domain rule) is safe to show; anything else gets the fallback. */
  private errorMessage(err: unknown, fallback: string): string {
    if (err instanceof HttpErrorResponse && err.status === 400) {
      const body = err.error as { detail?: string; errors?: Record<string, string[]> } | null;
      const first = body?.errors ? Object.values(body.errors).flat()[0] : null;
      return first || body?.detail || fallback;
    }
    return fallback;
  }

  private hm(hours: number): string {
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    return `${h}h ${m}m`;
  }

  private loadEpisodes(guestId: string, preferred: string | null, isCancelled: () => boolean): void {
    this.loading.set(true);
    this.error.set(null);
    this.record.set(null);
    this.api.getEpisodes(guestId).subscribe({
      next: (episodes) => {
        if (isCancelled()) return;
        this.episodes.set(episodes);
        // The most recent open urgent case is the default view (record spec §6).
        const open = [...episodes].reverse().find((e) => !e.resolvedAt);
        const first = (preferred && episodes.find((e) => e.id === preferred)) || open || episodes[episodes.length - 1] || null;
        if (!first) {
          this.loading.set(false);
          this.error.set('No urgent case has been recorded for this guest yet.');
          return;
        }
        this.selectedId.set(first.id);
        this.loadRecord(first.id, () => isCancelled() || this.selectedId() !== first.id);
      },
      error: () => {
        if (isCancelled()) return;
        this.loading.set(false);
        this.error.set('Could not load the urgent cases for this guest.');
      },
    });
  }

  private loadRecord(id: string, isCancelled: () => boolean): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.getEpisodeRecord(id).subscribe({
      next: (record) => {
        if (isCancelled()) return;
        const switched = this.record()?.id !== record.id;
        this.record.set(record);
        this.episodes.set(record.episodes);
        this.loading.set(false);
        if (record.isResolved) {
          // Resolved here or elsewhere: nothing is editable any more.
          this.cmhtEditing.set(false);
          if (this.resolveOpen()) {
            this.resolveOpen.set(false);
            this.changed.emit({ guestId: record.guestId, resolved: true });
          }
        } else if (switched) {
          // A newly shown open case with nothing recorded starts on the Yes / No question. A plain
          // reload (e.g. after Add contact) leaves a half-filled CMHT form alone.
          this.cmhtEditing.set(false);
          if (!record.cmhtContact && this.canAct) this.editCmht();
        }
      },
      error: () => {
        if (isCancelled()) return;
        this.loading.set(false);
        this.error.set('Could not load this urgent case record.');
      },
    });
  }
}

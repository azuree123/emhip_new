import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GuestPathway, UrgentEpisodeRecordDto, UrgentEpisodeSummaryDto } from '../../core/api-models';
import { AuthService } from '../../core/auth.service';
import { Permissions } from '../../core/permissions';
import { UrgentCasesApiService } from '../../core/urgent-cases-api.service';
import { documentErrorMessage } from '../../core/documents-api.service';
import { StatusChip } from '../guest-workspace/guest-workspace.util';

const PATHWAY_CHIPS: Record<GuestPathway, StatusChip> = {
  MentalWellbeing: { label: 'Wellbeing support', bg: '#fff9e4', fg: '#9d852d' },
  ClinicalSupport: { label: 'Clinical', bg: '#ecf2ff', fg: '#345bb1' },
  CommunityRecovery: { label: 'Community recovery', bg: '#eafdee', fg: '#147129' },
};

const NO_PATHWAY: StatusChip = { label: 'Not allocated', bg: '#f0f0f0', fg: '#646464' };

/**
 * "Urgent Episode Record" — the full-screen modal behind the Urgent Cases list's "Open Crisis
 * Episode" CTA and the resolved rows' "View Episode" (design: Components.bundle.js Desktop57).
 *
 * One guest can have several episodes; the "Episode 1 / 2 / 3" tabs switch between them and
 * the newest (or the still-open one) opens first unless a specific `episodeId` is passed. The
 * record is read-only — for an open episode the banner offers "Escalate to CMHT" and "Mark
 * episode as resolved", which the host page handles with its existing modals and then calls
 * `reload()` so the record reflects the change. Every view and export is written to the
 * guest's access log by the API.
 */
@Component({
  selector: 'emhip-urgent-episode-record',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './urgent-episode-record.component.html',
  styleUrl: './urgent-episode-record.component.scss',
})
export class UrgentEpisodeRecordComponent {
  private readonly api = inject(UrgentCasesApiService);
  private readonly auth = inject(AuthService);

  readonly guestId = input.required<string>();
  /** The episode to open first; null picks the open episode, else the newest. */
  readonly episodeId = input<string | null>(null);

  readonly closed = output<void>();
  readonly escalate = output<{ guestId: string; guestName: string }>();
  readonly resolve = output<{ guestId: string; guestName: string }>();

  readonly episodes = signal<UrgentEpisodeSummaryDto[]>([]);
  readonly selectedId = signal<string | null>(null);
  readonly record = signal<UrgentEpisodeRecordDto | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly exporting = signal(false);
  readonly exportError = signal<string | null>(null);
  readonly nowTick = signal(Date.now());

  /** Escalating / resolving writes clinical data — same claim the drawer actions use. */
  readonly canAct = this.auth.hasPermission(Permissions.Guests.ClinicalEdit);

  /** Open episodes past their deadline get the red banner instead of the amber one. */
  readonly isOverdue = computed(() => {
    const r = this.record();
    if (!r || r.isResolved) return false;
    void this.nowTick();
    return new Date(r.deadlineAt).getTime() < Date.now();
  });

  private tickHandle?: ReturnType<typeof setInterval>;

  constructor() {
    effect((onCleanup) => {
      const guestId = this.guestId();
      const preferred = this.episodeId();
      let cancelled = false;
      onCleanup(() => (cancelled = true));
      this.loadEpisodes(guestId, preferred, () => cancelled);
    });
    effect((onCleanup) => {
      this.tickHandle = setInterval(() => this.nowTick.set(Date.now()), 30_000);
      onCleanup(() => clearInterval(this.tickHandle));
    });
  }

  close(): void {
    this.closed.emit();
  }

  selectEpisode(id: string): void {
    if (id === this.selectedId()) return;
    this.selectedId.set(id);
    this.loadRecord(id, () => this.selectedId() !== id);
  }

  /** Re-fetches the current episode — the host calls this after an escalation or resolution. */
  reload(): void {
    const id = this.selectedId();
    if (!id) return;
    this.loadRecord(id, () => this.selectedId() !== id);
    this.api.getEpisodes(this.guestId()).subscribe({ next: (episodes) => this.episodes.set(episodes), error: () => {} });
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
        anchor.download = `urgent-episode-G-${r.guestNumber}-episode-${r.episodeNumber}.txt`;
        anchor.click();
        URL.revokeObjectURL(url);
      },
      error: (err: unknown) => {
        this.exporting.set(false);
        this.exportError.set(documentErrorMessage(err, 'Could not export this record.'));
      },
    });
  }

  requestEscalate(): void {
    const r = this.record();
    if (r) this.escalate.emit({ guestId: r.guestId, guestName: r.guestName });
  }

  requestResolve(): void {
    const r = this.record();
    if (r) this.resolve.emit({ guestId: r.guestId, guestName: r.guestName });
  }

  // ---- display helpers ----

  pathwayChip(pathway: GuestPathway | null): StatusChip {
    return pathway ? PATHWAY_CHIPS[pathway] : NO_PATHWAY;
  }

  /** "1d 5h" / "3h 20m" — duration of the episode so far, or until it was resolved. */
  durationLabel(r: UrgentEpisodeRecordDto): string {
    const minutes = r.isResolved ? r.durationMinutes : Math.max(0, Math.round((Date.now() - new Date(r.raisedAt).getTime()) / 60_000));
    void this.nowTick();
    const days = Math.floor(minutes / 1440);
    const hours = Math.floor((minutes % 1440) / 60);
    const mins = minutes % 60;
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  }

  /** "Yes — 18h 30m before deadline" / "No — 5h 10m past deadline" / countdown while open. */
  withinWindowLabel(r: UrgentEpisodeRecordDto): string {
    const deadline = new Date(r.deadlineAt).getTime();
    if (!r.isResolved) {
      void this.nowTick();
      const diff = (deadline - Date.now()) / 3_600_000;
      return diff >= 0 ? `Open — ${this.hm(diff)} until deadline` : `Overdue — ${this.hm(-diff)} past deadline`;
    }
    const diff = (deadline - new Date(r.resolvedAt!).getTime()) / 3_600_000;
    return diff >= 0 ? `Yes — ${this.hm(diff)} before deadline` : `No — ${this.hm(-diff)} past deadline`;
  }

  /** The banner's one-line summary of what changed at resolution. */
  resolutionSummary(r: UrgentEpisodeRecordDto): string {
    const parts = ['Urgent flag closed'];
    if (r.pathwayAfterResolution && r.pathwayAfterResolution !== r.pathwayAtFlag) {
      parts.push(`Guest stepped ${r.pathwayAfterResolution === 'ClinicalSupport' ? 'up' : 'across'} to ${this.pathwayChip(r.pathwayAfterResolution).label} pathway`);
    } else if (r.pathwayAfterResolution) {
      parts.push(`Guest continues on ${this.pathwayChip(r.pathwayAfterResolution).label} pathway`);
    }
    if (r.cmhtTeam) parts.push(`${r.cmhtTeam} involved`);
    if (r.sessionFrequencyChange) parts.push('Session frequency changed');
    return parts.join(' · ');
  }

  private hm(hours: number): string {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
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
        const open = episodes.find((e) => !e.resolvedAt);
        const first = (preferred && episodes.find((e) => e.id === preferred)) ?? open ?? episodes[episodes.length - 1] ?? null;
        if (!first) {
          this.loading.set(false);
          this.error.set('No urgent episode has been recorded for this guest yet.');
          return;
        }
        this.selectedId.set(first.id);
        this.loadRecord(first.id, () => isCancelled() || this.selectedId() !== first.id);
      },
      error: () => {
        if (isCancelled()) return;
        this.loading.set(false);
        this.error.set('Could not load the urgent episodes for this guest.');
      },
    });
  }

  private loadRecord(id: string, isCancelled: () => boolean): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.getEpisodeRecord(id).subscribe({
      next: (record) => {
        if (isCancelled()) return;
        this.record.set(record);
        this.episodes.set(record.episodes);
        this.loading.set(false);
      },
      error: () => {
        if (isCancelled()) return;
        this.loading.set(false);
        this.error.set('Could not load this episode record.');
      },
    });
  }
}

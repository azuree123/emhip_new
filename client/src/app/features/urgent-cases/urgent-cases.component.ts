import { CommonModule, formatDate } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import {
  AddContactRequest,
  AddNoteRequest,
  ContactOutcome,
  ContactType,
  EscalateToCmhtRequest,
  GuestContactSummaryDto,
  GuestOverviewDto,
  ResolveUrgentCaseRequest,
  ScheduleFollowUpRequest,
  UrgentCaseDto,
  UrgentEpisodeDto,
} from '../../core/api-models';
import { GuestsApiService } from '../../core/guests-api.service';
import { UrgentCasesApiService } from '../../core/urgent-cases-api.service';
import { UrgentCasesHubService } from '../../core/urgent-cases-hub.service';
import { StaffPickerComponent } from '../../shared/staff-picker.component';

const WINDOW_HOURS = 72;

type RiskFlagKey = 'suicidalIdeation' | 'selfHarm' | 'riskToOthers' | 'severeDeterioration' | 'safeguardingConcern';

interface RiskFlagDef {
  key: RiskFlagKey;
  label: string;
  bg: string;
  fg: string;
}

// Colors reused verbatim from the "Urgent"/"Wellbeing support"/"Clinical" pills found in
// project/screens/Components.bundle.js (Desktop34/Desktop46), extended with the secondary
// orange/purple pairs from project/design-system/fig-tokens.css for the two flags that don't
// have a direct pill precedent in the source.
const RISK_FLAGS: RiskFlagDef[] = [
  { key: 'suicidalIdeation', label: 'Suicidal Ideation', bg: 'rgb(255,237,237)', fg: 'rgb(225,38,40)' },
  { key: 'selfHarm', label: 'Self Harm', bg: 'rgb(255,237,213)', fg: 'rgb(194,65,12)' },
  { key: 'riskToOthers', label: 'Risk to Others', bg: 'rgb(243,232,255)', fg: 'rgb(126,34,206)' },
  { key: 'severeDeterioration', label: 'Severe Deterioration', bg: 'rgb(255,249,228)', fg: 'rgb(157,133,45)' },
  { key: 'safeguardingConcern', label: 'Safeguarding Concern', bg: 'rgb(236,242,255)', fg: 'rgb(52,91,177)' },
];

/**
 * "Urgent cases" screen — ported from Desktop57/Desktop58/Desktop65 in
 * project/screens/Components.bundle.js (list + the Desktop58 "Urgent Case Details" drawer).
 * Initial load is a plain GET (UrgentCasesApiService.getActive()); after that the list stays
 * live via UrgentCasesHubService (SignalR) per the README's "near-real-time (polling or SignalR)"
 * requirement — the same hub connection the shell already opens for the sidebar badge count.
 * Risk-level / CMHW / overdue filters are applied client-side (the endpoint returns the full
 * active set). The drawer is backed by the guest overview (pinned notes + recent contacts) plus
 * the open urgent episode (CMHT escalation state). "Escalate to CMHT" (Desktop65 modal),
 * "Mark episode as resolved" and the resolved "Urgent Episode Record" history (Desktop57) are
 * backed by UrgentCasesApiService.escalateToCmht/resolve/getResolved; resolutions arrive live
 * over SignalR ("urgentCaseResolved") and drop the case from the list.
 */
@Component({
  selector: 'app-urgent-cases',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, StaffPickerComponent],
  templateUrl: './urgent-cases.component.html',
  styleUrl: './urgent-cases.component.scss',
})
export class UrgentCasesComponent implements OnInit, OnDestroy {
  private readonly api = inject(UrgentCasesApiService);
  private readonly hub = inject(UrgentCasesHubService);
  private readonly guestsApi = inject(GuestsApiService);
  private readonly auth = inject(AuthService);

  readonly riskFlags = RISK_FLAGS;
  readonly now = new Date();
  readonly userName = this.auth.current().displayName;

  readonly cases = signal<UrgentCaseDto[]>([]);
  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly nowTick = signal(Date.now());
  readonly connectionState = this.hub.connectionState;

  // Client-side filters (the API returns the complete active set).
  readonly riskFilter = signal<'' | RiskFlagKey>('');
  readonly cmhwFilter = signal('');
  readonly overdueOnly = signal(false);

  readonly overdueCount = computed(() => this.cases().filter((c) => this.hoursSince(c.escalatedAt) >= WINDOW_HOURS).length);
  readonly withinWindowCount = computed(() => this.cases().filter((c) => this.hoursSince(c.escalatedAt) < WINDOW_HOURS).length);
  readonly totalCount = computed(() => this.cases().length);

  readonly cmhwOptions = computed(() => {
    const names = new Set<string>();
    for (const c of this.cases()) if (c.assignedCmhwName) names.add(c.assignedCmhwName);
    return [...names].sort();
  });

  readonly visibleCases = computed(() => {
    const risk = this.riskFilter();
    const cmhw = this.cmhwFilter();
    const overdue = this.overdueOnly();
    return this.cases().filter((c) => {
      if (risk && !c[risk]) return false;
      if (cmhw && (c.assignedCmhwName ?? '') !== cmhw) return false;
      if (overdue && this.hoursSince(c.escalatedAt) < WINDOW_HOURS) return false;
      return true;
    });
  });

  readonly modalOpen = signal(false);
  readonly modalGuestId = signal('');
  readonly modalGuestName = signal('');
  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);
  readonly exporting = signal(false);

  scheduleForm = { dueDate: '', assigneeStaffId: this.auth.current().staffId, notes: '' };

  // ---- Resolved episodes (Desktop57) ----
  readonly resolvedEpisodes = signal<UrgentEpisodeDto[]>([]);
  readonly resolvedLoading = signal(false);
  readonly resolvedError = signal<string | null>(null);
  readonly resolvedThisMonthCount = computed(() => {
    const today = new Date();
    return this.resolvedEpisodes().filter((ep) => {
      if (!ep.resolvedAt) return false;
      const d = new Date(ep.resolvedAt);
      return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth();
    }).length;
  });

  /** The "Urgent Episode Record" panel (Desktop57) — opened from a resolved row's "View Episode". */
  readonly episodeRecord = signal<UrgentEpisodeDto | null>(null);

  // ---- "Urgent Case Details" drawer (Desktop58) ----
  readonly detailsGuestId = signal<string | null>(null);
  readonly detailsCase = computed(() => this.cases().find((c) => c.guestId === this.detailsGuestId()) ?? null);
  readonly overview = signal<GuestOverviewDto | null>(null);
  /** The guest's open urgent episode — CMHT escalation state shown in the drawer. */
  readonly openEpisode = signal<UrgentEpisodeDto | null>(null);
  readonly detailsLoading = signal(false);
  readonly detailsError = signal<string | null>(null);

  /** Contacts recorded since the flag was raised — the drawer's "Follow-ups logged" + timeline entries. */
  readonly episodeContacts = computed<GuestContactSummaryDto[]>(() => {
    const dc = this.detailsCase();
    const ov = this.overview();
    if (!dc || !ov) return [];
    const flagAt = new Date(dc.escalatedAt).getTime();
    return ov.recentContacts
      .filter((ct) => new Date(ct.occurredAt).getTime() >= flagAt)
      .sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());
  });

  // Inline "Add Crisis Note" form inside the drawer (saved as a pinned note on the guest).
  readonly noteFormOpen = signal(false);
  readonly savingNote = signal(false);
  readonly noteError = signal<string | null>(null);
  noteBody = '';

  // "Log urgent follow-up note" modal — records a contact via GuestsApiService.addContact.
  readonly contactTypes: ContactType[] = ['PhoneCall', 'InPerson', 'VideoCall', 'TextMessage', 'Email'];
  readonly contactOutcomes: ContactOutcome[] = ['Successful', 'NoAnswer', 'LeftMessage', 'Declined', 'Rescheduled'];
  readonly contactModalOpen = signal(false);
  readonly savingContact = signal(false);
  readonly contactError = signal<string | null>(null);
  contactForm = { type: 'PhoneCall' as ContactType, outcome: 'Successful' as ContactOutcome, occurredAt: this.nowLocal(), notes: '' };

  // "Escalate to CMHT" modal (Desktop65). Reason options are the design's fixed list; the
  // request carries them as plain text.
  readonly escalationReasons = [
    '72 hour window expired - no contact',
    'Risk level has increased',
    'Guest unreachable - welfare concern',
    'Clinical need beyond hub capacity',
    'Safeguarding concern',
  ];
  readonly urgencyLevels = ['Emergency', 'Urgent', 'Routine'];
  readonly escalateModalOpen = signal(false);
  readonly savingEscalation = signal(false);
  readonly escalateError = signal<string | null>(null);
  escalateForm = { cmhtTeam: '', reason: '', urgency: 'Urgent', notes: '' };

  // "Mark episode as resolved" confirmation (optional resolution note).
  readonly resolveModalOpen = signal(false);
  readonly savingResolve = signal(false);
  readonly resolveError = signal<string | null>(null);
  resolveNote = '';

  private tickHandle?: ReturnType<typeof setInterval>;

  constructor() {
    // Live escalations pushed over SignalR: prepend new guests, update in place if we already
    // have a row for that guest (e.g. its risk flags changed).
    effect(() => {
      const escalated = this.hub.latestEscalation();
      if (!escalated) return;
      this.cases.update((cur) => {
        const others = cur.filter((c) => c.guestId !== escalated.guestId);
        return [escalated, ...others];
      });
    });

    // Live resolutions ("urgentCaseResolved"): drop the case from the active list (the open
    // drawer disappears with it, since detailsCase() is computed over cases()) and refresh
    // the resolved-episodes history.
    effect(() => {
      const resolvedGuestId = this.hub.latestResolution();
      if (!resolvedGuestId) return;
      this.cases.update((cur) => cur.filter((c) => c.guestId !== resolvedGuestId));
      this.loadResolved();
    });
  }

  ngOnInit(): void {
    this.loading.set(true);
    this.api.getActive().subscribe({
      next: (cases) => {
        this.cases.set(cases);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set('Could not load urgent cases. The API may be unavailable.');
        this.loading.set(false);
      },
    });
    this.loadResolved();
    this.hub.connect();
    // Recompute the overdue/within-window buckets periodically since they're derived from
    // elapsed time, not just from data change.
    this.tickHandle = setInterval(() => this.nowTick.set(Date.now()), 30_000);
  }

  private loadResolved(): void {
    this.resolvedLoading.set(true);
    this.resolvedError.set(null);
    this.api.getResolved().subscribe({
      next: (episodes) => {
        this.resolvedEpisodes.set(episodes);
        this.resolvedLoading.set(false);
      },
      error: () => {
        this.resolvedLoading.set(false);
        this.resolvedError.set('Could not load resolved episodes.');
      },
    });
  }

  ngOnDestroy(): void {
    if (this.tickHandle) clearInterval(this.tickHandle);
  }

  hoursSince(iso: string): number {
    void this.nowTick();
    return (Date.now() - new Date(iso).getTime()) / 3_600_000;
  }

  isOverdue(c: UrgentCaseDto): boolean {
    return this.hoursSince(c.escalatedAt) >= WINDOW_HOURS;
  }

  windowLabel(c: UrgentCaseDto): { text: string; overdue: boolean } {
    const remaining = WINDOW_HOURS - this.hoursSince(c.escalatedAt);
    if (remaining <= 0) return { text: `${Math.round(-remaining)}h overdue`, overdue: true };
    return { text: `${Math.round(remaining)}h left`, overdue: false };
  }

  /** Second line under the countdown: "72h window closed" or "Follow-up by 22:00 today". */
  deadlineLabel(c: UrgentCaseDto): string {
    if (this.isOverdue(c)) return '72h window closed';
    const deadline = new Date(new Date(c.escalatedAt).getTime() + WINDOW_HOURS * 3_600_000);
    const time = formatDate(deadline, 'HH:mm', 'en-US');
    const today = new Date();
    const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    if (this.sameDay(deadline, today)) return `Follow-up by ${time} today`;
    if (this.sameDay(deadline, tomorrow)) return `Follow-up by ${time} tomorrow`;
    return `Follow-up by ${time}, ${formatDate(deadline, 'd MMM', 'en-US')}`;
  }

  private sameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  /** Real sequential guest reference — api-models: render as "G-{guestNumber}". */
  refLabel(c: UrgentCaseDto): string {
    return `G-${c.guestNumber}`;
  }

  epRef(ep: UrgentEpisodeDto): string {
    return `G-${ep.guestNumber}`;
  }

  activeFlags(c: UrgentCaseDto): RiskFlagDef[] {
    return this.riskFlags.filter((f) => c[f.key]);
  }

  scrollToOverdue(): void {
    document.querySelector('.row--overdue')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  exportCsv(): void {
    const rows = this.visibleCases();
    if (!rows.length || this.exporting()) return;
    this.exporting.set(true);
    try {
      const header = ['Ref', 'Guest', 'Risk flags', 'Assigned CMHW', 'Flag raised', 'Window status'];
      const lines = rows.map((c) => [
        this.refLabel(c),
        c.guestName,
        this.activeFlags(c).map((f) => f.label).join('; '),
        c.assignedCmhwName ?? 'Unassigned',
        c.escalatedAt,
        this.windowLabel(c).text,
      ]);
      const csv = [header, ...lines].map((cols) => cols.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'urgent-cases.csv';
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      this.exporting.set(false);
    }
  }

  openLogFollowUp(c: UrgentCaseDto): void {
    this.modalGuestId.set(c.guestId);
    this.modalGuestName.set(c.guestName);
    this.scheduleForm = { dueDate: '', assigneeStaffId: this.auth.current().staffId, notes: '' };
    this.saveError.set(null);
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
  }

  submitModal(): void {
    if (!this.scheduleForm.dueDate || !this.scheduleForm.assigneeStaffId) {
      this.saveError.set('Due date and assignee are required.');
      return;
    }
    this.saving.set(true);
    this.saveError.set(null);
    const req: ScheduleFollowUpRequest = {
      dueDate: new Date(this.scheduleForm.dueDate).toISOString(),
      assigneeStaffId: this.scheduleForm.assigneeStaffId,
      notes: this.scheduleForm.notes || null,
    };
    this.guestsApi.scheduleFollowUp(this.modalGuestId(), req).subscribe({
      next: () => {
        this.saving.set(false);
        this.modalOpen.set(false);
      },
      error: () => {
        this.saving.set(false);
        this.saveError.set('Could not schedule the follow-up.');
      },
    });
  }

  // ---- "Urgent Case Details" drawer (Desktop58) ----

  /** Card click opens the drawer; clicks on the row's own links/buttons are ignored. */
  onRowClick(c: UrgentCaseDto, event: Event): void {
    if ((event.target as HTMLElement).closest('a, button')) return;
    this.openDetails(c);
  }

  openDetails(c: UrgentCaseDto): void {
    this.detailsGuestId.set(c.guestId);
    this.overview.set(null);
    this.openEpisode.set(null);
    this.noteFormOpen.set(false);
    this.noteError.set(null);
    this.noteBody = '';
    this.fetchDetails(c.guestId);
    this.fetchOpenEpisode(c.guestId);
  }

  closeDetails(): void {
    this.detailsGuestId.set(null);
  }

  private fetchDetails(guestId: string): void {
    this.detailsLoading.set(true);
    this.detailsError.set(null);
    this.guestsApi.getOverview(guestId).subscribe({
      next: (ov) => {
        if (this.detailsGuestId() === guestId) this.overview.set(ov);
        this.detailsLoading.set(false);
      },
      error: () => {
        this.detailsLoading.set(false);
        this.detailsError.set('Could not load the guest overview for this case.');
      },
    });
  }

  private fetchOpenEpisode(guestId: string): void {
    this.api.getOpenEpisode(guestId).subscribe({
      next: (ep) => {
        if (this.detailsGuestId() === guestId) this.openEpisode.set(ep);
      },
      // 404 means no episode record exists for this guest — the drawer simply shows "NO".
      error: () => {},
    });
  }

  /** "Overdue — 18h 9m past deadline" / "53h 51m until deadline". */
  countdownText(c: UrgentCaseDto): string {
    const past = this.hoursSince(c.escalatedAt) - WINDOW_HOURS;
    return past >= 0
      ? `Overdue — ${UrgentCasesComponent.formatHm(past)} past deadline`
      : `${UrgentCasesComponent.formatHm(-past)} until deadline`;
  }

  countdownPct(c: UrgentCaseDto): number {
    return Math.min(100, (this.hoursSince(c.escalatedAt) / WINDOW_HOURS) * 100);
  }

  /** "Deadline: 13 May 2025 · 10:45 AM". */
  deadlineFull(c: UrgentCaseDto): string {
    const deadline = new Date(new Date(c.escalatedAt).getTime() + WINDOW_HOURS * 3_600_000);
    return formatDate(deadline, 'd MMM y · h:mm a', 'en-US');
  }

  private static formatHm(hours: number): string {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  }

  /** "PhoneCall" -> "Phone Call", "NoAnswer" -> "No Answer" — for contact type/outcome enum names. */
  pretty(value: string): string {
    return value.replace(/([a-z])([A-Z])/g, '$1 $2');
  }

  // ---- Add Crisis Note (pinned guest note) ----

  cancelCrisisNote(): void {
    this.noteFormOpen.set(false);
    this.noteError.set(null);
    this.noteBody = '';
  }

  submitCrisisNote(): void {
    const guestId = this.detailsGuestId();
    const body = this.noteBody.trim();
    if (!guestId || !body) {
      this.noteError.set('Note text is required.');
      return;
    }
    this.savingNote.set(true);
    this.noteError.set(null);
    const req: AddNoteRequest = { body, color: 'Orange', isPinned: true };
    this.guestsApi.addNote(guestId, req).subscribe({
      next: () => {
        this.savingNote.set(false);
        this.cancelCrisisNote();
        this.fetchDetails(guestId);
      },
      error: () => {
        this.savingNote.set(false);
        this.noteError.set('Could not save the crisis note.');
      },
    });
  }

  // ---- "Log urgent follow-up note" (records a contact) ----

  openLogContact(): void {
    this.contactForm = { type: 'PhoneCall', outcome: 'Successful', occurredAt: this.nowLocal(), notes: '' };
    this.contactError.set(null);
    this.contactModalOpen.set(true);
  }

  closeContactModal(): void {
    this.contactModalOpen.set(false);
  }

  submitContact(): void {
    const guestId = this.detailsGuestId();
    if (!guestId) return;
    if (!this.contactForm.occurredAt) {
      this.contactError.set('Date/time of contact is required.');
      return;
    }
    this.savingContact.set(true);
    this.contactError.set(null);
    const req: AddContactRequest = {
      type: this.contactForm.type,
      outcome: this.contactForm.outcome,
      occurredAt: new Date(this.contactForm.occurredAt).toISOString(),
      notes: this.contactForm.notes || null,
    };
    this.guestsApi.addContact(guestId, req).subscribe({
      next: () => {
        this.savingContact.set(false);
        this.contactModalOpen.set(false);
        this.fetchDetails(guestId);
      },
      error: () => {
        this.savingContact.set(false);
        this.contactError.set('Could not log the follow-up note.');
      },
    });
  }

  // ---- "Escalate to CMHT" (Desktop65 modal) ----

  openEscalate(): void {
    this.escalateForm = { cmhtTeam: '', reason: '', urgency: 'Urgent', notes: '' };
    this.escalateError.set(null);
    this.escalateModalOpen.set(true);
  }

  closeEscalate(): void {
    this.escalateModalOpen.set(false);
  }

  submitEscalation(): void {
    const guestId = this.detailsGuestId();
    if (!guestId) return;
    const f = this.escalateForm;
    if (!f.cmhtTeam.trim() || !f.reason || !f.urgency || !f.notes.trim()) {
      this.escalateError.set('CMHT team, reason, urgency level and escalation notes are required.');
      return;
    }
    this.savingEscalation.set(true);
    this.escalateError.set(null);
    const req: EscalateToCmhtRequest = {
      cmhtTeam: f.cmhtTeam.trim(),
      reason: f.reason,
      urgency: f.urgency,
      notes: f.notes.trim(),
    };
    this.api.escalateToCmht(guestId, req).subscribe({
      next: () => {
        this.savingEscalation.set(false);
        this.escalateModalOpen.set(false);
        this.fetchOpenEpisode(guestId);
      },
      error: () => {
        this.savingEscalation.set(false);
        this.escalateError.set('Could not send the escalation.');
      },
    });
  }

  // ---- "Mark episode as resolved" ----

  openResolve(): void {
    this.resolveNote = '';
    this.resolveError.set(null);
    this.resolveModalOpen.set(true);
  }

  closeResolve(): void {
    this.resolveModalOpen.set(false);
  }

  submitResolve(): void {
    const guestId = this.detailsGuestId();
    if (!guestId) return;
    this.savingResolve.set(true);
    this.resolveError.set(null);
    const req: ResolveUrgentCaseRequest = { resolutionNote: this.resolveNote.trim() || null };
    this.api.resolve(guestId, req).subscribe({
      next: () => {
        this.savingResolve.set(false);
        this.resolveModalOpen.set(false);
        this.closeDetails();
        // Optimistic removal — the SignalR "urgentCaseResolved" push confirms it for other clients.
        this.cases.update((cur) => cur.filter((c) => c.guestId !== guestId));
        this.loadResolved();
      },
      error: () => {
        this.savingResolve.set(false);
        this.resolveError.set('Could not resolve this episode.');
      },
    });
  }

  // ---- "Urgent Episode Record" (Desktop57) ----

  openEpisodeRecord(ep: UrgentEpisodeDto): void {
    this.episodeRecord.set(ep);
  }

  closeEpisodeRecord(): void {
    this.episodeRecord.set(null);
  }

  /** "07 May 2025 · 11:00 AM" — the episode's 72-hour deadline. */
  episodeDeadline(ep: UrgentEpisodeDto): string {
    return formatDate(new Date(ep.raisedAt).getTime() + WINDOW_HOURS * 3_600_000, 'd MMM y · h:mm a', 'en-US');
  }

  resolvedWithin72h(ep: UrgentEpisodeDto): boolean {
    if (!ep.resolvedAt) return false;
    return new Date(ep.resolvedAt).getTime() <= new Date(ep.raisedAt).getTime() + WINDOW_HOURS * 3_600_000;
  }

  /** "Yes — 18h 30m before deadline" / "No — 5h 10m past deadline". */
  resolvedWithinLabel(ep: UrgentEpisodeDto): string {
    if (!ep.resolvedAt) return '—';
    const deadline = new Date(ep.raisedAt).getTime() + WINDOW_HOURS * 3_600_000;
    const diffH = (deadline - new Date(ep.resolvedAt).getTime()) / 3_600_000;
    return diffH >= 0
      ? `Yes — ${UrgentCasesComponent.formatHm(diffH)} before deadline`
      : `No — ${UrgentCasesComponent.formatHm(-diffH)} past deadline`;
  }

  private nowLocal(): string {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  }
}

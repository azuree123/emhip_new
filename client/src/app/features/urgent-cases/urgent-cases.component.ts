import { CommonModule, formatDate } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { UrgentCaseDto, UrgentEpisodeDto } from '../../core/api-models';
import { UrgentCasesApiService } from '../../core/urgent-cases-api.service';
import { UrgentCasesHubService } from '../../core/urgent-cases-hub.service';
import { UrgentCaseRecordChange, UrgentEpisodeRecordComponent } from './urgent-episode-record.component';

const WINDOW_HOURS = 72;

type RiskFlagKey = 'suicidalIdeation' | 'selfHarm' | 'riskToOthers' | 'severeDeterioration' | 'safeguardingConcern' | 'otherRisk';

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
  { key: 'otherRisk', label: 'Other', bg: 'rgb(240,240,240)', fg: 'rgb(70,70,70)' },
];

/**
 * "Urgent cases" dashboard — ported from Desktop57/Desktop65 in project/screens/Components.bundle.js.
 * Initial load is a plain GET (UrgentCasesApiService.getActive()); after that the list stays
 * live via UrgentCasesHubService (SignalR) — the same hub connection the shell already opens for
 * the sidebar badge count. Risk-level / CMHW / overdue filters are applied client-side (the
 * endpoint returns the full active set).
 *
 * Every case row carries two actions: "Open Guest" (the workspace) and "View Urgent Case Record".
 * Clicking anywhere else on a row opens the same Urgent Case Record — the compact details popup
 * that used to open here was removed at the customer's request (Oct 2026), so there is one place
 * to act on a case. The record does its own writes (CMHT contact, Add contact, Mark as resolved)
 * and tells this page through `changed`; resolutions also arrive live over SignalR
 * ("urgentCaseResolved") and drop the case from the list.
 */
@Component({
  selector: 'app-urgent-cases',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, UrgentEpisodeRecordComponent],
  templateUrl: './urgent-cases.component.html',
  styleUrl: './urgent-cases.component.scss',
})
export class UrgentCasesComponent implements OnInit, OnDestroy {
  private readonly api = inject(UrgentCasesApiService);
  private readonly hub = inject(UrgentCasesHubService);

  readonly riskFlags = RISK_FLAGS;
  readonly now = new Date();

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

  readonly exporting = signal(false);

  // ---- Resolved urgent cases ----
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

  /**
   * The Urgent Case Record modal: the guest whose urgent cases to show, and which one to open
   * first (null = the open one, else the newest).
   */
  readonly recordTarget = signal<{ guestId: string; episodeId: string | null } | null>(null);

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

    // Live resolutions ("urgentCaseResolved"): drop the case from the active list and refresh
    // the resolved history.
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
        this.resolvedError.set('Could not load resolved urgent cases.');
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

  /** Second line under the countdown: "72h window closed" or "Contact by 22:00 today". */
  deadlineLabel(c: UrgentCaseDto): string {
    if (this.isOverdue(c)) return '72h window closed';
    const deadline = new Date(new Date(c.escalatedAt).getTime() + WINDOW_HOURS * 3_600_000);
    const time = formatDate(deadline, 'HH:mm', 'en-US');
    const today = new Date();
    const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    if (this.sameDay(deadline, today)) return `Contact by ${time} today`;
    if (this.sameDay(deadline, tomorrow)) return `Contact by ${time} tomorrow`;
    return `Contact by ${time}, ${formatDate(deadline, 'd MMM', 'en-US')}`;
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

  /** "Other" carries the worker's own description of the risk. */
  flagLabel(c: UrgentCaseDto, flag: RiskFlagDef): string {
    return flag.key === 'otherRisk' && c.otherRiskDetails ? `Other: ${c.otherRiskDetails}` : flag.label;
  }

  scrollToOverdue(): void {
    document.querySelector('.row--overdue')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  exportCsv(): void {
    const rows = this.visibleCases();
    if (!rows.length || this.exporting()) return;
    this.exporting.set(true);
    try {
      const header = ['Ref', 'Guest', 'Risk identified', 'Assigned CMHW', 'Flag raised', 'Window status'];
      const lines = rows.map((c) => [
        this.refLabel(c),
        c.guestName,
        this.activeFlags(c).map((f) => this.flagLabel(c, f)).join('; '),
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

  // ---- Urgent Case Record ----

  /** Clicking a case opens its Urgent Case Record; the row's own links/buttons keep their action. */
  onRowClick(c: UrgentCaseDto, event: Event): void {
    if ((event.target as HTMLElement).closest('a, button')) return;
    this.openRecord(c);
  }

  /** "View Urgent Case Record": the guest's open urgent case, with any earlier ones as tabs. */
  openRecord(c: UrgentCaseDto, event?: Event): void {
    event?.stopPropagation();
    this.recordTarget.set({ guestId: c.guestId, episodeId: null });
  }

  /** A resolved row opens that urgent case's record; the row's own links/buttons keep their action. */
  onResolvedRowClick(ep: UrgentEpisodeDto, event: Event): void {
    if ((event.target as HTMLElement).closest('a, button')) return;
    this.openEpisodeRecord(ep);
  }

  openEpisodeRecord(ep: UrgentEpisodeDto, event?: Event): void {
    event?.stopPropagation();
    this.recordTarget.set({ guestId: ep.guestId, episodeId: ep.id });
  }

  closeRecord(): void {
    this.recordTarget.set(null);
  }

  /** The record saved something: a resolution leaves the active list (SignalR confirms it for other clients). */
  recordChanged(change: UrgentCaseRecordChange): void {
    if (!change.resolved) return;
    this.cases.update((cur) => cur.filter((c) => c.guestId !== change.guestId));
    this.loadResolved();
  }

  resolvedWithin72h(ep: UrgentEpisodeDto): boolean {
    if (!ep.resolvedAt) return false;
    return new Date(ep.resolvedAt).getTime() <= new Date(ep.raisedAt).getTime() + WINDOW_HOURS * 3_600_000;
  }
}

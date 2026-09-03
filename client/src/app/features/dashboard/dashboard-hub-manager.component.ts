import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { DashboardsApiService } from '../../core/dashboards-api.service';
import { FollowUpsApiService } from '../../core/follow-ups-api.service';
import { Permissions } from '../../core/permissions';
import {
  CaseloadReportRowDto,
  CpnInvolvedGuestDto,
  DataQualityIssueTileDto,
  DemographicSliceDto,
  FollowUpQueueItemDto,
  HubManagerDashboardDto,
  MonthlyStatDto,
  PathwayDistributionDto,
} from '../../core/api-models';
import { GuestSeenCardComponent } from './guest-seen-card.component';
import { KpiGuestsPanelComponent, KpiPanelVariant } from './kpi-guests-panel.component';

/**
 * Bar colors for "Pathway distribution" — the design's red / yellow / maroon, in the order the
 * API returns the three clinical pathways (Mental Wellbeing, Clinical Support, Community
 * Recovery). Row labels are whatever the API sends; nothing here assumes a category name or a
 * particular number of rows.
 */
const PATHWAY_COLORS = ['#eb3c2c', '#c9a723', '#941c3c'];

interface PathwayRow extends PathwayDistributionDto {
  color: string;
  /** 0 = heart, 1 = first-aid box, 2 = community grid (icons cycle if more rows ever arrive). */
  icon: number;
}

/** One breakdown panel inside the "Guest demographics" card. */
interface DemographicGroup {
  key: string;
  title: string;
  color: string;
  slices: DemographicSliceDto[];
  /** Biggest slice, for the panel footnote — null when the breakdown is empty. */
  largest: DemographicSliceDto | null;
  /** Country of origin runs the full width under the other three, as in the design. */
  wide: boolean;
}

/**
 * Design copy for each "Data quality issues" row, keyed by the API's stable issue key. The rows
 * themselves — and their labels and counts — always come from the API; an unknown key simply
 * renders without a hint rather than being dropped.
 */
const DATA_QUALITY_HINTS: Record<string, string> = {
  missingPathway: 'Guest is registered but has no pathway — cannot become Active until resolved',
  missingInitialConversation: 'Status is New — DIALOG baseline and pathway cannot be assigned until completed',
  missingDialogBaseline: 'Initial conversation completed but DIALOG not recorded — outcome comparison not possible',
  autoOnHold: 'No activity recorded in past 3 months — status changed automatically by the system',
};

interface DataQualityRow extends DataQualityIssueTileDto {
  hint: string | null;
}

/** One "Caseload per CMHW" row — the report row plus the avatar initials and load bar width. */
interface CaseloadRow extends CaseloadReportRowDto {
  initials: string;
  /** Assigned caseload relative to the busiest worker (the Caseload report's "Load" bar). */
  loadPct: number;
}

/**
 * Hub Manager dashboard — reworked to the new `GuestDataSheet2` design (node 1034:7909,
 * project/screens/Components.bundle.js lines 2748-8987). Sidebar/header come from the shared
 * shell; this component is the content area only.
 *
 * Sections: expandable KPI row (drill-down panels per Frame 23/38/39, plus an urgent panel
 * that reuses the same language — the design ships no frame for it), Pathway distribution,
 * Clinical complexity indicators (spec §5.1), Guest Seen, Guest demographics, Outstanding team
 * actions (live follow-up queue), Staff activity (recent activity feed) and Data quality
 * issues. "CPN involvement" sits directly above "Caseload per CMHW": the first summarises the
 * Community Psychiatric Nurse's share of the caseload (cpnInvolvement on the DTO), the second
 * lists every worker's assigned cases (caseloadPerCmhw — the same rows as the Caseload
 * report) so a manager can see who is carrying what without leaving the dashboard.
 */
@Component({
  selector: 'app-dashboard-hub-manager',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, KpiGuestsPanelComponent, GuestSeenCardComponent],
  templateUrl: './dashboard-hub-manager.component.html',
  styleUrl: './dashboard-hub-manager.component.scss',
})
export class DashboardHubManagerComponent {
  private readonly dashboardsApi = inject(DashboardsApiService);
  private readonly followUpsApi = inject(FollowUpsApiService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly data = signal<HubManagerDashboardDto | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  /** Which KPI drill-down panel is open (active / new / on hold / urgent), if any. */
  protected readonly expanded = signal<KpiPanelVariant | null>(null);

  /** Hub-wide open follow-ups — feeds "Outstanding team actions" and the Urgent KPI pill. */
  protected readonly queue = signal<FollowUpQueueItemDto[]>([]);
  protected readonly queueState = signal<'loading' | 'ready' | 'unavailable'>('loading');

  protected readonly canViewFollowUps = this.auth.hasPermission(Permissions.FollowUps.View);
  protected readonly canViewGuests = this.auth.hasPermission(Permissions.Guests.View);
  protected readonly canViewReports = this.auth.hasPermission(Permissions.Reports.View);

  private readonly todayIso = (() => {
    const now = new Date();
    const m = `${now.getMonth() + 1}`.padStart(2, '0');
    const d = `${now.getDate()}`.padStart(2, '0');
    return `${now.getFullYear()}-${m}-${d}`;
  })();

  protected readonly overdueCount = computed(() => this.queue().filter((i) => i.isOverdue).length);
  protected readonly teamActions = computed(() => this.queue().slice(0, 5));

  /** Most recent entry in monthlyStats — Guest Seen card and the KPI trend pills. */
  protected readonly latestMonth = computed<MonthlyStatDto | null>(() => {
    const stats = this.data()?.monthlyStats ?? [];
    if (stats.length === 0) return null;
    return [...stats].sort((a, b) => b.year - a.year || b.month - a.month)[0];
  });

  /** Net caseload movement this month (new − closed) — the "+8 vs last month" pill. */
  protected readonly activeTrend = computed(() => {
    const latest = this.latestMonth();
    if (!latest) return null;
    return latest.newGuests - latest.closedGuests;
  });

  /** Guests closed (moved to on hold) this month — the On hold card's trend pill. */
  protected readonly closedThisMonth = computed(() => this.latestMonth()?.closedGuests ?? null);

  /**
   * Pathway distribution rows, in the order the API sends them — the three clinical pathways
   * (Mental Wellbeing, Clinical Support, Community Recovery). Server order is preserved so the
   * icon and bar color stay attached to the same pathway between refreshes.
   */
  protected readonly pathwayRows = computed<PathwayRow[]>(() => {
    const dto = this.data();
    if (!dto) return [];
    return dto.pathwayDistribution.map((p, index) => ({
      ...p,
      color: PATHWAY_COLORS[index % PATHWAY_COLORS.length],
      icon: index % 3,
    }));
  });

  /** Total guests counted by the pathway bars — the denominator behind the percentages. */
  protected readonly pathwayTotal = computed(() =>
    this.pathwayRows().reduce((sum, row) => sum + row.count, 0),
  );

  /**
   * The four "Guest demographics" breakdowns, in the design's order: Ethnicity, Age groups and
   * Gender share the top row, Country of origin runs full width beneath them. Bar colors are the
   * design's — the red / yellow / maroon triad on the top row and its grey for country. A
   * breakdown stays in the list even when it is empty (country of origin is not captured yet);
   * the panel then shows a short empty line instead of a chart.
   */
  protected readonly demographicGroups = computed<DemographicGroup[]>(() => {
    const demographics = this.data()?.demographics;
    if (!demographics) return [];
    const build = (
      key: string,
      title: string,
      color: string,
      slices: DemographicSliceDto[] | undefined,
      wide = false,
    ): DemographicGroup => {
      const rows = slices ?? [];
      const largest = rows.reduce<DemographicSliceDto | null>(
        (best, slice) => (best === null || slice.count > best.count ? slice : best),
        null,
      );
      return { key, title, color, slices: rows, largest: largest && largest.count > 0 ? largest : null, wide };
    };
    return [
      build('ethnicity', 'Ethnicity', '#eb3c2c', demographics.ethnicity),
      build('ageGroups', 'Age groups', '#c9a723', demographics.ageGroups),
      build('gender', 'Gender', '#941c3c', demographics.gender),
      build('countryOfOrigin', 'Country of origin', '#8f8f8f', demographics.countryOfOrigin, true),
    ];
  });

  /** "CPN involvement" card — null until the dashboard has loaded. */
  protected readonly cpn = computed(() => this.data()?.cpnInvolvement ?? null);

  /** "Caseload per CMHW" rows, busiest worker first, with the load bar scaled to that worker. */
  protected readonly caseloadRows = computed<CaseloadRow[]>(() => {
    const rows = [...(this.data()?.caseloadPerCmhw ?? [])].sort((a, b) => b.assignedGuests - a.assignedGuests);
    const max = rows[0]?.assignedGuests ?? 0;
    return rows.map((r) => ({
      ...r,
      initials: this.initials(r.displayName),
      loadPct: max > 0 ? Math.round((r.assignedGuests / max) * 100) : 0,
    }));
  });

  /** Footer totals under the caseload table. */
  protected readonly caseloadTotals = computed(() => {
    const rows = this.caseloadRows();
    return {
      workers: rows.length,
      assigned: rows.reduce((sum, r) => sum + r.assignedGuests, 0),
      urgent: rows.reduce((sum, r) => sum + r.urgentGuests, 0),
      overdue: rows.reduce((sum, r) => sum + r.overdueFollowUps, 0),
    };
  });

  /** "Data quality issues" rows — labels and counts straight from the API, hints by issue key. */
  protected readonly dataQualityRows = computed<DataQualityRow[]>(() =>
    (this.data()?.dataQuality ?? []).map((issue) => ({
      ...issue,
      hint: DATA_QUALITY_HINTS[issue.key] ?? null,
    })),
  );

  constructor() {
    this.dashboardsApi
      .getHubManagerDashboard()
      .pipe(
        catchError(() => {
          this.error.set('Unable to load the service overview right now.');
          return of(null);
        }),
      )
      .subscribe((result) => {
        this.loading.set(false);
        this.data.set(result);
      });

    if (this.canViewFollowUps) {
      this.followUpsApi
        .getQueue({ pageSize: 100 })
        .pipe(catchError(() => of(null)))
        .subscribe((page) => {
          if (!page) {
            this.queueState.set('unavailable');
            return;
          }
          const open = page.items
            .filter((i) => i.status !== 'Completed' && i.status !== 'Cancelled')
            .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
          this.queue.set(open);
          this.queueState.set('ready');
        });
    } else {
      this.queueState.set('unavailable');
    }
  }

  protected toggleExpand(variant: KpiPanelVariant): void {
    if (!this.canViewGuests) {
      // No guests.view claim — fall back to nothing rather than an empty panel.
      return;
    }
    this.expanded.set(this.expanded() === variant ? null : variant);
  }

  protected panelTotal(variant: KpiPanelVariant): number {
    const d = this.data();
    if (!d) return 0;
    switch (variant) {
      // The DTO field names predate the spec §4.7 vocabulary: they carry the New and
      // On hold counts respectively.
      case 'new':
        return d.pendingConversationGuests;
      case 'onHold':
        return d.inactiveGuests;
      case 'urgent':
        return d.urgentGuests;
      default:
        return d.totalActiveGuests;
    }
  }

  protected trendText(value: number): string {
    return `${value >= 0 ? '+' : ''}${value} vs last month`;
  }

  protected initials(name: string): string {
    const parts = name.trim().split(/\s+/);
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
  }

  protected formatDayMonth(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  }

  protected formatDateTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  /** Right-hand status on an Outstanding team actions row. */
  protected actionStatus(item: FollowUpQueueItemDto): { text: string; tone: 'red' | 'yellow' } {
    if (item.isOverdue) return { text: `Overdue ${this.formatDayMonth(item.dueDate)}`, tone: 'red' };
    if (item.dueDate.slice(0, 10) === this.todayIso) return { text: 'Due today', tone: 'yellow' };
    return { text: `Due ${this.formatDayMonth(item.dueDate)}`, tone: 'yellow' };
  }

  protected openGuest(guestId: string): void {
    this.router.navigate(['/guests', guestId]);
  }

  /** "View" on a caseload row — the guest list filtered to that worker's assigned guests. */
  protected viewCaseload(staffId: string): void {
    this.router.navigate(['/guests'], { queryParams: { cmhw: staffId } });
  }

  protected cpnStatusLabel(guest: CpnInvolvedGuestDto): string {
    return guest.status === 'OnHold' ? 'On hold' : guest.status;
  }

  protected formatDate(value: string | null): string {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? '—'
      : date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}

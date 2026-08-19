import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { DashboardsApiService } from '../../core/dashboards-api.service';
import { FollowUpsApiService } from '../../core/follow-ups-api.service';
import { Permissions } from '../../core/permissions';
import { FollowUpQueueItemDto, HubManagerDashboardDto, MonthlyStatDto, PathwayDistributionDto } from '../../core/api-models';
import { GuestSeenCardComponent } from './guest-seen-card.component';
import { KpiGuestsPanelComponent, KpiPanelVariant } from './kpi-guests-panel.component';

/**
 * Pathway distribution rows — the design (GuestDataSheet2) shows the three allocation
 * pathways; the API may also return the six referral categories, so both label sets are
 * mapped. Bar colors cycle the design's red / yellow / maroon.
 */
const PATHWAY_LABELS: Record<string, string> = {
  MentalWellbeing: 'Wellbeing support',
  ClinicalSupport: 'Additional / clinical support',
  CommunityRecovery: 'Community & recovery',
  HousingAdvice: 'Housing Advice',
  EmploymentSupport: 'Employment Support',
  BenefitsFinancialSupport: 'Benefits & Financial Support',
  FoodEssentials: 'Food & Essentials',
  ImmigrationLegalAdvice: 'Immigration & Legal Advice',
  OtherPracticalAdvice: 'Other Practical Advice',
};

const PATHWAY_COLORS = ['#eb3c2c', '#c9a723', '#941c3c', '#0f766e', '#1d4ed8', '#6d28d9'];

interface PathwayRow extends PathwayDistributionDto {
  label: string;
  color: string;
  /** 0 = heart, 1 = first-aid box, 2 = community grid (icons cycle for extra rows). */
  icon: number;
}

/**
 * Hub Manager dashboard — reworked to the new `GuestDataSheet2` design (node 1034:7909,
 * project/screens/Components.bundle.js lines 2748-8987). Sidebar/header come from the shared
 * shell; this component is the content area only.
 *
 * Sections: expandable KPI row (drill-down panels per Frame 23/38/39, plus an urgent panel
 * that reuses the same language — the design ships no frame for it), Pathway distribution,
 * Clinical complexity indicators (spec §5.1), Guest Seen, Outstanding team actions (live
 * follow-up queue) and Staff activity (recent activity feed). Design sections with no
 * backing data — Caseload per CMHW, Guest demographics and Data quality issues — are
 * omitted (see feature report).
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

  protected readonly pathwayRows = computed<PathwayRow[]>(() => {
    const dto = this.data();
    if (!dto) return [];
    return [...dto.pathwayDistribution]
      .sort((a, b) => b.percentage - a.percentage)
      .map((p, index) => ({
        ...p,
        label: PATHWAY_LABELS[p.category] ?? p.category.replace(/([a-z])([A-Z])/g, '$1 $2'),
        color: PATHWAY_COLORS[index % PATHWAY_COLORS.length],
        icon: index % 3,
      }));
  });

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
}

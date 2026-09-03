import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { GuestsApiService } from '../../core/guests-api.service';
import { GuestListItemDto, GuestStatus, PathwayCategory } from '../../core/api-models';
import { PATHWAY_CATEGORY_OPTIONS } from '../../core/demographic-options';
import { StaffPickerComponent } from '../../shared/staff-picker.component';

/** Engagement statuses per spec §4.7, plus the urgency flag drill-down (spec §3.3). */
export type KpiPanelVariant = 'active' | 'new' | 'onHold' | 'urgent';

const DAY_MS = 24 * 60 * 60 * 1000;
/** Mean Gregorian month, used for the design's "3.3 months" on-hold figure. */
const MONTH_MS = 30.44 * DAY_MS;

/** Urgency is a flag, not a status, so the urgent variant has no status filter. */
const STATUS_BY_VARIANT: Record<KpiPanelVariant, GuestStatus | null> = {
  active: 'Active',
  new: 'New',
  onHold: 'OnHold',
  urgent: null,
};

/** Rows shown in every drill-down table. */
const ROW_LIMIT = 5;
/**
 * Rows fetched per query. Larger than ROW_LIMIT so the one client-side filter (Next contact,
 * which the guest endpoint cannot express) still has something to work on.
 */
const FETCH_SIZE = 50;

/** Number of days sent as lastActivityDays, or '' for no filter. */
type ActivityFilter = '' | '1' | '7' | '30';
/** Client-side bucket of GuestListItemDto.nextContactDue. */
type NextContactFilter = '' | 'overdue' | 'today' | 'week' | 'none';

const ACTIVITY_OPTIONS: { value: ActivityFilter; label: string }[] = [
  { value: '', label: 'Last Activity' },
  { value: '1', label: 'Today' },
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
];

const NEXT_CONTACT_OPTIONS: { value: NextContactFilter; label: string }[] = [
  { value: '', label: 'Next Contact' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'today', label: 'Due today' },
  { value: 'week', label: 'Next 7 days' },
  { value: 'none', label: 'Nothing scheduled' },
];

/**
 * Short labels for the drill-down tables' Pathway column. This column shows the guest's
 * practical-support referral category (PathwayCategory), which is a different axis from the
 * three clinical pathways on the Pathway distribution card — so only the referral categories
 * are mapped here. Anything unknown falls back to the de-camel-cased key.
 */
const PATHWAY_SHORT: Record<string, string> = {
  HousingAdvice: 'Housing Advice',
  EmploymentSupport: 'Employment Support',
  BenefitsFinancialSupport: 'Benefits & Financial',
  FoodEssentials: 'Food & Essentials',
  ImmigrationLegalAdvice: 'Immigration & Legal',
  OtherPracticalAdvice: 'Other Practical',
};

/** yyyy-MM-dd for a Date in local time. */
function isoDay(date: Date): string {
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

/**
 * Expanded KPI drill-down panel — Frame 23 (Total active), Frame 38 (New) and Frame 39
 * (On hold) in project/screens/Components.bundle.js (lines 113643-117455). A 1176px white
 * panel under the KPI row with a small guest table (5 rows) for the selected status, fed
 * live from GET /guests?status=….
 *
 * The toolbar's Pathway / Assigned CMHW / Last Activity dropdowns are real server-side
 * filters on that same endpoint (pathway, cmhw, lastActivityDays); "Next Contact" buckets
 * the returned rows by nextContactDue client-side, since the endpoint has no such filter.
 *
 * The `urgent` variant has no status behind it — urgency is a separate flag (spec §3.3),
 * so that panel sends `urgent=true` instead of a status and GET /guests filters on the
 * flag server-side.
 *
 * Design deviation (no backing field): Frame 38's "Registered by" column is omitted
 * (GuestListItemDto carries no registrar). The footer count prefers the page's
 * `totalCount` (reflects the active filters) over the dashboard DTO total.
 */
@Component({
  selector: 'app-kpi-guests-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, FormsModule, StaffPickerComponent],
  templateUrl: './kpi-guests-panel.component.html',
  styleUrl: './kpi-guests-panel.component.scss',
})
export class KpiGuestsPanelComponent {
  private readonly guestsApi = inject(GuestsApiService);
  private readonly router = inject(Router);

  readonly variant = input.required<KpiPanelVariant>();
  /** Status total from the dashboard DTO — drives "(98)" and "Showing 3 of 98…". */
  readonly total = input.required<number>();

  /** Every row the last query returned (up to FETCH_SIZE), before the client-side bucket. */
  private readonly fetched = signal<GuestListItemDto[]>([]);
  private readonly fetchedHasMore = signal(false);
  protected readonly state = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly query = signal('');
  /** Server-side total for the current filters (KeysetPage.totalCount, first page only). */
  private readonly serverTotal = signal<number | null>(null);

  // --- Toolbar filters ---
  protected readonly pathwayOptions = PATHWAY_CATEGORY_OPTIONS;
  protected readonly activityOptions = ACTIVITY_OPTIONS;
  protected readonly nextContactOptions = NEXT_CONTACT_OPTIONS;
  protected readonly pathwayFilter = signal<'' | PathwayCategory>('');
  /** Staff id from the shared picker, or null for all workers. */
  protected readonly cmhwFilter = signal<string | null>(null);
  protected readonly activityFilter = signal<ActivityFilter>('');
  protected readonly nextContactFilter = signal<NextContactFilter>('');

  private readonly todayIso = isoDay(new Date());
  private readonly weekEndIso = isoDay(new Date(Date.now() + 7 * DAY_MS));

  /** Rows after the client-side Next Contact bucket. */
  private readonly matching = computed(() => {
    const bucket = this.nextContactFilter();
    const rows = this.fetched();
    if (!bucket) return rows;
    return rows.filter((g) => {
      const due = g.nextContactDue?.slice(0, 10) ?? null;
      switch (bucket) {
        case 'overdue':
          return due !== null && due < this.todayIso;
        case 'today':
          return due === this.todayIso;
        case 'week':
          return due !== null && due > this.todayIso && due <= this.weekEndIso;
        default:
          return due === null;
      }
    });
  });

  protected readonly rows = computed(() => this.matching().slice(0, ROW_LIMIT));

  /**
   * Footer "Showing X of Y" — the filtered server total when known, else the DTO count. With
   * the client-side bucket on, Y is what matched within the fetched page ("+" when there were
   * more rows the bucket never saw).
   */
  protected readonly footerTotal = computed<string>(() => {
    if (this.nextContactFilter()) {
      return `${this.matching().length}${this.fetchedHasMore() ? '+' : ''}`;
    }
    return `${this.serverTotal() ?? this.total()}`;
  });

  private fetchToken = 0;

  protected readonly statusParam = computed(() => STATUS_BY_VARIANT[this.variant()]);

  protected readonly title = computed(() => {
    switch (this.variant()) {
      case 'new':
        return `New guests — awaiting initial conversation (${this.total()})`;
      case 'onHold':
        return `On hold guests — no activity 3+ months (${this.total()})`;
      case 'urgent':
        return `Urgent guests — flagged for immediate attention (${this.total()})`;
      default:
        return `Active guests (${this.total()})`;
    }
  });

  protected readonly footerNoun = computed(() => {
    switch (this.variant()) {
      case 'new':
        return 'new guests';
      case 'onHold':
        return 'on hold guests';
      case 'urgent':
        return 'urgent guests';
      default:
        return 'active guests';
    }
  });

  /** Urgent guests live on their own screen; the status variants deep-link the guest list. */
  protected readonly listLink = computed(() => (this.variant() === 'urgent' ? '/urgent-cases' : '/guests'));

  /** The guest list opens with the same status + toolbar filters this panel is showing. */
  protected readonly listParams = computed<Record<string, string>>(() => {
    const params: Record<string, string> = {};
    const status = this.statusParam();
    if (status) params['status'] = status;
    if (this.variant() === 'urgent') return {};
    if (this.pathwayFilter()) params['pathway'] = this.pathwayFilter();
    if (this.cmhwFilter()) params['cmhw'] = this.cmhwFilter()!;
    if (this.activityFilter()) params['activity'] = this.activityFilter();
    return params;
  });

  protected readonly listLabel = computed(() =>
    this.variant() === 'urgent' ? 'View urgent cases' : 'View guest list',
  );

  constructor() {
    effect(() => {
      const status = this.statusParam();
      const urgentOnly = this.variant() === 'urgent';
      const q = this.query().trim();
      const pathway = this.pathwayFilter();
      const cmhw = this.cmhwFilter();
      const activity = this.activityFilter();
      const token = ++this.fetchToken;
      this.state.set('loading');
      this.guestsApi
        .getGuestList({
          status: status ?? undefined,
          // Only send the flag for the urgent panel; the others must not exclude urgent guests.
          urgent: urgentOnly ? true : undefined,
          q: q || undefined,
          pathway: pathway || undefined,
          cmhw: cmhw ?? undefined,
          lastActivityDays: activity ? Number(activity) : undefined,
          pageSize: FETCH_SIZE,
        })
        .pipe(catchError(() => of(null)))
        .subscribe((page) => {
          if (token !== this.fetchToken) return;
          if (!page) {
            this.state.set('error');
            this.fetched.set([]);
            this.fetchedHasMore.set(false);
            this.serverTotal.set(null);
            return;
          }
          this.fetched.set(page.items);
          this.fetchedHasMore.set(page.hasMore);
          this.serverTotal.set(page.totalCount);
          this.state.set('ready');
        });
    });
  }

  protected onPathwayChange(value: string): void {
    this.pathwayFilter.set(value as '' | PathwayCategory);
  }

  protected onCmhwChange(value: string | null): void {
    this.cmhwFilter.set(value);
  }

  protected onActivityChange(value: string): void {
    this.activityFilter.set(value as ActivityFilter);
  }

  protected onNextContactChange(value: string): void {
    this.nextContactFilter.set(value as NextContactFilter);
  }

  protected initials(g: GuestListItemDto): string {
    return ((g.firstName[0] ?? '') + (g.lastName[0] ?? '')).toUpperCase();
  }

  protected fullName(g: GuestListItemDto): string {
    return `${g.firstName} ${g.lastName}`;
  }

  protected shortId(g: GuestListItemDto): string {
    return `ID: G-${g.guestNumber}`;
  }

  protected pathwayLabel(g: GuestListItemDto): string {
    if (!g.pathwayCategory) return '—';
    return PATHWAY_SHORT[g.pathwayCategory] ?? g.pathwayCategory.replace(/([a-z])([A-Z])/g, '$1 $2');
  }

  protected dayMonth(value: string | null): string {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  }

  protected fullDate(value: string | null): string {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? '—'
      : date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  /** Frame 38 "Days waiting" — whole days since registration. */
  protected daysWaiting(g: GuestListItemDto): string {
    const registered = new Date(g.registeredAt).getTime();
    if (Number.isNaN(registered)) return '—';
    const days = Math.max(0, Math.floor((Date.now() - registered) / DAY_MS));
    return `${days} day${days === 1 ? '' : 's'}`;
  }

  /** Frame 39 "Months without activity" — one decimal, from the last recorded contact. */
  protected monthsInactive(g: GuestListItemDto): string {
    const reference = g.lastContactAt ?? g.registeredAt;
    const last = new Date(reference).getTime();
    if (Number.isNaN(last)) return '—';
    const months = Math.max(0, (Date.now() - last) / MONTH_MS);
    return `${months.toFixed(1)} months`;
  }

  protected openGuest(guestId: string): void {
    this.router.navigate(['/guests', guestId]);
  }

  protected startConversation(guestId: string, event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/guests', guestId], { queryParams: { tab: 'initial' } });
  }
}

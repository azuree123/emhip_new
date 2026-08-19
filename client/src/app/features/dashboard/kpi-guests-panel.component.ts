import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { GuestsApiService } from '../../core/guests-api.service';
import { GuestListItemDto, GuestStatus } from '../../core/api-models';

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

/** Short pathway labels as shown in the drill-down tables ("Wellbeing", "Community", …). */
const PATHWAY_SHORT: Record<string, string> = {
  MentalWellbeing: 'Wellbeing',
  ClinicalSupport: 'Clinical',
  CommunityRecovery: 'Community',
  HousingAdvice: 'Housing Advice',
  EmploymentSupport: 'Employment Support',
  BenefitsFinancialSupport: 'Benefits & Financial',
  FoodEssentials: 'Food & Essentials',
  ImmigrationLegalAdvice: 'Immigration & Legal',
  OtherPracticalAdvice: 'Other Practical',
};

/**
 * Expanded KPI drill-down panel — Frame 23 (Total active), Frame 38 (New) and Frame 39
 * (On hold) in project/screens/Components.bundle.js (lines 113643-117455). A 1176px white
 * panel under the KPI row with a small guest table (5 rows) for the selected status, fed
 * live from GET /guests?status=….
 *
 * The `urgent` variant has no status behind it — urgency is a separate flag (spec §3.3),
 * so that panel sends `urgent=true` instead of a status and GET /guests filters on the
 * flag server-side.
 *
 * Design deviation (no backing field): Frame 38's "Registered by" column is omitted
 * (GuestListItemDto carries no registrar). The footer count prefers the page's
 * `totalCount` (reflects the active search) over the dashboard DTO total.
 */
@Component({
  selector: 'app-kpi-guests-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './kpi-guests-panel.component.html',
  styleUrl: './kpi-guests-panel.component.scss',
})
export class KpiGuestsPanelComponent {
  private readonly guestsApi = inject(GuestsApiService);
  private readonly router = inject(Router);

  readonly variant = input.required<KpiPanelVariant>();
  /** Status total from the dashboard DTO — drives "(98)" and "Showing 3 of 98…". */
  readonly total = input.required<number>();

  protected readonly rows = signal<GuestListItemDto[]>([]);
  protected readonly state = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly query = signal('');
  /** Server-side total for the current filters (KeysetPage.totalCount, first page only). */
  private readonly serverTotal = signal<number | null>(null);

  /** Footer "Showing X of Y" — the filtered server total when known, else the DTO count. */
  protected readonly footerTotal = computed(() => this.serverTotal() ?? this.total());

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

  protected readonly listParams = computed<Record<string, string>>(() => {
    const status = this.statusParam();
    return status ? { status } : ({} as Record<string, string>);
  });

  protected readonly listLabel = computed(() =>
    this.variant() === 'urgent' ? 'View urgent cases' : 'View guest list',
  );

  constructor() {
    effect(() => {
      const status = this.statusParam();
      const urgentOnly = this.variant() === 'urgent';
      const q = this.query().trim();
      const token = ++this.fetchToken;
      this.state.set('loading');
      this.guestsApi
        .getGuestList({
          status: status ?? undefined,
          // Only send the flag for the urgent panel; the others must not exclude urgent guests.
          urgent: urgentOnly ? true : undefined,
          q: q || undefined,
          pageSize: ROW_LIMIT,
        })
        .pipe(catchError(() => of(null)))
        .subscribe((page) => {
          if (token !== this.fetchToken) return;
          if (!page) {
            this.state.set('error');
            this.rows.set([]);
            this.serverTotal.set(null);
            return;
          }
          this.rows.set(page.items);
          this.serverTotal.set(page.totalCount);
          this.state.set('ready');
        });
    });
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
    this.router.navigate(['/guests', guestId]);
  }
}

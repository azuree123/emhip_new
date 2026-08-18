import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { GuestsApiService } from '../../core/guests-api.service';
import { GuestListItemDto, GuestStatus } from '../../core/api-models';

export type KpiPanelVariant = 'active' | 'pending' | 'inactive';

const DAY_MS = 24 * 60 * 60 * 1000;
/** Mean Gregorian month, used for the design's "3.3 months" inactive figure. */
const MONTH_MS = 30.44 * DAY_MS;

const STATUS_BY_VARIANT: Record<KpiPanelVariant, GuestStatus> = {
  active: 'Active',
  pending: 'PendingConversation',
  inactive: 'Inactive',
};

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
 * Expanded KPI drill-down panel — Frame 23 (Total active), Frame 38 (New / pending
 * conversation) and Frame 39 (Inactive) in project/screens/Components.bundle.js
 * (lines 113643-117455). A 1176px white panel under the KPI row with a small guest
 * table (5 rows) for the selected status, fed live from GET /guests?status=….
 *
 * Design deviations (no backing fields): Frame 38's "Registered by" column is omitted
 * (GuestListItemDto carries no registrar) and the guest id line shows the first GUID
 * block instead of the design's "G-1001" style codes.
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

  private fetchToken = 0;

  protected readonly statusParam = computed(() => STATUS_BY_VARIANT[this.variant()]);

  protected readonly title = computed(() => {
    switch (this.variant()) {
      case 'pending':
        return `New guests — awaiting initial conversation (${this.total()})`;
      case 'inactive':
        return `In active guests — no activity 3+ months (${this.total()})`;
      default:
        return `Active guests (${this.total()})`;
    }
  });

  protected readonly footerNoun = computed(() => {
    switch (this.variant()) {
      case 'pending':
        return 'new guests';
      case 'inactive':
        return 'on hold guests';
      default:
        return 'active guests';
    }
  });

  constructor() {
    effect(() => {
      const status = this.statusParam();
      const q = this.query().trim();
      const token = ++this.fetchToken;
      this.state.set('loading');
      this.guestsApi
        .getGuestList({ status, q: q || undefined, pageSize: 5 })
        .pipe(catchError(() => of(null)))
        .subscribe((page) => {
          if (token !== this.fetchToken) return;
          if (!page) {
            this.state.set('error');
            this.rows.set([]);
            return;
          }
          this.rows.set(page.items);
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
    return `ID: ${g.id.split('-')[0].toUpperCase()}`;
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

  /** Frame 39 "Months inactive" — one decimal, from the last recorded contact. */
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

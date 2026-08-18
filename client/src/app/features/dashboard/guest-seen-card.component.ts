import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { catchError, of } from 'rxjs';
import { DashboardsApiService } from '../../core/dashboards-api.service';
import { GuestsSeenDto, GuestsSeenPeriod } from '../../core/api-models';

/** One bar of the mini (in-row) chart, in SVG user units. */
interface MiniBar {
  x: number;
  y: number;
  w: number;
  h: number;
  zero: boolean;
}

/** One column of the expanded per-day chart (div-track bars, like Pathway distribution). */
interface SeriesCol {
  heightPct: number;
  zero: boolean;
  label: string;
  tooltip: string;
}

const MINI_H = 40;

/**
 * "Guest Seen" card — GuestDataSheet / GuestDataSheet2 (Components.bundle.js). The
 * Today / Week / Month segmented control re-queries GET /dashboards/guests-seen and the
 * chevron expands a per-day breakdown (distinct guests seen, total contacts, series chart)
 * in the same visual language as the KPI drill-down panels. `mine=true` (CMHW dashboard)
 * scopes the numbers to the signed-in worker's own contacts.
 */
@Component({
  selector: 'app-guest-seen-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './guest-seen-card.component.html',
  styleUrl: './guest-seen-card.component.scss',
})
export class GuestSeenCardComponent {
  private readonly dashboardsApi = inject(DashboardsApiService);

  /** Scope to the signed-in CMHW's own contacts (CMHW dashboard) instead of hub-wide. */
  readonly mine = input(false);

  protected readonly period = signal<GuestsSeenPeriod>('Month');
  protected readonly data = signal<GuestsSeenDto | null>(null);
  protected readonly state = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly open = signal(false);

  protected readonly periods: GuestsSeenPeriod[] = ['Today', 'Week', 'Month'];

  private fetchToken = 0;

  protected readonly subLabel = computed(() => {
    switch (this.period()) {
      case 'Today':
        return 'Today';
      case 'Week':
        return 'This week';
      default:
        return 'This month';
    }
  });

  /** Mini bar strip beside the number — pure SVG, decorative. */
  protected readonly miniBars = computed<MiniBar[]>(() => {
    const series = this.data()?.series ?? [];
    if (series.length === 0) return [];
    const slot = series.length <= 7 ? 24 : 8;
    const barW = Math.round(slot * 0.65);
    const max = Math.max(1, ...series.map((p) => p.guestsSeen));
    return series.map((p, i) => {
      const h = p.guestsSeen === 0 ? 2 : Math.max(3, Math.round((p.guestsSeen / max) * (MINI_H - 4)));
      return { x: i * slot, y: MINI_H - h, w: barW, h, zero: p.guestsSeen === 0 };
    });
  });

  protected readonly miniViewBox = computed(() => {
    const bars = this.miniBars();
    if (bars.length === 0) return `0 0 1 ${MINI_H}`;
    const last = bars[bars.length - 1];
    return `0 0 ${last.x + last.w} ${MINI_H}`;
  });

  /** Expanded chart columns — div tracks like the Pathway distribution bars. */
  protected readonly seriesCols = computed<SeriesCol[]>(() => {
    const dto = this.data();
    if (!dto) return [];
    const max = Math.max(1, ...dto.series.map((p) => p.guestsSeen));
    return dto.series.map((p, i) => {
      const date = new Date(p.date);
      const valid = !Number.isNaN(date.getTime());
      let label = '';
      if (valid) {
        if (dto.period === 'Week') {
          label = date.toLocaleDateString('en-GB', { weekday: 'short' });
        } else if (dto.period === 'Today') {
          label = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
        } else if (i % 5 === 0 || i === dto.series.length - 1) {
          label = `${date.getDate()}`;
        }
      }
      const day = valid ? date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : p.date;
      return {
        heightPct: p.guestsSeen === 0 ? 0 : Math.max(3, Math.round((p.guestsSeen / max) * 100)),
        zero: p.guestsSeen === 0,
        label,
        tooltip: `${day}: ${p.guestsSeen} guest${p.guestsSeen === 1 ? '' : 's'} seen`,
      };
    });
  });

  protected readonly rangeLabel = computed(() => {
    const dto = this.data();
    if (!dto) return '';
    const fmt = (v: string) => {
      const date = new Date(v);
      return Number.isNaN(date.getTime())
        ? v
        : date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    };
    return dto.from === dto.to ? fmt(dto.from) : `${fmt(dto.from)} – ${fmt(dto.to)}`;
  });

  constructor() {
    effect(() => {
      const period = this.period();
      const mine = this.mine();
      const token = ++this.fetchToken;
      this.state.set('loading');
      this.dashboardsApi
        .getGuestsSeen(period, mine)
        .pipe(catchError(() => of(null)))
        .subscribe((result) => {
          if (token !== this.fetchToken) return;
          if (!result) {
            this.state.set('error');
            this.data.set(null);
            return;
          }
          this.data.set(result);
          this.state.set('ready');
        });
    });
  }

  protected setPeriod(period: GuestsSeenPeriod): void {
    this.period.set(period);
  }

  protected toggleOpen(): void {
    this.open.set(!this.open());
  }
}

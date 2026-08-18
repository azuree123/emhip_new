import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import {
  BreakdownSliceDto,
  DialogOutcomesReportDto,
  PathwayCategoryTotalDto,
  PathwayReportDto,
} from '../../core/api-models';
import { CATEGORY_META } from './report-meta';
import { ReportsDomainTableComponent } from './reports-domain-table.component';

interface CategoryRow extends PathwayCategoryTotalDto {
  label: string;
  color: string;
}

interface KpiTile {
  label: string;
  value: number | null;
}

interface ActivityRow {
  label: string;
  value: number;
}

interface EthnicityRow {
  label: string;
  count: number;
  percentage: number;
  /** Bar length relative to the largest slice (largest slice fills the track). */
  barPct: number;
}

interface DialogMetrics {
  total: number;
  baselines: number;
  followUps: number;
  followUpPct: number;
  /** Total-score change across all domains, or null when no comparison is possible. */
  improvement: number | null;
  noFollowUp: number;
}

interface RegChartPoint {
  x: number;
  y: number;
  count: number;
  /** Left edge / width of the invisible hover strip for this month. */
  hitX: number;
  hitW: number;
}

interface RegChart {
  linePath: string;
  points: RegChartPoint[];
  ticks: { y: number; label: string }[];
  monthLabels: { x: number; text: string }[];
}

interface RegChartTip {
  x: number;
  top: number;
  count: number;
  notchFill: string;
  notchEdge: string;
}

// ---- "Guest registrations over time" chart geometry (SVG viewBox units). ----
// The viewBox mirrors the source card's inner width so the design's absolute
// sizes (2px line, 14px dots, 12px axis text) render 1:1.
const VB_W = 648;
const VB_H = 256;
const PLOT_L = 56;
const PLOT_R = 628;
const PLOT_T = 16;
const PLOT_B = 216;
const TICK_COUNT = 5;
/** First point sits slightly inside the plot, like the source (dot at x+8). */
const POINT_INSET = 8;

/** Smallest "nice" axis maximum (step x 5) that covers `max`: 5, 10, 25, 50, 100 ... */
function niceAxisMax(max: number): number {
  if (max <= TICK_COUNT) return TICK_COUNT;
  let magnitude = 1;
  for (;;) {
    for (const s of [1, 2, 5]) {
      const step = s * magnitude;
      if (step * TICK_COUNT >= max) return step * TICK_COUNT;
    }
    magnitude *= 10;
  }
}

/**
 * Report "Overview" tab body — KPI tiles, DIALOG outcome metrics, pathway
 * distribution, registrations-over-time chart, demographics and follow-up
 * activity, per Desktop72/73/74 in project/screens/Components.bundle.js.
 */
@Component({
  selector: 'app-reports-overview',
  standalone: true,
  imports: [ReportsDomainTableComponent],
  templateUrl: './reports-overview.component.html',
  styleUrl: './reports-overview.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportsOverviewComponent {
  readonly report = input.required<PathwayReportDto | null>();
  readonly loading = input(false);
  readonly outcomes = input.required<DialogOutcomesReportDto | null>();
  readonly outcomesLoading = input(false);
  readonly referralSources = input<BreakdownSliceDto[]>([]);
  readonly referralSourcesLoading = input(false);
  readonly from = input.required<string>();
  readonly to = input.required<string>();

  /** Index into regChart().points of the month the pointer is over, or null. */
  readonly hoveredPoint = signal<number | null>(null);

  readonly categoryRows = computed<CategoryRow[]>(() => {
    const totals = this.report()?.categoryTotals ?? [];
    return [...totals]
      .sort((a, b) => b.percentage - a.percentage)
      .map((ct) => ({
        ...ct,
        label: CATEGORY_META[ct.category]?.label ?? ct.category,
        color: CATEGORY_META[ct.category]?.color ?? 'rgb(114, 114, 114)',
      }));
  });

  readonly totalReferrals = computed<number | null>(() => this.report()?.totalReferrals ?? null);

  /**
   * KPI tile row driven by statusCounts. The source draws TOTAL GUESTS / ACTIVE
   * GUESTS / IN ACTIVE / URGENT CASES (Desktop72); the trend chips ("+8% from
   * last month", "Avg res: 2.8 days") have no backing data and are omitted.
   */
  readonly kpiTiles = computed<KpiTile[]>(() => {
    const c = this.report()?.statusCounts ?? null;
    return [
      { label: 'Total guests', value: c?.total ?? null },
      { label: 'Active guests', value: c?.active ?? null },
      { label: 'Inactive guests', value: c?.inactive ?? null },
      { label: 'Urgent cases', value: c?.urgent ?? null },
    ];
  });

  /**
   * "Follow-up activity" rows. The source card also lists "AFA contacts" and
   * "Resolved episodes", which have no backing data — the four real metrics
   * are rendered with the design's row styling instead.
   */
  readonly activityRows = computed<ActivityRow[]>(() => {
    const a = this.report()?.activity ?? null;
    if (!a) return [];
    return [
      { label: 'Guests seen', value: a.guestsSeen },
      { label: 'Total follow-up entries', value: a.followUpEntries },
      { label: 'Contacts recorded', value: a.contactsRecorded },
      { label: 'Urgent flags raised', value: a.urgentFlagsRaised },
    ];
  });

  /**
   * Ethnicity slices, largest first. Bar length is scaled to the largest slice
   * (as in the source mockup, where the top 38% slice fills over half the track);
   * the printed percentage is the true share.
   */
  readonly ethnicityRows = computed<EthnicityRow[]>(() => {
    const rows = [...(this.report()?.ethnicityBreakdown ?? [])].sort((a, b) => b.count - a.count);
    const max = rows[0]?.count ?? 0;
    return rows.map((r) => ({ ...r, barPct: max > 0 ? (r.count / max) * 100 : 0 }));
  });

  /**
   * "Referral sources" rows (Desktop72 side column), largest first. Bars are
   * scaled to the largest slice, as in the source card; the printed percentage
   * is the true share.
   */
  readonly referralRows = computed<(BreakdownSliceDto & { barPct: number })[]>(() => {
    const rows = [...this.referralSources()].sort((a, b) => b.count - a.count);
    const max = rows[0]?.count ?? 0;
    return rows.map((r) => ({ ...r, barPct: max > 0 ? (r.count / max) * 100 : 0 }));
  });

  /**
   * "DIALOG outcome metrics" card tiles (Desktop72). All five figures derive
   * from the real outcomes DTO: total = baseline + follow-up counts, follow-up
   * share, total-score improvement (sum of per-domain averages, most recent
   * minus baseline) and guests still awaiting a follow-up assessment.
   */
  readonly dialogMetrics = computed<DialogMetrics | null>(() => {
    const o = this.outcomes();
    if (!o || (o.guestsWithBaseline === 0 && o.guestsWithFollowUp === 0)) return null;
    const comparable = o.dimensions.filter(
      (d) => d.baselineAverage !== null && d.latestAverage !== null,
    );
    const improvement =
      comparable.length > 0
        ? comparable.reduce((sum, d) => sum + (d.latestAverage! - d.baselineAverage!), 0)
        : null;
    return {
      total: o.guestsWithBaseline + o.guestsWithFollowUp,
      baselines: o.guestsWithBaseline,
      followUps: o.guestsWithFollowUp,
      followUpPct:
        o.guestsWithBaseline > 0
          ? Math.round((o.guestsWithFollowUp / o.guestsWithBaseline) * 100)
          : 0,
      improvement,
      noFollowUp: Math.max(o.guestsWithBaseline - o.guestsWithFollowUp, 0),
    };
  });

  readonly improvementLabel = computed<string>(() => {
    const v = this.dialogMetrics()?.improvement;
    if (v === null || v === undefined) return '—';
    return `${v >= 0 ? '+' : ''}${v.toFixed(1)} pts`;
  });

  /** "Jan – May 2025" (same year) or "Nov 2024 – May 2025" for card captions. */
  readonly rangeLabel = computed<string>(() => {
    const f = new Date(`${this.from()}T00:00:00`);
    const t = new Date(`${this.to()}T00:00:00`);
    const month = (d: Date) => d.toLocaleDateString('en-GB', { month: 'short' });
    return f.getFullYear() === t.getFullYear()
      ? `${month(f)} – ${month(t)} ${t.getFullYear()}`
      : `${month(f)} ${f.getFullYear()} – ${month(t)} ${t.getFullYear()}`;
  });

  readonly regChart = computed<RegChart | null>(() => {
    const data = [...(this.report()?.monthlyRegistrations ?? [])].sort(
      (a, b) => a.year - b.year || a.month - b.month,
    );
    if (data.length === 0) return null;

    const axisMax = niceAxisMax(Math.max(...data.map((d) => d.count)));
    const plotH = PLOT_B - PLOT_T;
    const n = data.length;
    const x0 = PLOT_L + POINT_INSET;
    const x1 = PLOT_R - POINT_INSET;
    const step = n > 1 ? (x1 - x0) / (n - 1) : 0;
    const multiYear = new Set(data.map((d) => d.year)).size > 1;

    const points: RegChartPoint[] = data.map((d, i) => {
      const x = n > 1 ? x0 + i * step : (PLOT_L + PLOT_R) / 2;
      const hitX = n > 1 ? Math.max(PLOT_L, x - step / 2) : PLOT_L;
      const hitEnd = n > 1 ? Math.min(PLOT_R, x + step / 2) : PLOT_R;
      return {
        x,
        y: PLOT_B - (d.count / axisMax) * plotH,
        count: d.count,
        hitX,
        hitW: hitEnd - hitX,
      };
    });

    const ticks = Array.from({ length: TICK_COUNT + 1 }, (_, k) => ({
      y: PLOT_B - (k / TICK_COUNT) * plotH,
      label: String((axisMax / TICK_COUNT) * k),
    }));

    // Thin month labels so at most ~12 render, like the source's monthly ticks.
    const labelStep = Math.ceil(n / 12);
    const monthLabels = data
      .map((d, i) => ({ d, i }))
      .filter(({ i }) => i % labelStep === 0)
      .map(({ d, i }) => {
        const name = new Date(d.year, d.month - 1, 1).toLocaleDateString('en-GB', {
          month: 'short',
        });
        return { x: points[i].x, text: multiYear ? `${name} ${String(d.year).slice(2)}` : name };
      });

    return {
      linePath: points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' '),
      points,
      ticks,
      monthLabels,
    };
  });

  /** Design-styled tooltip for the hovered month, clamped inside the plot. */
  readonly regChartTip = computed<RegChartTip | null>(() => {
    const chart = this.regChart();
    const i = this.hoveredPoint();
    if (!chart || i === null || !chart.points[i]) return null;
    const p = chart.points[i];
    const x = Math.min(Math.max(p.x, PLOT_L + 48), PLOT_R - 48);
    const top = Math.max(p.y - 68, 2);
    const base = top + 50;
    return {
      x,
      top,
      count: p.count,
      notchFill: `M ${x - 6} ${base - 1} L ${x + 6} ${base - 1} L ${x} ${base + 5} Z`,
      notchEdge: `M ${x - 6} ${base} L ${x} ${base + 6} L ${x + 6} ${base}`,
    };
  });

  readonly chartViewBox = `0 0 ${VB_W} ${VB_H}`;
}

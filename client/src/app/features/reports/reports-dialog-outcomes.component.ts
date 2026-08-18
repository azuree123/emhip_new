import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { DialogOutcomesReportDto, DialogTrendPointDto } from '../../core/api-models';
import { ReportsApiService } from '../../core/reports-api.service';
import { ReportsDomainTableComponent } from './reports-domain-table.component';

interface RadarPoint {
  x: number;
  y: number;
  /** Tooltip text (native <title>) for the dot. */
  tip: string;
}

interface RadarSeries {
  /** Closed polygon path, or null when fewer than 3 domains have scores. */
  path: string | null;
  points: RadarPoint[];
}

interface RadarChart {
  /** Ring radii for scores 1..7 (the DIALOG scale). */
  rings: number[];
  spokes: { x: number; y: number }[];
  labels: { x: number; y: number; anchor: string; text: string }[];
  baseline: RadarSeries;
  latest: RadarSeries;
}

interface TrendPoint {
  x: number;
  y: number;
  average: number;
  assessments: number;
  monthLabel: string;
  /** Left edge / width of the invisible hover strip for this month. */
  hitX: number;
  hitW: number;
}

interface TrendChart {
  linePath: string;
  areaPath: string;
  points: TrendPoint[];
  ticks: { y: number; label: string }[];
  monthLabels: { x: number; text: string }[];
}

interface TrendTip {
  x: number;
  top: number;
  month: string;
  score: string;
  notchFill: string;
  notchEdge: string;
}

// ---- Radar geometry (SVG viewBox units) -----------------------------------
const VB_W = 640;
const VB_H = 470;
const CX = VB_W / 2;
const CY = 228;
const R = 150;
/** Max score per DIALOG domain — rings mirror the 1..7 scale. */
const MAX_SCORE = 7;
const LABEL_R = R + 20;

// ---- "DIALOG SCORE TREND" chart geometry (same frame as the registrations
// chart on the Overview tab). Y axis is the total DIALOG score (max 77),
// drawn to a clean 0-80 scale. --------------------------------------------
const T_VB_W = 648;
const T_VB_H = 256;
const T_PLOT_L = 56;
const T_PLOT_R = 628;
const T_PLOT_T = 16;
const T_PLOT_B = 216;
const T_AXIS_MAX = 80;
const T_TICK_STEP = 20;
const T_POINT_INSET = 8;

/**
 * DIALOG Outcomes tab — Desktop47 in project/screens/Components.bundle.js
 * (lines 103895-107266): KPI tiles, the "DIALOG SCORE TREND" line chart
 * (monthly average total score from the real /reports/dialog-trend endpoint),
 * the "Outcome dimensions" radar and the per-domain averages table.
 */
@Component({
  selector: 'app-reports-dialog-outcomes',
  standalone: true,
  imports: [ReportsDomainTableComponent],
  templateUrl: './reports-dialog-outcomes.component.html',
  styleUrl: './reports-dialog-outcomes.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportsDialogOutcomesComponent implements OnInit {
  private readonly reportsApi = inject(ReportsApiService);

  readonly outcomes = input.required<DialogOutcomesReportDto | null>();
  readonly loading = input(false);

  readonly radarViewBox = `0 0 ${VB_W} ${VB_H}`;
  readonly trendViewBox = `0 0 ${T_VB_W} ${T_VB_H}`;

  readonly trend = signal<DialogTrendPointDto[]>([]);
  readonly trendLoading = signal(false);
  /** Index into trendChart().points of the month the pointer is over, or null. */
  readonly hoveredTrend = signal<number | null>(null);

  ngOnInit(): void {
    this.trendLoading.set(true);
    this.reportsApi.getDialogTrend().subscribe({
      next: (points) => {
        this.trend.set(points);
        this.trendLoading.set(false);
      },
      error: () => {
        this.trend.set([]);
        this.trendLoading.set(false);
      },
    });
  }

  readonly followUpPct = computed<number>(() => {
    const o = this.outcomes();
    if (!o || o.guestsWithBaseline === 0) return 0;
    return Math.round((o.guestsWithFollowUp / o.guestsWithBaseline) * 100);
  });

  /** Guests with a baseline but no follow-up assessment yet. */
  readonly missingFollowUps = computed<number>(() => {
    const o = this.outcomes();
    if (!o) return 0;
    return Math.max(o.guestsWithBaseline - o.guestsWithFollowUp, 0);
  });

  /** Total-score change (sum of per-domain averages, most recent minus baseline). */
  readonly improvement = computed<number | null>(() => {
    const dims = this.outcomes()?.dimensions ?? [];
    const comparable = dims.filter((d) => d.baselineAverage !== null && d.latestAverage !== null);
    if (comparable.length === 0) return null;
    return comparable.reduce((sum, d) => sum + (d.latestAverage! - d.baselineAverage!), 0);
  });

  readonly improvementLabel = computed<string>(() => {
    const v = this.improvement();
    if (v === null) return '—';
    return `${v >= 0 ? '+' : ''}${v.toFixed(1)}`;
  });

  readonly trendChart = computed<TrendChart | null>(() => {
    const data = [...this.trend()].sort((a, b) => a.year - b.year || a.month - b.month);
    if (data.length === 0) return null;

    const plotH = T_PLOT_B - T_PLOT_T;
    const n = data.length;
    const x0 = T_PLOT_L + T_POINT_INSET;
    const x1 = T_PLOT_R - T_POINT_INSET;
    const step = n > 1 ? (x1 - x0) / (n - 1) : 0;
    const multiYear = new Set(data.map((d) => d.year)).size > 1;
    const monthName = (d: DialogTrendPointDto) =>
      new Date(d.year, d.month - 1, 1).toLocaleDateString('en-GB', { month: 'short' });

    const points: TrendPoint[] = data.map((d, i) => {
      const x = n > 1 ? x0 + i * step : (T_PLOT_L + T_PLOT_R) / 2;
      const hitX = n > 1 ? Math.max(T_PLOT_L, x - step / 2) : T_PLOT_L;
      const hitEnd = n > 1 ? Math.min(T_PLOT_R, x + step / 2) : T_PLOT_R;
      return {
        x,
        y: T_PLOT_B - (Math.min(d.averageTotal, T_AXIS_MAX) / T_AXIS_MAX) * plotH,
        average: d.averageTotal,
        assessments: d.assessments,
        monthLabel: multiYear ? `${monthName(d)} ${d.year}` : monthName(d),
        hitX,
        hitW: hitEnd - hitX,
      };
    });

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaPath = `${linePath} L ${points[points.length - 1].x} ${T_PLOT_B} L ${points[0].x} ${T_PLOT_B} Z`;

    const tickCount = T_AXIS_MAX / T_TICK_STEP;
    const ticks = Array.from({ length: tickCount + 1 }, (_, k) => ({
      y: T_PLOT_B - (k / tickCount) * plotH,
      label: String(k * T_TICK_STEP),
    }));

    const labelStep = Math.ceil(n / 12);
    const monthLabels = data
      .map((d, i) => ({ d, i }))
      .filter(({ i }) => i % labelStep === 0)
      .map(({ d, i }) => ({
        x: points[i].x,
        text: multiYear ? `${monthName(d)} ${String(d.year).slice(2)}` : monthName(d),
      }));

    return { linePath, areaPath, points, ticks, monthLabels };
  });

  /** Design-styled tooltip ("April" / "Score: 69.2") clamped inside the plot. */
  readonly trendTip = computed<TrendTip | null>(() => {
    const chart = this.trendChart();
    const i = this.hoveredTrend();
    if (!chart || i === null || !chart.points[i]) return null;
    const p = chart.points[i];
    const x = Math.min(Math.max(p.x, T_PLOT_L + 52), T_PLOT_R - 52);
    const top = Math.max(p.y - 68, 2);
    const base = top + 50;
    return {
      x,
      top,
      month: p.monthLabel,
      score: `Score: ${p.average.toFixed(1)}`,
      notchFill: `M ${x - 6} ${base - 1} L ${x + 6} ${base - 1} L ${x} ${base + 5} Z`,
      notchEdge: `M ${x - 6} ${base} L ${x} ${base + 6} L ${x + 6} ${base}`,
    };
  });

  readonly radar = computed<RadarChart | null>(() => {
    const dims = this.outcomes()?.dimensions ?? [];
    const n = dims.length;
    if (n < 3) return null;

    const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;
    const at = (i: number, r: number) => ({
      x: Math.round((CX + Math.cos(angle(i)) * r) * 10) / 10,
      y: Math.round((CY + Math.sin(angle(i)) * r) * 10) / 10,
    });

    const rings = Array.from({ length: MAX_SCORE }, (_, k) => Math.round((R * (k + 1)) / MAX_SCORE));
    const spokes = dims.map((_, i) => at(i, R));

    const labels = dims.map((d, i) => {
      const cos = Math.cos(angle(i));
      const sin = Math.sin(angle(i));
      const p = at(i, LABEL_R);
      return {
        x: p.x,
        // Nudge labels above/below the plot at the poles, and onto the text
        // baseline elsewhere.
        y: p.y + (sin > 0.3 ? 12 : sin < -0.3 ? -2 : 4),
        anchor: cos > 0.25 ? 'start' : cos < -0.25 ? 'end' : 'middle',
        text: d.label,
      };
    });

    const series = (kind: 'baselineAverage' | 'latestAverage', name: string): RadarSeries => {
      const points: RadarPoint[] = [];
      for (let i = 0; i < n; i++) {
        const value = dims[i][kind];
        if (value === null) continue; // honest gap — no average for this domain
        const p = at(i, (R * Math.min(Math.max(value, 0), MAX_SCORE)) / MAX_SCORE);
        points.push({ ...p, tip: `${dims[i].label} — ${name} avg ${value.toFixed(1)} / ${MAX_SCORE}` });
      }
      const path =
        points.length >= 3
          ? points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z'
          : null;
      return { path, points };
    };

    return {
      rings,
      spokes,
      labels,
      baseline: series('baselineAverage', 'baseline'),
      latest: series('latestAverage', 'most recent'),
    };
  });

  readonly cx = CX;
  readonly cy = CY;
}

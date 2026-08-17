import { Component, OnInit, computed, inject, signal } from '@angular/core';
import {
  BreakdownSliceDto,
  GuestStatusCountsDto,
  MonthlyCountDto,
  PathwayCategoryTotalDto,
  ReportActivityDto,
} from '../../core/api-models';
import { ReportsApiService } from '../../core/reports-api.service';

/**
 * Display metadata (label + chart color) for each PathwayCategory enum value.
 * The three brand colors (maroon/coral/gold) are lifted verbatim from the
 * "Pathway distribution" card in the source Figma export (Desktop50, around
 * lines 35141-35365 of Components.bundle.js); the remaining three extend the
 * same palette using the secondary-*-700 tones already defined in
 * project/design-system/fig-tokens.css, since the source mockup only drew
 * three sample rows but our real data has six pathway categories.
 */
const CATEGORY_META: Record<string, { label: string; color: string }> = {
  HousingAdvice: { label: 'Housing Advice', color: 'rgb(148, 28, 60)' },
  EmploymentSupport: { label: 'Employment Support', color: 'rgb(235, 60, 44)' },
  BenefitsFinancialSupport: { label: 'Benefits & Financial Support', color: 'rgb(201, 167, 35)' },
  FoodEssentials: { label: 'Food & Essentials', color: 'rgb(15, 118, 110)' },
  ImmigrationLegalAdvice: { label: 'Immigration & Legal Advice', color: 'rgb(29, 78, 216)' },
  OtherPracticalAdvice: { label: 'Other Practical Advice', color: 'rgb(109, 40, 217)' },
};

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

interface EthnicityRow extends BreakdownSliceDto {
  /** Bar length relative to the largest slice (largest slice fills the track). */
  barPct: number;
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
// The viewBox mirrors the source card's inner width (687 - 19 - 20 = 648) so the
// design's absolute sizes (2px line, 14px dots, 12px axis text) render 1:1.
const VB_W = 648;
const VB_H = 256;
const PLOT_L = 56;
const PLOT_R = 628;
const PLOT_T = 16;
const PLOT_B = 216;
const TICK_COUNT = 5;
/** First point sits slightly inside the plot, like the source (dot at x+8). */
const POINT_INSET = 8;

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

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

@Component({
  selector: 'app-reports',
  standalone: true,
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.scss',
})
export class ReportsComponent implements OnInit {
  private readonly reportsApi = inject(ReportsApiService);

  /**
   * Report-section tabs drawn in the source header (Desktop50). Only "Overview" (this
   * screen) exists in the app; the rest are rendered disabled purely for visual parity
   * with the design — there are no other report endpoints to navigate to.
   */
  readonly inactiveTabs = [
    'Guest Report',
    'Pathway Analytics',
    'Caseload Reports',
    'DIALOG Outcomes',
    'Data Quality',
    'Export History',
  ];

  readonly maxDate = toIsoDate(new Date());
  readonly todayLabel = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  readonly from = signal<string>(this.monthsAgoIso(6));
  readonly to = signal<string>(this.maxDate);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly totalReferrals = signal<number | null>(null);
  readonly categoryTotals = signal<PathwayCategoryTotalDto[]>([]);
  readonly statusCounts = signal<GuestStatusCountsDto | null>(null);
  readonly monthlyRegistrations = signal<MonthlyCountDto[]>([]);
  readonly activity = signal<ReportActivityDto | null>(null);
  readonly ethnicityBreakdown = signal<BreakdownSliceDto[]>([]);
  /** Index into regChart().points of the month the pointer is over, or null. */
  readonly hoveredPoint = signal<number | null>(null);

  readonly categoryRows = computed<CategoryRow[]>(() =>
    [...this.categoryTotals()]
      .sort((a, b) => b.percentage - a.percentage)
      .map((ct) => ({
        ...ct,
        label: CATEGORY_META[ct.category]?.label ?? ct.category,
        color: CATEGORY_META[ct.category]?.color ?? 'rgb(114, 114, 114)',
      })),
  );

  /**
   * KPI tile row driven by statusCounts. The source draws TOTAL GUESTS / ACTIVE
   * GUESTS / ON HOLD / URGENT CASES; "ON HOLD" is not a status we track, so the
   * third tile honestly reports our real PendingConversation count instead.
   */
  readonly kpiTiles = computed<KpiTile[]>(() => {
    const c = this.statusCounts();
    return [
      { label: 'Total guests', value: c?.total ?? null },
      { label: 'Active guests', value: c?.active ?? null },
      { label: 'Pending conversation', value: c?.pendingConversation ?? null },
      { label: 'Urgent cases', value: c?.urgent ?? null },
    ];
  });

  /**
   * "Activity this period" rows. The source card also lists "AFA contacts" and
   * "Resolved episodes", which have no backing data — our four real metrics are
   * rendered with the design's row styling instead.
   */
  readonly activityRows = computed<ActivityRow[]>(() => {
    const a = this.activity();
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
    const rows = [...this.ethnicityBreakdown()].sort((a, b) => b.count - a.count);
    const max = rows[0]?.count ?? 0;
    return rows.map((r) => ({ ...r, barPct: max > 0 ? (r.count / max) * 100 : 0 }));
  });

  /** "Jan – May 2025" (same year) or "Nov 2024 – May 2025" for the chart subtitle. */
  readonly rangeLabel = computed<string>(() => {
    const f = new Date(`${this.from()}T00:00:00`);
    const t = new Date(`${this.to()}T00:00:00`);
    const month = (d: Date) => d.toLocaleDateString('en-GB', { month: 'short' });
    return f.getFullYear() === t.getFullYear()
      ? `${month(f)} – ${month(t)} ${t.getFullYear()}`
      : `${month(f)} ${f.getFullYear()} – ${month(t)} ${t.getFullYear()}`;
  });

  readonly regChart = computed<RegChart | null>(() => {
    const data = [...this.monthlyRegistrations()].sort(
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

  ngOnInit(): void {
    this.load();
  }

  onFromChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (!value) return;
    this.from.set(value);
    this.load();
  }

  onToChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (!value) return;
    this.to.set(value);
    this.load();
  }

  applyPreset(months: number): void {
    this.to.set(this.maxDate);
    this.from.set(this.monthsAgoIso(months));
    this.load();
  }

  exportCsv(): void {
    const from = this.from();
    const to = this.to();
    this.reportsApi.exportCsv(from, to).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `pathway-report-${from}-to-${to}.csv`;
        anchor.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.error.set('Could not export the report. Please try again.'),
    });
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.hoveredPoint.set(null);
    this.reportsApi.getPathwayReport(this.from(), this.to()).subscribe({
      next: (report) => {
        this.totalReferrals.set(report.totalReferrals);
        this.categoryTotals.set(report.categoryTotals ?? []);
        this.statusCounts.set(report.statusCounts ?? null);
        this.monthlyRegistrations.set(report.monthlyRegistrations ?? []);
        this.activity.set(report.activity ?? null);
        this.ethnicityBreakdown.set(report.ethnicityBreakdown ?? []);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.message ?? 'Unable to load report data.');
        this.totalReferrals.set(null);
        this.categoryTotals.set([]);
        this.statusCounts.set(null);
        this.monthlyRegistrations.set([]);
        this.activity.set(null);
        this.ethnicityBreakdown.set([]);
        this.loading.set(false);
      },
    });
  }

  private monthsAgoIso(months: number): string {
    const d = new Date();
    d.setMonth(d.getMonth() - months);
    return toIsoDate(d);
  }
}

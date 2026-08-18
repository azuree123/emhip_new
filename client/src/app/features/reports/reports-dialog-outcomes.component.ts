import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DialogOutcomesReportDto } from '../../core/api-models';
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

// ---- Radar geometry (SVG viewBox units) -----------------------------------
const VB_W = 640;
const VB_H = 470;
const CX = VB_W / 2;
const CY = 228;
const R = 150;
/** Max score per DIALOG domain — rings mirror the 1..7 scale. */
const MAX_SCORE = 7;
const LABEL_R = R + 20;

/**
 * DIALOG Outcomes tab — Desktop47 in project/screens/Components.bundle.js
 * (lines 103895-107266): KPI tiles, the "Outcome dimensions" radar and the
 * per-domain averages table, all driven by the real /reports/dialog-outcomes
 * endpoint. The source's "DIALOG SCORE TREND" line chart (monthly average
 * score) is omitted — the API exposes no score time series.
 */
@Component({
  selector: 'app-reports-dialog-outcomes',
  standalone: true,
  imports: [ReportsDomainTableComponent],
  templateUrl: './reports-dialog-outcomes.component.html',
  styleUrl: './reports-dialog-outcomes.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportsDialogOutcomesComponent {
  readonly outcomes = input.required<DialogOutcomesReportDto | null>();
  readonly loading = input(false);

  readonly radarViewBox = `0 0 ${VB_W} ${VB_H}`;

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

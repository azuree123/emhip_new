import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DialogOutcomesReportDto } from '../../core/api-models';

interface DomainRow {
  label: string;
  baseline: string;
  latest: string;
  change: string;
  /** 1 = improved (green), -1 = declined (red), 0 = flat/unknown. */
  trend: number;
}

/**
 * "Average DIALOG scores by domain" card — the domain table drawn on both the
 * report Overview (Desktop72) and the DIALOG Outcomes tab (Desktop47). The
 * source's header row reuses a generic table component (labelled Worker/Active/
 * On hold/Load); real column names are used here since the data is per-domain.
 */
@Component({
  selector: 'app-reports-domain-table',
  standalone: true,
  templateUrl: './reports-domain-table.component.html',
  styleUrl: './reports-domain-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportsDomainTableComponent {
  readonly outcomes = input.required<DialogOutcomesReportDto | null>();
  readonly loading = input(false);

  readonly rows = computed<DomainRow[]>(() => {
    const dims = this.outcomes()?.dimensions ?? [];
    return dims.map((d) => {
      const both = d.baselineAverage !== null && d.latestAverage !== null;
      const delta = both ? d.latestAverage! - d.baselineAverage! : null;
      return {
        label: d.label,
        baseline: d.baselineAverage !== null ? d.baselineAverage.toFixed(1) : '—',
        latest: d.latestAverage !== null ? d.latestAverage.toFixed(1) : '—',
        change: delta !== null ? this.signed(delta) : '—',
        trend: delta === null ? 0 : Math.sign(Number(delta.toFixed(1))),
      };
    });
  });

  /** Totals across the 11 domains (sums of the per-domain averages, as in the source's 43.9 row). */
  readonly totals = computed<DomainRow | null>(() => {
    const dims = this.outcomes()?.dimensions ?? [];
    const baselineVals = dims.filter((d) => d.baselineAverage !== null);
    const latestVals = dims.filter((d) => d.latestAverage !== null);
    if (baselineVals.length === 0 && latestVals.length === 0) return null;
    const baseline = baselineVals.reduce((sum, d) => sum + d.baselineAverage!, 0);
    const latest = latestVals.reduce((sum, d) => sum + d.latestAverage!, 0);
    // Only meaningful when every domain has both cohorts' averages.
    const comparable = baselineVals.length === dims.length && latestVals.length === dims.length;
    const delta = comparable ? latest - baseline : null;
    return {
      label: 'Total average score',
      baseline: baselineVals.length > 0 ? baseline.toFixed(1) : '—',
      latest: latestVals.length > 0 ? latest.toFixed(1) : '—',
      change: delta !== null ? this.signed(delta) : '—',
      trend: delta === null ? 0 : Math.sign(Number(delta.toFixed(1))),
    };
  });

  readonly subtitle = computed<string>(() => {
    const o = this.outcomes();
    if (!o) return '';
    return `Baseline vs most recent · ${o.guestsWithFollowUp} guest${o.guestsWithFollowUp === 1 ? '' : 's'} with follow-up scores`;
  });

  private signed(value: number): string {
    const rounded = value.toFixed(1);
    return value >= 0 ? `+${rounded}` : rounded;
  }
}

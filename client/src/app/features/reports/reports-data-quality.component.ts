import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { Subscription } from 'rxjs';
import { DataQualityIssueDto, DataQualityReportDto } from '../../core/api-models';
import { ReportPeriod, ReportsApiService } from '../../core/reports-api.service';
import { formatPeriod } from './report-meta';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { Permissions } from '../../core/permissions';
import { isGuestSegment } from '../../core/guest-segments';

interface IssueRow extends DataQualityIssueDto {
  /** Share of all guests affected, e.g. "12%". */
  share: string;
}

/**
 * "Data Quality" tab — Desktop48 (project/screens/Components.bundle.js lines
 * 107266-109360): KPI tiles + "Data quality issues" table. The issue list is
 * backend-defined (key/label/count), so the source's hard-coded per-issue
 * descriptions are omitted. Each row's "View guests" opens the guest list with the
 * issue key as its segment (GET /guests?segment=…) — the Desktop70 drill-down.
 *
 * The audit covers the records registered in the reporting period, and the drill-down carries
 * the same registration window (?registeredFrom=…&registeredTo=…) so its list matches the count.
 */
@Component({
  selector: 'app-reports-data-quality',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './reports-data-quality.component.html',
  styleUrl: './reports-data-quality.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportsDataQualityComponent {
  /** Issue rows link to the affected guests when the viewer can open the guest list. */
  protected readonly canViewGuests = inject(AuthService).hasPermission(Permissions.Guests.View);

  protected hasSegment(key: string): boolean {
    return isGuestSegment(key);
  }

  private readonly reportsApi = inject(ReportsApiService);

  /** The Reports screen's applied reporting period (yyyy-MM-dd). */
  readonly from = input.required<string>();
  readonly to = input.required<string>();
  readonly periodLabel = computed(() => formatPeriod(this.from(), this.to()));

  /** Query params for a row's "View guests" — the issue's segment within the same registration window. */
  protected drillParams(key: string): Record<string, string> {
    return { segment: key, registeredFrom: this.from(), registeredTo: this.to() };
  }

  /** A tile's drill-through: the issue's guests, or (no key) every guest audited — null when not clickable. */
  protected tileLink(count: number | null, key?: string): Record<string, string> | null {
    if (!this.canViewGuests || !count) return null;
    if (key === undefined) return { registeredFrom: this.from(), registeredTo: this.to() };
    return this.hasSegment(key) ? this.drillParams(key) : null;
  }

  readonly data = signal<DataQualityReportDto | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly rows = computed<IssueRow[]>(() => {
    const report = this.data();
    if (!report) return [];
    return [...report.issues]
      .sort((a, b) => b.count - a.count)
      .map((issue) => ({
        ...issue,
        share:
          report.totalGuests > 0
            ? `${Math.round((issue.count / report.totalGuests) * 100)}%`
            : '—',
      }));
  });

  /** The design's first three KPI tiles, filled with the largest real issues. */
  readonly tileIssues = computed<IssueRow[]>(() => this.rows().slice(0, 3));

  readonly totalGuests = computed<number | null>(() => this.data()?.totalGuests ?? null);

  constructor() {
    // Reload whenever a new period is applied; the cleanup drops a still-running older request.
    effect((onCleanup) => {
      const period: ReportPeriod = { from: this.from(), to: this.to() };
      const sub = untracked(() => this.load(period));
      onCleanup(() => sub.unsubscribe());
    });
  }

  private load(period: ReportPeriod): Subscription {
    this.loading.set(true);
    this.error.set(null);
    return this.reportsApi.getDataQuality(period).subscribe({
      next: (data) => {
        this.data.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.data.set(null);
        this.error.set(err?.message ?? 'Unable to load data-quality report.');
        this.loading.set(false);
      },
    });
  }
}

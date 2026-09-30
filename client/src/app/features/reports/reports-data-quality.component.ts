import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DataQualityIssueDto, DataQualityReportDto } from '../../core/api-models';
import { ReportsApiService } from '../../core/reports-api.service';
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
 */
@Component({
  selector: 'app-reports-data-quality',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './reports-data-quality.component.html',
  styleUrl: './reports-data-quality.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportsDataQualityComponent implements OnInit {
  /** Issue rows link to the affected guests when the viewer can open the guest list. */
  protected readonly canViewGuests = inject(AuthService).hasPermission(Permissions.Guests.View);

  protected hasSegment(key: string): boolean {
    return isGuestSegment(key);
  }

  private readonly reportsApi = inject(ReportsApiService);

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

  ngOnInit(): void {
    this.loading.set(true);
    this.error.set(null);
    this.reportsApi.getDataQuality().subscribe({
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

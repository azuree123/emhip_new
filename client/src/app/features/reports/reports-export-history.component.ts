import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { Subscription } from 'rxjs';
import { ExportHistoryItemDto } from '../../core/api-models';
import { ReportPeriod, ReportsApiService } from '../../core/reports-api.service';
import { formatPeriod, shortDay } from './report-meta';

interface ExportRow extends ExportHistoryItemDto {
  period: string;
  exportedAtLabel: string;
}

/**
 * "Export History" tab — Desktop49 (project/screens/Components.bundle.js lines
 * 111699-113643). Exports are logged, not stored, so the source's per-row
 * "Download" button and file-size column are omitted — re-run the export from
 * the header instead. Lists the exports taken during the reporting period.
 */
@Component({
  selector: 'app-reports-export-history',
  standalone: true,
  templateUrl: './reports-export-history.component.html',
  styleUrl: './reports-export-history.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportsExportHistoryComponent {
  private readonly reportsApi = inject(ReportsApiService);

  /** The Reports screen's applied reporting period (yyyy-MM-dd). */
  readonly from = input.required<string>();
  readonly to = input.required<string>();
  readonly periodLabel = computed(() => formatPeriod(this.from(), this.to()));

  readonly data = signal<ExportHistoryItemDto[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly rows = computed<ExportRow[]>(() =>
    this.data().map((item) => ({
      ...item,
      period: `${shortDay(item.fromDate)} – ${shortDay(item.toDate)}`,
      exportedAtLabel: new Date(item.exportedAt).toLocaleString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }),
    })),
  );

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
    return this.reportsApi.getExportHistory(period).subscribe({
      next: (items) => {
        this.data.set(items);
        this.loading.set(false);
      },
      error: (err) => {
        this.data.set([]);
        this.error.set(err?.message ?? 'Unable to load export history.');
        this.loading.set(false);
      },
    });
  }
}

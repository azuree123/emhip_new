import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ExportHistoryItemDto } from '../../core/api-models';
import { ReportsApiService } from '../../core/reports-api.service';
import { shortDay } from './report-meta';

interface ExportRow extends ExportHistoryItemDto {
  period: string;
  exportedAtLabel: string;
}

/**
 * "Export History" tab — Desktop49 (project/screens/Components.bundle.js lines
 * 111699-113643). Exports are logged, not stored, so the source's per-row
 * "Download" button and file-size column are omitted — re-run the export from
 * the header instead.
 */
@Component({
  selector: 'app-reports-export-history',
  standalone: true,
  templateUrl: './reports-export-history.component.html',
  styleUrl: './reports-export-history.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportsExportHistoryComponent implements OnInit {
  private readonly reportsApi = inject(ReportsApiService);

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

  ngOnInit(): void {
    this.loading.set(true);
    this.error.set(null);
    this.reportsApi.getExportHistory().subscribe({
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

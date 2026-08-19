import { ChangeDetectionStrategy, Component, OnInit, inject, input, output, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { ReportsApiService } from '../../core/reports-api.service';
import { WORKBOOK_SHEETS, downloadBlob, toIsoDate } from './report-meta';

/** Which download the user pressed — only one runs at a time. */
type ExportFormat = 'xlsx' | 'csv';

/**
 * Export dialog — adapted from the "Export to Excel" modal in Desktop75
 * (project/screens/Components.bundle.js lines 87039-92043). Both real export
 * endpoints are offered for the chosen reporting period: the multi-sheet Excel
 * workbook (spec §5.4) and the single-table CSV. The dialog keeps the design's
 * chrome (dimmed overlay, gray header bar, reporting-period fields, primary
 * download action) around them.
 */
@Component({
  selector: 'app-reports-export-dialog',
  standalone: true,
  templateUrl: './reports-export-dialog.component.html',
  styleUrl: './reports-export-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportsExportDialogComponent implements OnInit {
  private readonly reportsApi = inject(ReportsApiService);

  /** Initial reporting period — seeded from the report page's applied range. */
  readonly from = input.required<string>();
  readonly to = input.required<string>();
  readonly closed = output<void>();

  readonly maxDate = toIsoDate(new Date());
  readonly workbookSheets = WORKBOOK_SHEETS;
  readonly draftFrom = signal('');
  readonly draftTo = signal('');
  /** The format currently downloading, or null when idle. */
  readonly busyFormat = signal<ExportFormat | null>(null);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.draftFrom.set(this.from());
    this.draftTo.set(this.to());
  }

  onFromChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (value) this.draftFrom.set(value);
  }

  onToChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (value) this.draftTo.set(value);
  }

  invalid(): boolean {
    return !this.draftFrom() || !this.draftTo() || this.draftFrom() > this.draftTo();
  }

  busy(): boolean {
    return this.busyFormat() !== null;
  }

  /** Multi-sheet workbook: summary, pathways, caseload, DIALOG outcomes, data quality. */
  downloadExcel(): void {
    const from = this.draftFrom();
    const to = this.draftTo();
    this.run('xlsx', this.reportsApi.exportWorkbook(from, to), `emhip-report-${from}-to-${to}.xlsx`);
  }

  downloadCsv(): void {
    const from = this.draftFrom();
    const to = this.draftTo();
    this.run('csv', this.reportsApi.exportCsv(from, to), `pathway-report-${from}-to-${to}.csv`);
  }

  private run(format: ExportFormat, request: Observable<Blob>, filename: string): void {
    if (this.invalid() || this.busy()) return;
    this.busyFormat.set(format);
    this.error.set(null);
    request.subscribe({
      next: (blob) => {
        downloadBlob(blob, filename);
        this.busyFormat.set(null);
        this.closed.emit();
      },
      error: () => {
        this.busyFormat.set(null);
        this.error.set('Could not export the report. Please try again.');
      },
    });
  }
}

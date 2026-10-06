import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { ReportsApiService } from '../../core/reports-api.service';
import {
  DemographicFilterValue,
  EMPTY_DEMOGRAPHIC_FILTERS,
  demographicFilterCount,
  demographicFilterParams,
} from '../../shared/demographic-filters.component';
import { WORKBOOK_SHEETS, cohortLabel, downloadBlob, formatPeriod } from './report-meta';

/** Which download the user pressed — only one runs at a time. */
type ExportFormat = 'xlsx' | 'csv';

/**
 * Export dialog — adapted from the "Export to Excel" modal in Desktop75
 * (project/screens/Components.bundle.js lines 87039-92043). Both real export
 * endpoints are offered for the Reports screen's applied reporting period: the
 * multi-sheet Excel workbook (spec §5.4) and the single-table CSV. The period is
 * shown read-only — it is the same one every tab is showing, so an export always
 * matches the screen; it is changed with the filter row, not here. The dialog keeps
 * the design's chrome (dimmed overlay, gray header bar, reporting period, primary
 * download action) around them.
 */
@Component({
  selector: 'app-reports-export-dialog',
  standalone: true,
  templateUrl: './reports-export-dialog.component.html',
  styleUrl: './reports-export-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportsExportDialogComponent {
  private readonly reportsApi = inject(ReportsApiService);

  /** The Reports screen's applied reporting period (yyyy-MM-dd) — what both exports cover. */
  readonly from = input.required<string>();
  readonly to = input.required<string>();
  readonly periodLabel = computed(() => formatPeriod(this.from(), this.to()));
  /** The DIALOG Outcomes tab's demographic cohort — applied to the workbook's DIALOG outcomes sheet. */
  readonly dialogCohort = input<DemographicFilterValue>(EMPTY_DEMOGRAPHIC_FILTERS);
  readonly closed = output<void>();

  readonly dialogCohortActive = computed(() => demographicFilterCount(this.dialogCohort()) > 0);
  readonly dialogCohortLabel = computed(() => cohortLabel(this.dialogCohort()));

  readonly workbookSheets = WORKBOOK_SHEETS;
  /** The format currently downloading, or null when idle. */
  readonly busyFormat = signal<ExportFormat | null>(null);
  readonly error = signal<string | null>(null);

  invalid(): boolean {
    return !this.from() || !this.to() || this.from() > this.to();
  }

  busy(): boolean {
    return this.busyFormat() !== null;
  }

  /** Multi-sheet workbook (WORKBOOK_SHEETS), DIALOG outcomes sheet for the DIALOG tab's cohort. */
  downloadExcel(): void {
    const from = this.from();
    const to = this.to();
    const cohort = demographicFilterParams(this.dialogCohort());
    this.run('xlsx', this.reportsApi.exportWorkbook(from, to, cohort), `emhip-report-${from}-to-${to}.xlsx`);
  }

  downloadCsv(): void {
    const from = this.from();
    const to = this.to();
    this.run('csv', this.reportsApi.exportCsv(from, to), `emhip-guests-${from}-to-${to}.csv`);
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

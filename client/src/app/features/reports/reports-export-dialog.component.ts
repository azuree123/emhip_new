import { ChangeDetectionStrategy, Component, OnInit, inject, input, output, signal } from '@angular/core';
import { ReportsApiService } from '../../core/reports-api.service';
import { toIsoDate } from './report-meta';

/**
 * Export dialog — adapted from the "Export to Excel" modal in Desktop75
 * (project/screens/Components.bundle.js lines 87039-92043). The backend only
 * exposes a CSV export of the pathway/activity report for a date range, so the
 * source's Excel format option and its six-worksheet checklist are omitted;
 * the dialog keeps the design's chrome (dimmed overlay, gray header bar,
 * reporting-period fields, primary download action) around the real export.
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
  readonly draftFrom = signal('');
  readonly draftTo = signal('');
  readonly busy = signal(false);
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

  download(): void {
    if (this.invalid() || this.busy()) return;
    const from = this.draftFrom();
    const to = this.draftTo();
    this.busy.set(true);
    this.error.set(null);
    this.reportsApi.exportCsv(from, to).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `pathway-report-${from}-to-${to}.csv`;
        anchor.click();
        URL.revokeObjectURL(url);
        this.busy.set(false);
        this.closed.emit();
      },
      error: () => {
        this.busy.set(false);
        this.error.set('Could not export the report. Please try again.');
      },
    });
  }
}

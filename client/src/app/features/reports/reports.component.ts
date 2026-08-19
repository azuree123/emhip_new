import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { BreakdownSliceDto, DialogOutcomesReportDto, PathwayReportDto } from '../../core/api-models';
import { ReportsApiService } from '../../core/reports-api.service';
import { WORKBOOK_SHEETS, downloadBlob, toIsoDate } from './report-meta';
import { ReportsCaseloadComponent } from './reports-caseload.component';
import { ReportsCpnActivityComponent } from './reports-cpn-activity.component';
import { ReportsDataQualityComponent } from './reports-data-quality.component';
import { ReportsDialogOutcomesComponent } from './reports-dialog-outcomes.component';
import { ReportsExportDialogComponent } from './reports-export-dialog.component';
import { ReportsExportHistoryComponent } from './reports-export-history.component';
import { ReportsGuestReportComponent } from './reports-guest-report.component';
import { ReportsOverviewComponent } from './reports-overview.component';
import { ReportsPathwayAnalyticsComponent } from './reports-pathway-analytics.component';

type ReportTabId =
  | 'overview'
  | 'guest-report'
  | 'pathway-analytics'
  | 'caseload'
  | 'dialog-outcomes'
  | 'data-quality'
  | 'cpn-activity'
  | 'export-history';

interface ReportTab {
  id: ReportTabId;
  label: string;
}

/**
 * "Reports & Analytics" — ported from the report screens in
 * project/screens/Components.bundle.js: Desktop72-75 (overview + export flow),
 * Desktop66 (guest report), Desktop45 (pathway analytics), Desktop67 (caseload),
 * Desktop47 (DIALOG outcomes), Desktop48 (data quality), Desktop86 (CPN
 * activity) and Desktop49 (export history). The sidebar/header chrome is
 * rendered by the shared shell; this component owns the content area: header
 * card with section tabs and date filters, plus the per-tab report bodies.
 */
@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    ReportsOverviewComponent,
    ReportsGuestReportComponent,
    ReportsPathwayAnalyticsComponent,
    ReportsCaseloadComponent,
    ReportsDialogOutcomesComponent,
    ReportsDataQualityComponent,
    ReportsCpnActivityComponent,
    ReportsExportHistoryComponent,
    ReportsExportDialogComponent,
  ],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportsComponent implements OnInit {
  private readonly reportsApi = inject(ReportsApiService);

  readonly tabs: ReportTab[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'guest-report', label: 'Guest Report' },
    { id: 'pathway-analytics', label: 'Pathway Analytics' },
    { id: 'caseload', label: 'Caseload Reports' },
    { id: 'dialog-outcomes', label: 'DIALOG Outcomes' },
    { id: 'data-quality', label: 'Data Quality' },
    { id: 'cpn-activity', label: 'CPN Activity' },
    { id: 'export-history', label: 'Export History' },
  ];

  readonly activeTab = signal<ReportTabId>('overview');

  readonly maxDate = toIsoDate(new Date());
  readonly todayLabel = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Applied range (drives the date-ranged reports) vs draft range (bound to the
  // inputs until the design's red "Apply" button is pressed — Desktop74 filter row).
  readonly from = signal<string>(this.monthsAgoIso(6));
  readonly to = signal<string>(this.maxDate);
  readonly draftFrom = signal<string>(this.from());
  readonly draftTo = signal<string>(this.to());
  readonly draftInvalid = computed(() => this.draftFrom() > this.draftTo());

  /** The date filter row only applies to the date-ranged tabs. */
  readonly showFilters = computed(
    () => this.activeTab() === 'overview' || this.activeTab() === 'cpn-activity',
  );

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly report = signal<PathwayReportDto | null>(null);

  readonly outcomes = signal<DialogOutcomesReportDto | null>(null);
  readonly outcomesLoading = signal(false);
  readonly outcomesError = signal<string | null>(null);

  readonly referralSources = signal<BreakdownSliceDto[]>([]);
  readonly referralSourcesLoading = signal(false);

  /** Caseload "View" drill-down: preselects this CMHW on the Guest Report tab. */
  readonly guestReportCmhw = signal('');

  readonly exportOpen = signal(false);

  /** Header "Export Excel" — the multi-sheet workbook for the applied date range. */
  readonly workbookSheets = WORKBOOK_SHEETS;
  readonly workbookSheetList = WORKBOOK_SHEETS.join(', ');
  readonly excelBusy = signal(false);
  readonly excelError = signal<string | null>(null);

  ngOnInit(): void {
    this.loadReport();
    this.loadOutcomes();
    this.loadReferralSources();
  }

  selectTab(id: ReportTabId): void {
    this.guestReportCmhw.set('');
    this.activeTab.set(id);
  }

  /** Caseload row "View" — open the Guest Report tab filtered to that CMHW. */
  openCmhwGuests(staffId: string): void {
    this.guestReportCmhw.set(staffId);
    this.activeTab.set('guest-report');
  }

  onDraftFromChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (value) this.draftFrom.set(value);
  }

  onDraftToChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (value) this.draftTo.set(value);
  }

  applyDates(): void {
    if (this.draftInvalid()) return;
    this.from.set(this.draftFrom());
    this.to.set(this.draftTo());
    this.loadReport();
  }

  /**
   * Downloads the multi-sheet Excel workbook (summary, pathways, caseload, DIALOG
   * outcomes, data quality — spec §5.4) for the currently applied date range.
   */
  exportExcel(): void {
    if (this.excelBusy()) return;
    const from = this.from();
    const to = this.to();
    this.excelBusy.set(true);
    this.excelError.set(null);
    this.reportsApi.exportWorkbook(from, to).subscribe({
      next: (blob) => {
        downloadBlob(blob, `emhip-report-${from}-to-${to}.xlsx`);
        this.excelBusy.set(false);
      },
      error: () => {
        this.excelBusy.set(false);
        this.excelError.set('Could not build the Excel workbook. Please try again.');
      },
    });
  }

  loadReport(): void {
    this.loading.set(true);
    this.error.set(null);
    this.reportsApi.getPathwayReport(this.from(), this.to()).subscribe({
      next: (report) => {
        this.report.set(report);
        this.loading.set(false);
      },
      error: (err) => {
        this.report.set(null);
        this.error.set(err?.message ?? 'Unable to load report data.');
        this.loading.set(false);
      },
    });
  }

  loadOutcomes(): void {
    this.outcomesLoading.set(true);
    this.outcomesError.set(null);
    this.reportsApi.getDialogOutcomes().subscribe({
      next: (outcomes) => {
        this.outcomes.set(outcomes);
        this.outcomesLoading.set(false);
      },
      error: (err) => {
        this.outcomes.set(null);
        this.outcomesError.set(err?.message ?? 'Unable to load DIALOG outcome data.');
        this.outcomesLoading.set(false);
      },
    });
  }

  loadReferralSources(): void {
    this.referralSourcesLoading.set(true);
    this.reportsApi.getReferralSources().subscribe({
      next: (slices) => {
        this.referralSources.set(slices);
        this.referralSourcesLoading.set(false);
      },
      error: () => {
        this.referralSources.set([]);
        this.referralSourcesLoading.set(false);
      },
    });
  }

  private monthsAgoIso(months: number): string {
    const d = new Date();
    d.setMonth(d.getMonth() - months);
    return toIsoDate(d);
  }
}

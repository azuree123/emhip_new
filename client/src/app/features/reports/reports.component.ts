import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DialogOutcomesReportDto, PathwayReportDto } from '../../core/api-models';
import { ReportsApiService } from '../../core/reports-api.service';
import { toIsoDate } from './report-meta';
import { ReportsDialogOutcomesComponent } from './reports-dialog-outcomes.component';
import { ReportsExportDialogComponent } from './reports-export-dialog.component';
import { ReportsGuestReportComponent } from './reports-guest-report.component';
import { ReportsOverviewComponent } from './reports-overview.component';

/** Tabs with a real data source behind them. */
type ReportTabId = 'overview' | 'guest-report' | 'dialog-outcomes';

interface ReportTab {
  /** null = drawn for visual parity with the design but disabled (no data source yet). */
  id: ReportTabId | null;
  label: string;
}

/**
 * "Reports & Analytics" — ported from the report screens Desktop72-75 (overview +
 * export flow), Desktop66 (guest report) and Desktop47 (DIALOG outcomes) in
 * project/screens/Components.bundle.js lines 72729-113643. The sidebar/header
 * chrome is rendered by the shared shell; this component owns the content area:
 * header card with section tabs and date filters, plus the per-tab report bodies.
 *
 * Pathway Analytics / Caseload Reports / Data Quality / CPN Activity / Export
 * History are drawn as disabled tabs only — the API has no endpoints for those
 * screens (Desktop45/67/48/86/49) yet.
 */
@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    ReportsOverviewComponent,
    ReportsGuestReportComponent,
    ReportsDialogOutcomesComponent,
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
    { id: null, label: 'Pathway Analytics' },
    { id: null, label: 'Caseload Reports' },
    { id: 'dialog-outcomes', label: 'DIALOG Outcomes' },
    { id: null, label: 'Data Quality' },
    { id: null, label: 'CPN Activity' },
    { id: null, label: 'Export History' },
  ];

  readonly activeTab = signal<ReportTabId>('overview');

  readonly maxDate = toIsoDate(new Date());
  readonly todayLabel = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Applied range (drives the loaded report) vs draft range (bound to the inputs
  // until the design's red "Apply" button is pressed — Desktop74 filter row).
  readonly from = signal<string>(this.monthsAgoIso(6));
  readonly to = signal<string>(this.maxDate);
  readonly draftFrom = signal<string>(this.from());
  readonly draftTo = signal<string>(this.to());
  readonly draftInvalid = computed(() => this.draftFrom() > this.draftTo());

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly report = signal<PathwayReportDto | null>(null);

  readonly outcomes = signal<DialogOutcomesReportDto | null>(null);
  readonly outcomesLoading = signal(false);
  readonly outcomesError = signal<string | null>(null);

  readonly exportOpen = signal(false);

  ngOnInit(): void {
    this.loadReport();
    this.loadOutcomes();
  }

  selectTab(id: ReportTabId | null): void {
    if (id) this.activeTab.set(id);
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

  private monthsAgoIso(months: number): string {
    const d = new Date();
    d.setMonth(d.getMonth() - months);
    return toIsoDate(d);
  }
}

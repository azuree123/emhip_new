import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { BreakdownSliceDto, DialogOutcomesReportDto, PathwayReportDto } from '../../core/api-models';
import { ReportPeriod, ReportsApiService } from '../../core/reports-api.service';
import { AuthService } from '../../core/auth.service';
import { Permissions } from '../../core/permissions';
import {
  DemographicFilterValue,
  EMPTY_DEMOGRAPHIC_FILTERS,
  demographicFilterCount,
  demographicFilterParams,
} from '../../shared/demographic-filters.component';
import { WORKBOOK_SHEETS, cohortLabel, downloadBlob, formatPeriod, toIsoDate } from './report-meta';
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

/** Room left beside a revealed tab so it clears the scroll arrow and edge fade (px) — the fade is 64px wide. */
const TAB_REVEAL_INSET = 64;

/**
 * "Reports & Analytics" — ported from the report screens in
 * project/screens/Components.bundle.js: Desktop72-75 (overview + export flow),
 * Desktop66 (guest report), Desktop45 (pathway analytics), Desktop67 (caseload),
 * Desktop47 (DIALOG outcomes), Desktop48 (data quality), Desktop86 (CPN
 * activity) and Desktop49 (export history). The sidebar/header chrome is
 * rendered by the shared shell; this component owns the content area: header
 * card with section tabs and date filters, plus the per-tab report bodies.
 *
 * The From / To filter is the one reporting period for the whole screen: it shows on every
 * tab, survives tab switches, drives every tab's figures (each tab says which of its figures
 * are current rather than period-based) and is the period both exports are taken for.
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
  /** Export to Excel / CSV need reports.export — hidden rather than failing with a 403. */
  protected readonly canExport = inject(AuthService).hasPermission(Permissions.Reports.Export);
  private readonly tabBar = viewChild<ElementRef<HTMLElement>>('tabBar');

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

  // The tab bar scrolls sideways when the sections don't fit (1280px and narrower); these
  // drive the arrow buttons and edge fades that show more sections exist in that direction.
  readonly canScrollStart = signal(false);
  readonly canScrollEnd = signal(false);

  readonly maxDate = toIsoDate(new Date());
  readonly todayLabel = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Applied range (drives every tab and the exports) vs draft range (bound to the
  // inputs until the design's red "Apply" button is pressed — Desktop74 filter row).
  readonly from = signal<string>(this.monthsAgoIso(6));
  readonly to = signal<string>(this.maxDate);
  readonly draftFrom = signal<string>(this.from());
  readonly draftTo = signal<string>(this.to());
  readonly draftInvalid = computed(() => this.draftFrom() > this.draftTo());
  /** The inputs hold dates that haven't been applied yet. */
  readonly draftPending = computed(() => this.draftFrom() !== this.from() || this.draftTo() !== this.to());
  readonly periodLabel = computed(() => formatPeriod(this.from(), this.to()));

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

  /**
   * DIALOG Outcomes tab's demographic cohort. Held here so it survives tab switches and
   * flows into the Excel export, whose DIALOG outcomes sheet is computed for it.
   */
  readonly dialogCohort = signal<DemographicFilterValue>(EMPTY_DEMOGRAPHIC_FILTERS);
  readonly dialogCohortActive = computed(() => demographicFilterCount(this.dialogCohort()) > 0);
  readonly dialogCohortLabel = computed(() => cohortLabel(this.dialogCohort()));

  readonly exportOpen = signal(false);

  // The Overview's three requests, cancelled when a newer period is applied so a slow response
  // for the old period can't overwrite the new figures.
  private reportSub?: Subscription;
  private outcomesSub?: Subscription;
  private referralSourcesSub?: Subscription;

  /** Header "Export Excel" — the multi-sheet workbook for the applied date range. */
  readonly workbookSheets = WORKBOOK_SHEETS;
  readonly workbookSheetList = WORKBOOK_SHEETS.join(', ');
  readonly excelBusy = signal(false);
  readonly excelError = signal<string | null>(null);

  constructor() {
    const destroyRef = inject(DestroyRef);
    // Re-measure whenever the bar or a tab changes size (window resize, sidebar collapse,
    // web font swap) — none of those fire a scroll event — and keep the active tab in view,
    // since narrowing the bar can leave it under the fade.
    afterNextRender(() => {
      const bar = this.tabBar()?.nativeElement;
      if (!bar) return;
      this.updateTabOverflow();
      if (typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver(() => {
        this.revealTab(this.activeTab(), 'instant');
        this.updateTabOverflow();
      });
      observer.observe(bar);
      for (const tab of Array.from(bar.children)) observer.observe(tab);
      destroyRef.onDestroy(() => observer.disconnect());
    });
    destroyRef.onDestroy(() => {
      this.reportSub?.unsubscribe();
      this.outcomesSub?.unsubscribe();
      this.referralSourcesSub?.unsubscribe();
    });
  }

  ngOnInit(): void {
    this.loadOverview();
  }

  selectTab(id: ReportTabId): void {
    this.guestReportCmhw.set('');
    this.activeTab.set(id);
    this.revealTab(id);
  }

  /** Caseload row "View" — open the Guest Report tab filtered to that CMHW. */
  openCmhwGuests(staffId: string): void {
    this.guestReportCmhw.set(staffId);
    this.activeTab.set('guest-report');
    this.revealTab('guest-report');
  }

  /** Scroll/resize handler — shows an arrow + fade only on a side with hidden tabs. */
  updateTabOverflow(): void {
    const bar = this.tabBar()?.nativeElement;
    if (!bar) return;
    const maxScroll = bar.scrollWidth - bar.clientWidth;
    this.canScrollStart.set(bar.scrollLeft > 1);
    this.canScrollEnd.set(bar.scrollLeft < maxScroll - 1);
  }

  /** Arrow buttons — page the bar by most of its visible width. */
  scrollTabs(direction: -1 | 1): void {
    const bar = this.tabBar()?.nativeElement;
    if (!bar) return;
    bar.scrollBy({ left: direction * Math.max(bar.clientWidth * 0.7, 120), behavior: 'smooth' });
  }

  /**
   * Scrolls the bar just enough that the tab sits clear of the arrow and fade on either
   * side — used for the active tab and for tabs reached by keyboard focus.
   */
  revealTab(id: ReportTabId, behavior: ScrollBehavior = 'smooth'): void {
    const bar = this.tabBar()?.nativeElement;
    const tab = bar?.querySelector<HTMLElement>(`[data-tab="${id}"]`);
    if (!bar || !tab) return;
    // offsetLeft is relative to the (positioned) bar's content, independent of its scroll.
    const start = tab.offsetLeft - TAB_REVEAL_INSET;
    const end = tab.offsetLeft + tab.offsetWidth + TAB_REVEAL_INSET;
    if (start < bar.scrollLeft) {
      bar.scrollTo({ left: Math.max(start, 0), behavior });
    } else if (end > bar.scrollLeft + bar.clientWidth) {
      // A tab wider than the visible bar lines up with its start rather than its end.
      bar.scrollTo({ left: Math.min(end - bar.clientWidth, Math.max(start, 0)), behavior });
    }
  }

  onDraftFromChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (value) this.draftFrom.set(value);
  }

  onDraftToChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (value) this.draftTo.set(value);
  }

  /** Applies the drafted period to every tab — the open tab reloads through its from/to inputs. */
  applyDates(): void {
    if (this.draftInvalid()) return;
    this.from.set(this.draftFrom());
    this.to.set(this.draftTo());
    this.loadOverview();
  }

  /**
   * Downloads the multi-sheet Excel workbook (WORKBOOK_SHEETS — spec §5.4) for the
   * currently applied date range — every sheet for that period — with the DIALOG outcomes
   * sheet for the DIALOG tab's cohort.
   */
  exportExcel(): void {
    if (this.excelBusy()) return;
    const from = this.from();
    const to = this.to();
    this.excelBusy.set(true);
    this.excelError.set(null);
    this.reportsApi.exportWorkbook(from, to, demographicFilterParams(this.dialogCohort())).subscribe({
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

  /** The Overview's figures — held here (not in the tab) so they survive tab switches. */
  private loadOverview(): void {
    const period: ReportPeriod = { from: this.from(), to: this.to() };
    this.loadReport(period);
    this.loadOutcomes(period);
    this.loadReferralSources(period);
  }

  private loadReport(period: ReportPeriod): void {
    this.reportSub?.unsubscribe();
    this.loading.set(true);
    this.error.set(null);
    this.reportSub = this.reportsApi.getPathwayReport(period.from, period.to).subscribe({
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

  private loadOutcomes(period: ReportPeriod): void {
    this.outcomesSub?.unsubscribe();
    this.outcomesLoading.set(true);
    this.outcomesError.set(null);
    this.outcomesSub = this.reportsApi.getDialogOutcomes(period).subscribe({
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

  private loadReferralSources(period: ReportPeriod): void {
    this.referralSourcesSub?.unsubscribe();
    this.referralSourcesLoading.set(true);
    this.referralSourcesSub = this.reportsApi.getReferralSources(period).subscribe({
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

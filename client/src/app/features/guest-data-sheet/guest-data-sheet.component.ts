import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, firstValueFrom, of } from 'rxjs';
import { catchError, debounceTime } from 'rxjs/operators';

import { GuestsApiService } from '../../core/guests-api.service';
import { GuestListItemDto, GuestPathway, GuestStatus } from '../../core/api-models';
import {
  DemographicFilterValue,
  DemographicFiltersComponent,
  EMPTY_DEMOGRAPHIC_FILTERS,
  demographicFilterParams,
} from '../../shared/demographic-filters.component';
import { StaffPickerComponent } from '../../shared/staff-picker.component';
import { AGE_BANDS } from '../../core/api-models';
import { CLINICAL_PATHWAY_OPTIONS, clinicalPathwayLabel } from '../../core/demographic-options';
import { GuestSegment, guestSegmentLabel, isGuestSegment } from '../../core/guest-segments';
import { formatPeriod } from '../reports/report-meta';

/** yyyy-MM-dd, as the Reports screen's period is passed on its drill-throughs. */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** A from/to pair of drill-through query params, or null unless both are valid dates. */
function isoRange(from: string, to: string): { from: string; to: string } | null {
  return ISO_DATE.test(from) && ISO_DATE.test(to) ? { from, to } : null;
}

type StatusFilterValue = GuestStatus | 'All';
type PathwayFilterValue = GuestPathway | 'All';
/** Number of days sent as lastActivityDays, or 'All' for no filter. */
type ActivityFilterValue = 'All' | '1' | '7' | '30';

const PAGE_SIZE = 50;
/** How close (in rendered rows) to the bottom of the loaded set before we fetch the next page. */
const PREFETCH_THRESHOLD = 15;

/** Page size used while walking the keyset pages for a CSV export. */
const EXPORT_PAGE_SIZE = 200;
/** Hard cap on exported rows — if reached, we still download what was fetched. */
const EXPORT_ROW_CAP = 2000;

/**
 * Engagement statuses per spec §4.7. Urgency used to sit in this list; it is now a separate
 * flag (GuestListItemDto.isUrgent) driving the "Urgent only" chip, so it is not a status.
 */
const STATUS_OPTIONS: { value: StatusFilterValue; label: string }[] = [
  // "Status" doubles as the closed-state label of the native select, matching the design's
  // filter chip; selecting it clears the filter.
  { value: 'All', label: 'Status' },
  { value: 'New', label: 'New' },
  { value: 'Active', label: 'Active' },
  { value: 'OnHold', label: 'Inactive' },
];

/** The three clinical pathways — the only pathways. */
const PATHWAY_OPTIONS: { value: PathwayFilterValue; label: string }[] = [
  // As with Status, the chip name doubles as the closed-state/clear option label.
  { value: 'All', label: 'Pathway' },
  ...CLINICAL_PATHWAY_OPTIONS,
];

const ACTIVITY_OPTIONS: { value: ActivityFilterValue; label: string }[] = [
  { value: 'All', label: 'Last Activity' },
  { value: '1', label: 'Today' },
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
];

/**
 * Guest Data Sheet — the searchable/filterable guest list.
 *
 * The backend can hold hundreds of thousands of guest rows across hub history, so this screen
 * never loads "all guests" and never uses skip/offset paging. It fetches one keyset page at a
 * time from GuestsApiService.getGuestList({ cursor, ... }) and renders the accumulated rows
 * through a CDK virtual-scroll viewport so the DOM only ever holds the rows currently on
 * screen. Scrolling near the bottom of what's loaded — or pressing "Load more" — fetches the
 * next page by passing the opaque `nextCursor` straight back to the API.
 *
 * All filters (search, status, pathway, assigned CMHW, last activity, urgent-only, and the
 * demographic drawer's ethnicity / age group / gender / country of origin — the same
 * "Additional Filters" drawer the Reports → Guest Report tab uses) are applied server-side;
 * changing any of them resets the keyset list and reloads page one.
 *
 * Layout/styling follow the Figma GuestDataSheet3 frame (Components.bundle.js lines
 * 9051-13375, 1440px design).
 */
@Component({
  selector: 'app-guest-data-sheet',
  standalone: true,
  imports: [ScrollingModule, RouterLink, FormsModule, StaffPickerComponent, DemographicFiltersComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './guest-data-sheet.component.html',
  styleUrl: './guest-data-sheet.component.scss',
})
export class GuestDataSheetComponent {
  private readonly guestsApi = inject(GuestsApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly guests = signal<GuestListItemDto[]>([]);
  protected readonly loading = signal(false);
  protected readonly loadingMore = signal(false);
  protected readonly hasMore = signal(true);
  /**
   * Total rows matching the current filters — the API sends it on the first (cursorless)
   * page only, so the value is carried forward across "load more" pages and cleared
   * whenever the filters reset. Null until the first page answers (or on older payloads).
   */
  protected readonly totalCount = signal<number | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly statusFilter = signal<StatusFilterValue>('All');
  /**
   * "Urgent only" chip, sent as the `urgent` query param. Urgency is a flag rather than a
   * status (spec §3.3), so it combines with the status filter — On hold + urgent is a real,
   * findable combination.
   */
  protected readonly urgentOnly = signal(false);
  protected readonly pathwayFilter = signal<PathwayFilterValue>('All');
  /** Assigned CMHW filter — a staff id, or null for "all staff" (the picker's cleared state). */
  protected readonly cmhwFilter = signal<string | null>(null);
  protected readonly activityFilter = signal<ActivityFilterValue>('All');
  /** Ethnicity / age group / gender / country of origin from the shared demographic drawer. */
  protected readonly demographics = signal<DemographicFilterValue>(EMPTY_DEMOGRAPHIC_FILTERS);
  /**
   * Dashboard / report drill-through (?segment=smi): the exact set of guests behind the count
   * that was clicked, shown as a removable banner over the table. A pathway drill-through
   * (?clinicalPathway=…) simply sets the Pathway filter.
   */
  protected readonly segment = signal<GuestSegment | null>(null);
  /**
   * The Reports screen's period on a report drill-through (?registeredFrom=…&registeredTo=…):
   * only guests registered on those days, so the list matches the report's count.
   */
  protected readonly registeredRange = signal<{ from: string; to: string } | null>(null);
  /** A report KPI's reporting period (?periodFrom=…&periodTo=…) — the window its segment is measured over. */
  protected readonly periodRange = signal<{ from: string; to: string } | null>(null);
  /** The Reports Overview's referral-source rows (?referralSource=…). */
  protected readonly referralSource = signal<string | null>(null);
  protected readonly exporting = signal(false);
  protected readonly exportError = signal<string | null>(null);

  protected readonly statusOptions = STATUS_OPTIONS;
  protected readonly pathwayOptions = PATHWAY_OPTIONS;
  protected readonly activityOptions = ACTIVITY_OPTIONS;

  protected searchTerm = '';
  private nextCursor: string | null = null;
  private initialized = false;
  private readonly searchInput$ = new Subject<string>();

  constructor() {
    // Deduped against the current searchTerm (not the stream's last emission) so external
    // resets — clearFilters(), ?q= navigation — can't desync the comparator.
    this.searchInput$.pipe(debounceTime(300), takeUntilDestroyed()).subscribe((term) => {
      if (term === this.searchTerm) {
        return;
      }
      this.searchTerm = term;
      this.resetAndLoad();
    });

    // The header search bar navigates here with ?q=…, the dashboard KPI cards with
    // ?status=… or ?urgent=true (urgency is a flag, not a status) plus their toolbar's
    // pathway / cmhw / activity, "Caseload per CMHW" with ?cmhw=…, the demographics card with
    // ?ethnicity= / ?gender= / ?countryOfOrigin= / ?ageBand=, and the other dashboard and report
    // counts with ?segment= / ?clinicalPathway= (the Pathway filter) — including while this screen is already
    // active, so track the params instead of reading them once. The first (synchronous)
    // emission doubles as the initial load.
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const q = params.get('q') ?? '';
      const statusParam = params.get('status');
      const status: StatusFilterValue =
        statusParam && STATUS_OPTIONS.some((o) => o.value === statusParam) ? (statusParam as StatusFilterValue) : 'All';
      const urgent = params.get('urgent') === 'true';
      const pathwayParam = params.get('clinicalPathway');
      const pathway: PathwayFilterValue =
        pathwayParam && PATHWAY_OPTIONS.some((o) => o.value === pathwayParam) ? (pathwayParam as PathwayFilterValue) : 'All';
      const cmhw = params.get('cmhw');
      const activityParam = params.get('activity');
      const activity: ActivityFilterValue =
        activityParam && ACTIVITY_OPTIONS.some((o) => o.value === activityParam) ? (activityParam as ActivityFilterValue) : 'All';
      const segmentParam = params.get('segment');
      const segment = isGuestSegment(segmentParam) ? segmentParam : null;
      const registeredFrom = params.get('registeredFrom') ?? '';
      const registeredTo = params.get('registeredTo') ?? '';
      const registeredRange = isoRange(registeredFrom, registeredTo);
      const currentRange = this.registeredRange();
      const periodRange = isoRange(params.get('periodFrom') ?? '', params.get('periodTo') ?? '');
      const currentPeriod = this.periodRange();
      const referralSource = params.get('referralSource')?.trim() || null;
      const ageBandParam = params.get('ageBand') ?? '';
      const demographics: DemographicFilterValue = {
        ethnicity: params.get('ethnicity') ?? '',
        gender: params.get('gender') ?? '',
        countryOfOrigin: params.get('countryOfOrigin') ?? '',
        ageBand: AGE_BANDS.some((b) => b.label === ageBandParam) ? ageBandParam : '',
      };
      const current = this.demographics();
      const changed =
        q !== this.searchTerm ||
        status !== this.statusFilter() ||
        urgent !== this.urgentOnly() ||
        pathway !== this.pathwayFilter() ||
        cmhw !== this.cmhwFilter() ||
        activity !== this.activityFilter() ||
        segment !== this.segment() ||
        registeredRange?.from !== currentRange?.from ||
        registeredRange?.to !== currentRange?.to ||
        periodRange?.from !== currentPeriod?.from ||
        periodRange?.to !== currentPeriod?.to ||
        referralSource !== this.referralSource() ||
        demographics.ethnicity !== current.ethnicity ||
        demographics.gender !== current.gender ||
        demographics.countryOfOrigin !== current.countryOfOrigin ||
        demographics.ageBand !== current.ageBand;
      this.searchTerm = q;
      this.statusFilter.set(status);
      this.urgentOnly.set(urgent);
      this.pathwayFilter.set(pathway);
      this.cmhwFilter.set(cmhw);
      this.activityFilter.set(activity);
      this.segment.set(segment);
      this.registeredRange.set(registeredRange);
      this.periodRange.set(periodRange);
      this.referralSource.set(referralSource);
      this.demographics.set(demographics);
      if (changed || !this.initialized) {
        this.initialized = true;
        this.resetAndLoad();
      }
    });

    // The "Assigned CMHW" filter is the shared staff picker, which loads (and caches) the hub's
    // staff list itself through StaffDirectoryService — nothing to fetch here.
  }

  protected onSearchInput(value: string): void {
    this.searchInput$.next(value);
  }

  protected onStatusChange(value: string): void {
    this.statusFilter.set(value as StatusFilterValue);
    this.resetAndLoad();
  }

  /** "Urgent only" chip — a server-side filter, so it resets paging like the others. */
  protected toggleUrgentOnly(): void {
    this.urgentOnly.set(!this.urgentOnly());
    this.resetAndLoad();
  }

  protected onPathwayChange(value: string): void {
    this.pathwayFilter.set(value as PathwayFilterValue);
    this.resetAndLoad();
  }

  /** Null when the picker is cleared, which is the "all staff" state. */
  protected onCmhwChange(value: string | null): void {
    this.cmhwFilter.set(value);
    this.resetAndLoad();
  }

  protected onActivityChange(value: string): void {
    this.activityFilter.set(value as ActivityFilterValue);
    this.resetAndLoad();
  }

  /** The demographic drawer applied / cleared / removed a chip — all server-side filters. */
  protected onDemographicsChange(value: DemographicFilterValue): void {
    this.demographics.set(value);
    this.resetAndLoad();
  }

  /** The toolbar's filter icon — resets every filter (and the search box) to its default. */
  protected clearFilters(): void {
    this.searchTerm = '';
    this.statusFilter.set('All');
    this.urgentOnly.set(false);
    this.pathwayFilter.set('All');
    this.cmhwFilter.set(null);
    this.activityFilter.set('All');
    this.demographics.set(EMPTY_DEMOGRAPHIC_FILTERS);
    this.clearDrillThroughState();
    this.resetAndLoad();
  }

  /** Banner text for the drill-through the list was opened with, e.g. "SMI recorded" or "Referral source: GP". */
  protected drillThroughLabel(): string | null {
    const segment = this.segment();
    const source = this.referralSource();
    const parts = [segment ? guestSegmentLabel(segment) : null, source ? `Referral source: ${source}` : null];
    return parts.filter((p) => !!p).join(' · ') || null;
  }

  /** "6 Apr 2026 – 6 Oct 2026" for a report drill-through's registration window. */
  protected registeredLabel(): string | null {
    const range = this.registeredRange();
    return range ? formatPeriod(range.from, range.to) : null;
  }

  /** "6 Apr 2026 – 6 Oct 2026" — the reporting period a report KPI's segment was measured over. */
  protected periodLabel(): string | null {
    const range = this.periodRange();
    return range ? formatPeriod(range.from, range.to) : null;
  }

  protected hasDrillThrough(): boolean {
    return !!(this.drillThroughLabel() || this.registeredLabel() || this.periodLabel());
  }

  /** "Show all guests" on the drill-through banner — drops the drill-through but keeps other filters. */
  protected clearDrillThrough(): void {
    this.clearDrillThroughState();
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        segment: null,
        registeredFrom: null,
        registeredTo: null,
        periodFrom: null,
        periodTo: null,
        referralSource: null,
      },
      queryParamsHandling: 'merge',
    });
    this.resetAndLoad();
  }

  private clearDrillThroughState(): void {
    this.segment.set(null);
    this.registeredRange.set(null);
    this.periodRange.set(null);
    this.referralSource.set(null);
  }

  protected resetAndLoad(): void {
    this.guests.set([]);
    this.nextCursor = null;
    this.hasMore.set(true);
    this.totalCount.set(null);
    this.error.set(null);
    this.fetchPage(false);
  }

  protected loadMore(): void {
    if (this.loading() || this.loadingMore() || !this.hasMore()) {
      return;
    }
    this.fetchPage(true);
  }

  /** Fired by cdk-virtual-scroll-viewport as the rendered window moves — used to prefetch. */
  protected onScrolledIndexChange(index: number): void {
    const total = this.guests().length;
    if (this.hasMore() && !this.loading() && !this.loadingMore() && index >= total - PREFETCH_THRESHOLD) {
      this.loadMore();
    }
  }

  /** The server-side filter set currently shown — shared by paging and the CSV export. */
  private listFilters(): {
    q?: string;
    status?: GuestStatus;
    cmhw?: string;
    lastActivityDays?: number;
    urgent?: boolean;
    ethnicity?: string;
    gender?: string;
    countryOfOrigin?: string;
    ageMin?: number;
    ageMax?: number;
    segment?: string;
    clinicalPathway?: string;
    registeredFrom?: string;
    registeredTo?: string;
    periodFrom?: string;
    periodTo?: string;
    referralSource?: string;
  } {
    const status = this.statusFilter();
    const pathway = this.pathwayFilter();
    const cmhw = this.cmhwFilter();
    const activity = this.activityFilter();
    return {
      q: this.searchTerm || undefined,
      status: status === 'All' ? undefined : status,
      clinicalPathway: pathway === 'All' ? undefined : pathway,
      cmhw: cmhw ?? undefined,
      lastActivityDays: activity === 'All' ? undefined : Number(activity),
      // Only ever narrows to urgent guests — the chip has no "non-urgent only" state.
      urgent: this.urgentOnly() ? true : undefined,
      ...demographicFilterParams(this.demographics()),
      segment: this.segment() ?? undefined,
      registeredFrom: this.registeredRange()?.from,
      registeredTo: this.registeredRange()?.to,
      periodFrom: this.periodRange()?.from,
      periodTo: this.periodRange()?.to,
      referralSource: this.referralSource() ?? undefined,
    };
  }

  private fetchPage(append: boolean): void {
    if (append) {
      this.loadingMore.set(true);
    } else {
      this.loading.set(true);
    }

    this.guestsApi
      .getGuestList({
        ...this.listFilters(),
        cursor: append ? (this.nextCursor ?? undefined) : undefined,
        pageSize: PAGE_SIZE,
      })
      .pipe(
        catchError(() => {
          this.error.set('Unable to load guests right now. Please try again.');
          return of(null);
        }),
      )
      .subscribe((page) => {
        this.loading.set(false);
        this.loadingMore.set(false);
        if (!page) {
          return;
        }
        this.guests.update((current) => (append ? [...current, ...page.items] : page.items));
        this.nextCursor = page.nextCursor;
        this.hasMore.set(page.hasMore);
        // Only the first page carries totalCount; keep the carried value on later pages.
        if (page.totalCount !== null) {
          this.totalCount.set(page.totalCount);
        }
      });
  }

  /**
   * "Export Guest" — walks the current filter's keyset pages (same filters the table is
   * showing), caps at EXPORT_ROW_CAP rows, and downloads the result as a CSV. If the cap is
   * hit — or a later page fails after some rows were fetched — what was fetched still
   * downloads.
   */
  protected async exportGuests(): Promise<void> {
    if (this.exporting()) {
      return;
    }
    this.exporting.set(true);
    this.exportError.set(null);

    const rows: GuestListItemDto[] = [];
    let cursor: string | undefined;

    try {
      for (;;) {
        const page = await firstValueFrom(
          this.guestsApi.getGuestList({
            ...this.listFilters(),
            cursor,
            pageSize: EXPORT_PAGE_SIZE,
          }),
        );
        rows.push(...page.items);
        if (rows.length >= EXPORT_ROW_CAP || !page.hasMore || !page.nextCursor) {
          break;
        }
        cursor = page.nextCursor;
      }
    } catch {
      if (rows.length === 0) {
        this.exportError.set('Export failed. Please try again.');
        this.exporting.set(false);
        return;
      }
      // Partial fetch: fall through and download what we have.
    }

    this.downloadCsv(rows.slice(0, EXPORT_ROW_CAP));
    this.exporting.set(false);
  }

  private downloadCsv(rows: GuestListItemDto[]): void {
    const header = [
      'Guest ID',
      'First Name',
      'Last Name',
      'Date of Birth',
      'Status',
      'Urgent',
      'Pathway',
      'Risk',
      'Assigned CMHW',
      'Registered At',
      'Last Contact At',
      'Next Contact Due',
    ];
    const escape = (value: string | null): string => {
      const s = value ?? '';
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [header.join(',')];
    for (const guest of rows) {
      lines.push(
        [
          guest.id,
          guest.firstName,
          guest.lastName,
          guest.dateOfBirth,
          this.statusLabel(guest.status),
          guest.isUrgent ? 'Yes' : 'No',
          guest.pathway ? this.pathwayLabel(guest.pathway) : '',
          guest.hasRiskFlags ? 'High' : 'Low',
          guest.assignedCmhwName ?? '',
          guest.registeredAt,
          guest.lastContactAt ?? '',
          guest.nextContactDue ?? '',
        ]
          .map(escape)
          .join(','),
      );
    }

    // BOM so Excel opens the UTF-8 CSV with names intact.
    const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `guests-export-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  protected trackGuest(_index: number, guest: GuestListItemDto): string {
    return guest.id;
  }

  protected initials(guest: GuestListItemDto): string {
    return `${guest.firstName.charAt(0)}${guest.lastName.charAt(0)}`.toUpperCase();
  }

  protected statusLabel(status: GuestStatus): string {
    return status === 'OnHold' ? 'Inactive' : status;
  }

  /** "ClinicalSupport" → "Clinical Support"; "—" when the guest has no pathway yet. */
  protected pathwayLabel(pathway: string | null): string {
    return clinicalPathwayLabel(pathway);
  }

  protected formatDate(value: string | null): string {
    if (!value) {
      return '—';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '—';
    }
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  /** Last Activity column — the design shows "Today" for same-day activity. */
  protected formatActivity(value: string | null): string {
    if (!value) {
      return '—';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '—';
    }
    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const diffDays = Math.round((startOfDay(new Date()) - startOfDay(date)) / 86_400_000);
    if (diffDays === 0) {
      return 'Today';
    }
    if (diffDays === 1) {
      return 'Yesterday';
    }
    return this.formatDate(value);
  }

  /**
   * Anywhere on the row opens the record. The name and "Open" are real links (so Ctrl/Cmd-click
   * and middle-click open a new tab, and keyboard users can tab to them); clicks that land on a
   * link are left to the link itself.
   */
  protected onRowClick(event: MouseEvent, guestId: string): void {
    if ((event.target as HTMLElement).closest('a, button')) return;
    this.openGuest(guestId);
  }

  protected openGuest(guestId: string): void {
    void this.router.navigate(['/guests', guestId]);
  }

  protected registerGuest(): void {
    this.router.navigate(['/guests/new']);
  }
}

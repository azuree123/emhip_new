import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { ActivatedRoute, Router, RouterOutlet } from '@angular/router';
import { Subject, firstValueFrom, of } from 'rxjs';
import { catchError, debounceTime } from 'rxjs/operators';

import { GuestsApiService } from '../../core/guests-api.service';
import { CmhwOptionDto, GuestListItemDto, GuestStatus, PathwayCategory } from '../../core/api-models';

type StatusFilterValue = GuestStatus | 'All';
type PathwayFilterValue = PathwayCategory | 'All';
/** Number of days sent as lastActivityDays, or 'All' for no filter. */
type ActivityFilterValue = 'All' | '1' | '7' | '30';

const PAGE_SIZE = 50;
/** How close (in rendered rows) to the bottom of the loaded set before we fetch the next page. */
const PREFETCH_THRESHOLD = 15;

/** Page size used while walking the keyset pages for a CSV export. */
const EXPORT_PAGE_SIZE = 200;
/** Hard cap on exported rows — if reached, we still download what was fetched. */
const EXPORT_ROW_CAP = 2000;

const STATUS_OPTIONS: { value: StatusFilterValue; label: string }[] = [
  // "Status" doubles as the closed-state label of the native select, matching the design's
  // filter chip; selecting it clears the filter.
  { value: 'All', label: 'Status' },
  { value: 'Active', label: 'Active' },
  { value: 'PendingConversation', label: 'Pending Conversation' },
  { value: 'Inactive', label: 'Inactive' },
  { value: 'Urgent', label: 'Urgent' },
];

const PATHWAY_OPTIONS: { value: PathwayFilterValue; label: string }[] = [
  // As with Status, the chip name doubles as the closed-state/clear option label.
  { value: 'All', label: 'Pathway' },
  { value: 'HousingAdvice', label: 'Housing Advice' },
  { value: 'EmploymentSupport', label: 'Employment Support' },
  { value: 'BenefitsFinancialSupport', label: 'Benefits & Financial Support' },
  { value: 'FoodEssentials', label: 'Food Essentials' },
  { value: 'ImmigrationLegalAdvice', label: 'Immigration & Legal Advice' },
  { value: 'OtherPracticalAdvice', label: 'Other Practical Advice' },
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
 * All filters (search, status, pathway, assigned CMHW, last activity) are applied
 * server-side; changing any of them resets the keyset list and reloads page one.
 *
 * Layout/styling follow the Figma GuestDataSheet3 frame (Components.bundle.js lines
 * 9051-13375, 1440px design).
 */
@Component({
  selector: 'app-guest-data-sheet',
  standalone: true,
  imports: [ScrollingModule, RouterOutlet],
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
  protected readonly error = signal<string | null>(null);
  protected readonly statusFilter = signal<StatusFilterValue>('All');
  protected readonly pathwayFilter = signal<PathwayFilterValue>('All');
  protected readonly cmhwFilter = signal<string>('All');
  protected readonly activityFilter = signal<ActivityFilterValue>('All');
  protected readonly cmhwOptions = signal<CmhwOptionDto[]>([]);
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

    // The header search bar navigates here with ?q=…, and the dashboard KPI cards with
    // ?status=… — including while this screen is already active, so track the params
    // instead of reading them once. The first (synchronous) emission doubles as the
    // initial load.
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const q = params.get('q') ?? '';
      const statusParam = params.get('status');
      const status: StatusFilterValue =
        statusParam && STATUS_OPTIONS.some((o) => o.value === statusParam) ? (statusParam as StatusFilterValue) : 'All';
      const changed = q !== this.searchTerm || status !== this.statusFilter();
      this.searchTerm = q;
      this.statusFilter.set(status);
      if (changed || !this.initialized) {
        this.initialized = true;
        this.resetAndLoad();
      }
    });

    // "Assigned CMHW" options load once per visit; a failure just leaves the dropdown with
    // its unfiltered "Assigned CMHW" default rather than blocking the list.
    this.guestsApi
      .getCmhwOptions()
      .pipe(
        catchError(() => of([] as CmhwOptionDto[])),
        takeUntilDestroyed(),
      )
      .subscribe((options) => this.cmhwOptions.set(options));
  }

  protected onSearchInput(value: string): void {
    this.searchInput$.next(value);
  }

  protected onStatusChange(value: string): void {
    this.statusFilter.set(value as StatusFilterValue);
    this.resetAndLoad();
  }

  protected onPathwayChange(value: string): void {
    this.pathwayFilter.set(value as PathwayFilterValue);
    this.resetAndLoad();
  }

  protected onCmhwChange(value: string): void {
    this.cmhwFilter.set(value);
    this.resetAndLoad();
  }

  protected onActivityChange(value: string): void {
    this.activityFilter.set(value as ActivityFilterValue);
    this.resetAndLoad();
  }

  /** The toolbar's filter icon — resets every filter (and the search box) to its default. */
  protected clearFilters(): void {
    this.searchTerm = '';
    this.statusFilter.set('All');
    this.pathwayFilter.set('All');
    this.cmhwFilter.set('All');
    this.activityFilter.set('All');
    this.resetAndLoad();
  }

  protected resetAndLoad(): void {
    this.guests.set([]);
    this.nextCursor = null;
    this.hasMore.set(true);
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
    pathway?: PathwayCategory;
    cmhw?: string;
    lastActivityDays?: number;
  } {
    const status = this.statusFilter();
    const pathway = this.pathwayFilter();
    const cmhw = this.cmhwFilter();
    const activity = this.activityFilter();
    return {
      q: this.searchTerm || undefined,
      status: status === 'All' ? undefined : status,
      pathway: pathway === 'All' ? undefined : pathway,
      cmhw: cmhw === 'All' ? undefined : cmhw,
      lastActivityDays: activity === 'All' ? undefined : Number(activity),
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
          guest.pathwayCategory ? this.pathwayLabel(guest.pathwayCategory) : '',
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
    return status === 'PendingConversation' ? 'Pending Conversation' : status;
  }

  /** Humanizes a PathwayCategory enum name — "HousingAdvice" → "Housing Advice". */
  protected pathwayLabel(category: string | null): string {
    if (!category) {
      return '—';
    }
    const curated = PATHWAY_OPTIONS.find((o) => o.value === category);
    return curated ? curated.label : category.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
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

  protected shortId(id: string): string {
    return id.replace(/-/g, '').slice(0, 8).toUpperCase();
  }

  protected openGuest(guestId: string): void {
    this.router.navigate(['/guests', guestId]);
  }

  protected registerGuest(): void {
    this.router.navigate(['/guests/new']);
  }
}

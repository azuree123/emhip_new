import { ChangeDetectionStrategy, Component, HostListener, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { Router } from '@angular/router';
import { Subject, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { GuestsApiService } from '../../core/guests-api.service';
import { GuestListItemDto, GuestStatus } from '../../core/api-models';

type StatusFilterValue = GuestStatus | 'All';

const PAGE_SIZE = 50;
/** How close (in rendered rows) to the bottom of the loaded set before we fetch the next page. */
const PREFETCH_THRESHOLD = 15;

const STATUS_OPTIONS: { value: StatusFilterValue; label: string }[] = [
  { value: 'All', label: 'All statuses' },
  { value: 'Active', label: 'Active' },
  { value: 'PendingConversation', label: 'Pending Conversation' },
  { value: 'Inactive', label: 'Inactive' },
  { value: 'Urgent', label: 'Urgent' },
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
 */
@Component({
  selector: 'app-guest-data-sheet',
  standalone: true,
  imports: [ScrollingModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './guest-data-sheet.component.html',
  styleUrl: './guest-data-sheet.component.scss',
})
export class GuestDataSheetComponent {
  private readonly guestsApi = inject(GuestsApiService);
  private readonly router = inject(Router);

  protected readonly guests = signal<GuestListItemDto[]>([]);
  protected readonly loading = signal(false);
  protected readonly loadingMore = signal(false);
  protected readonly hasMore = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly statusFilter = signal<StatusFilterValue>('All');

  protected readonly statusOptions = STATUS_OPTIONS;

  /**
   * Row height fed to cdk-virtual-scroll's fixed-size strategy. Below the sidebar's drawer
   * breakpoint the six-column table collapses into a stacked card (see the component SCSS), which
   * is taller — so the itemSize has to switch with it, otherwise virtual scroll would position
   * rows using the wrong height and they'd overlap.
   */
  private static readonly CARD_BREAKPOINT = 1023;
  private static readonly ROW_DESKTOP = 72;
  private static readonly ROW_CARD = 188;
  protected readonly rowHeight = signal(GuestDataSheetComponent.computeRowHeight());

  @HostListener('window:resize')
  protected onWindowResize(): void {
    const next = GuestDataSheetComponent.computeRowHeight();
    if (next !== this.rowHeight()) {
      this.rowHeight.set(next);
    }
  }

  private static computeRowHeight(): number {
    const width = typeof window === 'undefined' ? 1280 : window.innerWidth;
    return width <= GuestDataSheetComponent.CARD_BREAKPOINT
      ? GuestDataSheetComponent.ROW_CARD
      : GuestDataSheetComponent.ROW_DESKTOP;
  }

  private searchTerm = '';
  private nextCursor: string | null = null;
  private readonly searchInput$ = new Subject<string>();

  constructor() {
    this.searchInput$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((term) => {
        this.searchTerm = term;
        this.resetAndLoad();
      });

    this.resetAndLoad();
  }

  protected onSearchInput(value: string): void {
    this.searchInput$.next(value);
  }

  protected onStatusChange(value: string): void {
    this.statusFilter.set(value as StatusFilterValue);
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

  private fetchPage(append: boolean): void {
    if (append) {
      this.loadingMore.set(true);
    } else {
      this.loading.set(true);
    }

    const status = this.statusFilter();

    this.guestsApi
      .getGuestList({
        q: this.searchTerm || undefined,
        status: status === 'All' ? undefined : status,
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

  protected trackGuest(_index: number, guest: GuestListItemDto): string {
    return guest.id;
  }

  protected initials(guest: GuestListItemDto): string {
    return `${guest.firstName.charAt(0)}${guest.lastName.charAt(0)}`.toUpperCase();
  }

  protected statusLabel(status: GuestStatus): string {
    return status === 'PendingConversation' ? 'Pending Conversation' : status;
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

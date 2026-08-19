import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  GuestListItemDto,
  GuestStatus,
  PathwayCategory,
} from '../../core/api-models';
import { GuestsApiService } from '../../core/guests-api.service';
import { StaffPickerComponent } from '../../shared/staff-picker.component';
import { CATEGORY_META, STATUS_META, pathwayCategoryLabel, shortDay } from './report-meta';

const PAGE_SIZE = 10;

/**
 * "Guest Report" tab — the searchable/filterable guest table from Desktop66
 * (project/screens/Components.bundle.js lines 92043-95267), backed by the real
 * keyset-paged GET /guests endpoint. The source draws numbered pagination
 * ("Showing 1 to 10 of 11 entries", pages 1..8); keyset paging has no total
 * count, so honest Prev/Next paging with a page counter is rendered instead.
 */
@Component({
  selector: 'app-reports-guest-report',
  standalone: true,
  imports: [RouterLink, FormsModule, StaffPickerComponent],
  templateUrl: './reports-guest-report.component.html',
  styleUrl: './reports-guest-report.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportsGuestReportComponent implements OnInit, OnDestroy {
  private readonly guestsApi = inject(GuestsApiService);

  /** Preselected CMHW filter — set by the Caseload tab's "View" drill-down. */
  readonly initialCmhw = input('');

  readonly statusOptions: { value: GuestStatus; label: string }[] = [
    { value: 'Active', label: 'Active' },
    { value: 'PendingConversation', label: 'Pending conversation' },
    { value: 'Inactive', label: 'Inactive' },
    { value: 'Urgent', label: 'Urgent' },
  ];

  readonly pathwayOptions: { value: PathwayCategory; label: string }[] = (
    Object.keys(CATEGORY_META) as PathwayCategory[]
  ).map((value) => ({ value, label: CATEGORY_META[value].label }));

  readonly activityOptions = [
    { value: '7', label: 'Last 7 days' },
    { value: '30', label: 'Last 30 days' },
    { value: '90', label: 'Last 90 days' },
  ];

  // Filters (all map 1:1 to real GET /guests query params).
  readonly q = signal('');
  readonly status = signal<'' | GuestStatus>('');
  readonly pathway = signal<'' | PathwayCategory>('');
  readonly cmhw = signal('');
  readonly lastActivityDays = signal('');

  readonly items = signal<GuestListItemDto[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly hasMore = signal(false);
  readonly pageIndex = signal(0);

  private nextCursor: string | null = null;
  private currentCursor: string | undefined;
  private prevCursors: (string | undefined)[] = [];
  private searchTimer: ReturnType<typeof setTimeout> | undefined;

  ngOnInit(): void {
    // The Caseload drill-down hands over a staff id; the shared picker resolves it to that
    // person's name from the cached staff directory, so no options are fetched here.
    if (this.initialCmhw()) this.cmhw.set(this.initialCmhw());
    this.load();
  }

  ngOnDestroy(): void {
    if (this.searchTimer !== undefined) clearTimeout(this.searchTimer);
  }

  onSearchInput(event: Event): void {
    this.q.set((event.target as HTMLInputElement).value.trim());
    if (this.searchTimer !== undefined) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.resetAndLoad(), 300);
  }

  onStatusChange(event: Event): void {
    this.status.set((event.target as HTMLSelectElement).value as '' | GuestStatus);
    this.resetAndLoad();
  }

  onPathwayChange(event: Event): void {
    this.pathway.set((event.target as HTMLSelectElement).value as '' | PathwayCategory);
    this.resetAndLoad();
  }

  /** The staff picker emits null when cleared, which is the "All CMHW" state. */
  onCmhwChange(staffId: string | null): void {
    this.cmhw.set(staffId ?? '');
    this.resetAndLoad();
  }

  onActivityChange(event: Event): void {
    this.lastActivityDays.set((event.target as HTMLSelectElement).value);
    this.resetAndLoad();
  }

  nextPage(): void {
    if (!this.hasMore() || this.nextCursor === null || this.loading()) return;
    this.prevCursors.push(this.currentCursor);
    this.currentCursor = this.nextCursor;
    this.pageIndex.set(this.pageIndex() + 1);
    this.load();
  }

  prevPage(): void {
    if (this.prevCursors.length === 0 || this.loading()) return;
    this.currentCursor = this.prevCursors.pop();
    this.pageIndex.set(this.pageIndex() - 1);
    this.load();
  }

  initials(guest: GuestListItemDto): string {
    return `${guest.firstName.charAt(0)}${guest.lastName.charAt(0)}`.toUpperCase();
  }

  statusLabel(status: GuestStatus): string {
    return STATUS_META[status]?.label ?? status;
  }

  statusClass(status: GuestStatus): string {
    return STATUS_META[status]?.pillClass ?? 'status-pill--inactive';
  }

  pathwayLabel(category: string | null): string {
    return pathwayCategoryLabel(category);
  }

  lastActivity(guest: GuestListItemDto): string {
    return shortDay(guest.lastContactAt);
  }

  private resetAndLoad(): void {
    this.prevCursors = [];
    this.currentCursor = undefined;
    this.pageIndex.set(0);
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.guestsApi
      .getGuestList({
        q: this.q() || undefined,
        status: this.status() || undefined,
        pathway: this.pathway() || undefined,
        cmhw: this.cmhw() || undefined,
        lastActivityDays: this.lastActivityDays() ? Number(this.lastActivityDays()) : undefined,
        cursor: this.currentCursor,
        pageSize: PAGE_SIZE,
      })
      .subscribe({
        next: (page) => {
          this.items.set(page.items);
          this.nextCursor = page.nextCursor;
          this.hasMore.set(page.hasMore && page.nextCursor !== null);
          this.loading.set(false);
        },
        error: (err) => {
          this.items.set([]);
          this.nextCursor = null;
          this.hasMore.set(false);
          this.error.set(err?.message ?? 'Unable to load the guest list.');
          this.loading.set(false);
        },
      });
  }
}

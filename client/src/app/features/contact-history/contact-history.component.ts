import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, firstValueFrom, of } from 'rxjs';
import { catchError, debounceTime } from 'rxjs/operators';
import { ContactHistorySummaryDto, ContactsByGuestRowDto, GuestStatus } from '../../core/api-models';
import { AuthService } from '../../core/auth.service';
import { ContactHistoryCategory, ContactsApiService, ContactsByGuestOptions } from '../../core/contacts-api.service';
import { Permissions } from '../../core/permissions';
import { StaffPickerComponent } from '../../shared/staff-picker.component';
import { formatDate, guestPathwayLabel } from '../guest-workspace/guest-workspace.util';

/** Days back from today, or 'all'. */
type PeriodFilter = 'all' | '7' | '30' | '90';

/** Design Desktop 89 paginates in tens ("Showing 1 to 10 of 11 entries"). */
const PAGE_SIZE = 10;
/** Page size used while walking the keyset pages for the CSV export, and its row cap. */
const EXPORT_PAGE_SIZE = 200;
const EXPORT_ROW_CAP = 2000;

const CATEGORY_OPTIONS: { value: '' | ContactHistoryCategory; label: string }[] = [
  { value: '', label: 'All contacts' },
  { value: 'Casework', label: 'Casework' },
  { value: 'Activity', label: 'Activity' },
  { value: 'Hospitality', label: 'Hospitality' },
  { value: 'Afa', label: 'AFA' },
  { value: 'Cpn', label: 'CPN contacts' },
];

const PERIOD_OPTIONS: { value: PeriodFilter; label: string }[] = [
  { value: 'all', label: 'All dates' },
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
];

/** "1 CPN session" / "2 CPN sessions". */
function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

/** yyyy-MM-dd for a Date in local time. */
function isoDay(date: Date): string {
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

/** The per-type count chips on a row, in the design's order ("1 Casework · 2 Activity · 2 AFA · 2 Hospitality"). */
interface CountChip {
  key: ContactHistoryCategory;
  label: string;
  count: number;
  /** Hover breakdown — only the CPN chip needs one (sessions vs. the initial assessment). */
  title?: string;
}

/**
 * "Contact history" nav screen — design Desktop 89/90 ("EMHIP - Additional Changes"): all guest
 * contacts across your caseload, filtered and searchable. One row per guest showing how many
 * contacts of each type have been logged (Casework / Activity / AFA / Hospitality, plus CPN
 * contacts), the last contact date, and "View Note" / "Open" actions; four stat tiles above;
 * search, the "All contacts" type dropdown, a CMHW filter and a date range; Export; and the
 * design's Prev / Next pager ("Showing 1 to 10 of 11 entries").
 *
 * CPN work has its own "CPN activity" section under the tiles (customer feedback: it is
 * unrelated to AFA & Hospitality, so it is never shown on that tile). Its chip narrows the list
 * to guests with CPN contacts — the same filter as "CPN contacts" in the type dropdown.
 *
 * Backed by GET /contacts/by-guest (chronological — most recent contact first — and keyset-paged,
 * so Prev is a cursor stack, not page numbers) and GET /contacts/summary for the tiles. Hub Managers open on the whole hub;
 * everyone else opens on "My caseload" (guests assigned to them) and can widen it with the chip.
 */
@Component({
  selector: 'app-contact-history',
  standalone: true,
  imports: [FormsModule, StaffPickerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './contact-history.component.html',
  styleUrl: './contact-history.component.scss',
})
export class ContactHistoryComponent {
  private readonly contactsApi = inject(ContactsApiService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly rows = signal<ContactsByGuestRowDto[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly hasMore = signal(false);
  protected readonly pageIndex = signal(0);
  /** Server-side total for the applied filters; only the first page carries it. */
  protected readonly totalCount = signal<number | null>(null);

  protected readonly summary = signal<ContactHistorySummaryDto | null>(null);

  protected readonly exporting = signal(false);
  protected readonly exportError = signal<string | null>(null);

  protected readonly categoryOptions = CATEGORY_OPTIONS;
  protected readonly periodOptions = PERIOD_OPTIONS;

  protected readonly isHubManager = this.auth.hasPermission(Permissions.Dashboard.ViewHubManager);
  /** "My caseload" chip — on by default for workers, off for managers. */
  protected readonly myCaseload = signal(!this.isHubManager);

  protected searchTerm = '';
  protected readonly category = signal<'' | ContactHistoryCategory>('');
  /** The CPN section's chip is just the "CPN contacts" type filter, so the two stay in sync. */
  protected readonly cpnOnly = computed(() => this.category() === 'Cpn');
  protected readonly period = signal<PeriodFilter>('all');
  /** "Last 30 days" etc. — tells the reader which window the CPN figures cover. */
  protected readonly periodLabel = computed(
    () => PERIOD_OPTIONS.find((option) => option.value === this.period())?.label ?? 'All dates',
  );
  /** Assigned CMHW — a staff id, or null for all. Ignored while "My caseload" is on. */
  protected readonly cmhwFilter = signal<string | null>(null);

  /** "Showing X to Y of Z entries" (design) — 1-based, over the applied filters. */
  protected readonly rangeStart = computed(() => (this.rows().length === 0 ? 0 : this.pageIndex() * PAGE_SIZE + 1));
  protected readonly rangeEnd = computed(() => this.pageIndex() * PAGE_SIZE + this.rows().length);

  protected readonly formatDate = formatDate;

  private nextCursor: string | null = null;
  private currentCursor: string | undefined;
  private prevCursors: (string | undefined)[] = [];
  private fetchToken = 0;
  private readonly searchInput$ = new Subject<string>();

  constructor() {
    this.searchInput$.pipe(debounceTime(300), takeUntilDestroyed()).subscribe((term) => {
      if (term === this.searchTerm) return;
      this.searchTerm = term;
      this.resetAndLoad();
    });
    this.resetAndLoad();
    this.loadSummary();
  }

  // ---- Filters ----------------------------------------------------------------------------

  protected onSearchInput(value: string): void {
    this.searchInput$.next(value.trim());
  }

  protected onCategoryChange(value: string): void {
    this.category.set(value as '' | ContactHistoryCategory);
    this.resetAndLoad();
  }

  protected toggleCpnOnly(): void {
    this.onCategoryChange(this.cpnOnly() ? '' : 'Cpn');
  }

  protected onPeriodChange(value: string): void {
    this.period.set(value as PeriodFilter);
    this.resetAndLoad();
    this.loadSummary();
  }

  protected onCmhwChange(value: string | null): void {
    this.cmhwFilter.set(value);
    this.resetAndLoad();
    this.loadSummary();
  }

  protected toggleMyCaseload(): void {
    this.myCaseload.set(!this.myCaseload());
    this.resetAndLoad();
    this.loadSummary();
  }

  protected clearFilters(): void {
    this.searchTerm = '';
    this.category.set('');
    this.period.set('all');
    this.cmhwFilter.set(null);
    this.myCaseload.set(!this.isHubManager);
    this.resetAndLoad();
    this.loadSummary();
  }

  /** The caseload scope shared by the list and the tiles. */
  private scope(): { cmhw?: string; from?: string } {
    const period = this.period();
    return {
      cmhw: this.myCaseload() ? this.auth.current().staffId : (this.cmhwFilter() ?? undefined),
      from: period === 'all' ? undefined : isoDay(new Date(Date.now() - (Number(period) - 1) * 86_400_000)),
    };
  }

  private listOptions(): ContactsByGuestOptions {
    return {
      ...this.scope(),
      q: this.searchTerm || undefined,
      category: this.category() || undefined,
    };
  }

  // ---- Paging (keyset: Prev is a cursor stack) ----------------------------------------------

  protected resetAndLoad(): void {
    this.prevCursors = [];
    this.currentCursor = undefined;
    this.pageIndex.set(0);
    this.totalCount.set(null);
    this.load();
  }

  protected nextPage(): void {
    if (!this.hasMore() || this.nextCursor === null || this.loading()) return;
    this.prevCursors.push(this.currentCursor);
    this.currentCursor = this.nextCursor;
    this.pageIndex.set(this.pageIndex() + 1);
    this.load();
  }

  protected prevPage(): void {
    if (this.prevCursors.length === 0 || this.loading()) return;
    this.currentCursor = this.prevCursors.pop();
    this.pageIndex.set(this.pageIndex() - 1);
    this.load();
  }

  private load(): void {
    const token = ++this.fetchToken;
    this.loading.set(true);
    this.error.set(null);
    this.contactsApi
      .getByGuest({ ...this.listOptions(), cursor: this.currentCursor, pageSize: PAGE_SIZE })
      .pipe(
        catchError(() => {
          this.error.set('Unable to load the contact history right now. Please try again.');
          return of(null);
        }),
      )
      .subscribe((page) => {
        if (token !== this.fetchToken) return;
        this.loading.set(false);
        if (!page) {
          this.rows.set([]);
          this.hasMore.set(false);
          return;
        }
        this.rows.set(page.items);
        this.nextCursor = page.nextCursor;
        this.hasMore.set(page.hasMore && page.nextCursor !== null);
        if (page.totalCount !== null) this.totalCount.set(page.totalCount);
      });
  }

  private loadSummary(): void {
    this.contactsApi
      .getSummary(this.scope())
      .pipe(catchError(() => of(null)))
      .subscribe((summary) => this.summary.set(summary));
  }

  // ---- Rows ------------------------------------------------------------------------------

  protected initials(row: ContactsByGuestRowDto): string {
    const parts = row.guestName.trim().split(/\s+/);
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
  }

  /** "G-1042 · Mental wellbeing · CMHW: Amara Asante" — the design's row sub-line. */
  protected subline(row: ContactsByGuestRowDto): string {
    const parts = [`G-${row.guestNumber}`];
    const pathway = guestPathwayLabel(row.pathway);
    if (pathway) parts.push(pathway);
    parts.push(row.assignedCmhwName ? `CMHW: ${row.assignedCmhwName}` : 'Unassigned');
    return parts.join(' · ');
  }

  protected countChips(row: ContactsByGuestRowDto): CountChip[] {
    const chips: CountChip[] = [
      { key: 'Casework', label: 'Casework', count: row.caseworkCount },
      { key: 'Activity', label: 'Activity', count: row.activityCount },
      { key: 'Afa', label: 'AFA', count: row.afaCount },
      { key: 'Hospitality', label: 'Hospitality', count: row.hospitalityCount },
      {
        key: 'Cpn',
        label: 'CPN',
        count: row.cpnSessionCount + row.cpnAssessmentCount,
        title: `${plural(row.cpnSessionCount, 'CPN session')} · ${plural(row.cpnAssessmentCount, 'initial assessment')}`,
      },
    ];
    return chips.filter((chip) => chip.count > 0);
  }

  /** The OnHold enum value reads as "Inactive" everywhere a user sees it. */
  protected statusLabel(status: GuestStatus): string {
    return status === 'OnHold' ? 'Inactive' : status;
  }

  /** "View Note" — the guest's casework notes (the design's Desktop 90 note view). */
  protected viewNotes(row: ContactsByGuestRowDto): void {
    this.router.navigate(['/guests', row.guestId], { queryParams: { tab: 'notes' } });
  }

  protected openGuest(row: ContactsByGuestRowDto): void {
    this.router.navigate(['/guests', row.guestId], { queryParams: { tab: 'contacts' } });
  }

  // ---- Export ----------------------------------------------------------------------------

  /** "Export" — walks the current filter's pages (capped) and downloads a CSV. */
  protected async exportCsv(): Promise<void> {
    if (this.exporting()) return;
    this.exporting.set(true);
    this.exportError.set(null);
    const rows: ContactsByGuestRowDto[] = [];
    let cursor: string | undefined;
    try {
      for (;;) {
        const page = await firstValueFrom(
          this.contactsApi.getByGuest({ ...this.listOptions(), cursor, pageSize: EXPORT_PAGE_SIZE }),
        );
        rows.push(...page.items);
        if (rows.length >= EXPORT_ROW_CAP || !page.hasMore || !page.nextCursor) break;
        cursor = page.nextCursor;
      }
    } catch {
      if (rows.length === 0) {
        this.exportError.set('Export failed. Please try again.');
        this.exporting.set(false);
        return;
      }
    }
    const header = [
      'Guest ID', 'Guest', 'Status', 'Pathway', 'Assigned CMHW', 'Total contacts', 'Casework', 'Activity', 'AFA', 'Hospitality',
      'CPN sessions', 'CPN initial assessments', 'Last contact',
    ];
    const escape = (value: string | number | null): string => {
      const s = value === null ? '' : String(value);
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [header.join(',')];
    for (const r of rows.slice(0, EXPORT_ROW_CAP)) {
      lines.push(
        [
          `G-${r.guestNumber}`, r.guestName, this.statusLabel(r.guestStatus), guestPathwayLabel(r.pathway) ?? '',
          r.assignedCmhwName ?? '', r.totalContacts, r.caseworkCount, r.activityCount, r.afaCount, r.hospitalityCount,
          r.cpnSessionCount, r.cpnAssessmentCount, r.lastContactAt ?? '',
        ].map(escape).join(','),
      );
    }
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `contact-history-${isoDay(new Date())}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    this.exporting.set(false);
  }
}

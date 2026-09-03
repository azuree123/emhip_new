import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, of } from 'rxjs';
import { catchError, debounceTime } from 'rxjs/operators';
import { ContactHistoryRowDto, ContactOutcome, ContactType, GuestStatus } from '../../core/api-models';
import { AuthService } from '../../core/auth.service';
import { ContactsApiService } from '../../core/contacts-api.service';
import { Permissions } from '../../core/permissions';
import { StaffPickerComponent } from '../../shared/staff-picker.component';
import { formatDateTime, humanize, outcomeChip, statusChip } from '../guest-workspace/guest-workspace.util';

/** Days back from today, or 'all'. */
type PeriodFilter = 'all' | '1' | '7' | '30' | '90';

const PAGE_SIZE = 50;

const TYPE_OPTIONS: { value: '' | ContactType; label: string }[] = [
  { value: '', label: 'Contact type' },
  { value: 'PhoneCall', label: 'Phone call' },
  { value: 'InPerson', label: 'In person' },
  { value: 'VideoCall', label: 'Video call' },
  { value: 'TextMessage', label: 'Text message' },
  { value: 'Email', label: 'Email' },
];

const OUTCOME_OPTIONS: { value: '' | ContactOutcome; label: string }[] = [
  { value: '', label: 'Outcome' },
  { value: 'Successful', label: 'Successful' },
  { value: 'NoAnswer', label: 'No answer' },
  { value: 'LeftMessage', label: 'Left message' },
  { value: 'Declined', label: 'Declined' },
  { value: 'Rescheduled', label: 'Rescheduled' },
];

const PERIOD_OPTIONS: { value: PeriodFilter; label: string }[] = [
  { value: 'all', label: 'All dates' },
  { value: '1', label: 'Today' },
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
];

/** yyyy-MM-dd for a Date in local time. */
function isoDay(date: Date): string {
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

/**
 * "Contact History" nav screen — every contact logged against a guest in the hub, newest
 * first, backed by the keyset-paged GET /contacts endpoint. Every filter (search, type,
 * outcome, logged-by, assigned CMHW, period, "my contacts") is applied server-side; changing
 * one resets the list to its first page.
 *
 * Hub Managers open on the whole hub. Everyone else opens on "My contacts" (the contacts they
 * logged themselves) and can widen to the hub with the chip — the same scoping the Guest Seen
 * card uses on the two dashboards.
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

  protected readonly rows = signal<ContactHistoryRowDto[]>([]);
  protected readonly loading = signal(false);
  protected readonly loadingMore = signal(false);
  protected readonly hasMore = signal(false);
  protected readonly totalCount = signal<number | null>(null);
  protected readonly error = signal<string | null>(null);

  protected readonly typeOptions = TYPE_OPTIONS;
  protected readonly outcomeOptions = OUTCOME_OPTIONS;
  protected readonly periodOptions = PERIOD_OPTIONS;

  protected readonly isHubManager = this.auth.hasPermission(Permissions.Dashboard.ViewHubManager);
  /** "My contacts" chip — on by default for workers, off for managers. */
  protected readonly mineOnly = signal(!this.isHubManager);

  protected searchTerm = '';
  protected readonly typeFilter = signal<'' | ContactType>('');
  protected readonly outcomeFilter = signal<'' | ContactOutcome>('');
  protected readonly period = signal<PeriodFilter>('all');
  /** Worker who logged the contact — a staff id, or null for anyone. Ignored while "My contacts" is on. */
  protected readonly loggedByFilter = signal<string | null>(null);
  /** The guest's assigned CMHW — a staff id, or null for all. */
  protected readonly cmhwFilter = signal<string | null>(null);

  protected readonly showingLabel = computed(() => {
    const shown = this.rows().length;
    const total = this.totalCount();
    if (total !== null) return `Showing 1 to ${shown} of ${total} contacts`;
    return `Showing ${shown}${this.hasMore() ? '+' : ''} contacts`;
  });

  protected readonly humanize = humanize;
  protected readonly formatDateTime = formatDateTime;
  protected readonly outcomeChip = outcomeChip;
  protected readonly statusChip = statusChip;

  private nextCursor: string | null = null;
  private fetchToken = 0;
  private readonly searchInput$ = new Subject<string>();

  constructor() {
    this.searchInput$.pipe(debounceTime(300), takeUntilDestroyed()).subscribe((term) => {
      if (term === this.searchTerm) return;
      this.searchTerm = term;
      this.resetAndLoad();
    });
    this.resetAndLoad();
  }

  protected onSearchInput(value: string): void {
    this.searchInput$.next(value.trim());
  }

  protected onTypeChange(value: string): void {
    this.typeFilter.set(value as '' | ContactType);
    this.resetAndLoad();
  }

  protected onOutcomeChange(value: string): void {
    this.outcomeFilter.set(value as '' | ContactOutcome);
    this.resetAndLoad();
  }

  protected onPeriodChange(value: string): void {
    this.period.set(value as PeriodFilter);
    this.resetAndLoad();
  }

  protected onLoggedByChange(value: string | null): void {
    this.loggedByFilter.set(value);
    this.resetAndLoad();
  }

  protected onCmhwChange(value: string | null): void {
    this.cmhwFilter.set(value);
    this.resetAndLoad();
  }

  protected toggleMine(): void {
    this.mineOnly.set(!this.mineOnly());
    this.resetAndLoad();
  }

  protected clearFilters(): void {
    this.searchTerm = '';
    this.typeFilter.set('');
    this.outcomeFilter.set('');
    this.period.set('all');
    this.loggedByFilter.set(null);
    this.cmhwFilter.set(null);
    this.mineOnly.set(!this.isHubManager);
    this.resetAndLoad();
  }

  protected resetAndLoad(): void {
    this.rows.set([]);
    this.nextCursor = null;
    this.hasMore.set(false);
    this.totalCount.set(null);
    this.error.set(null);
    this.fetchPage(false);
  }

  protected loadMore(): void {
    if (this.loading() || this.loadingMore() || !this.hasMore()) return;
    this.fetchPage(true);
  }

  private filters(): { from?: string; loggedBy?: string } & Record<string, string | undefined> {
    const period = this.period();
    const from = period === 'all' ? undefined : isoDay(new Date(Date.now() - (Number(period) - 1) * 86_400_000));
    return {
      q: this.searchTerm || undefined,
      type: this.typeFilter() || undefined,
      outcome: this.outcomeFilter() || undefined,
      from,
      loggedBy: this.mineOnly() ? this.auth.current().staffId : (this.loggedByFilter() ?? undefined),
      cmhw: this.cmhwFilter() ?? undefined,
    };
  }

  private fetchPage(append: boolean): void {
    const token = ++this.fetchToken;
    if (append) this.loadingMore.set(true);
    else this.loading.set(true);

    const f = this.filters();
    this.contactsApi
      .getHistory({
        q: f['q'],
        type: f['type'] as ContactType | undefined,
        outcome: f['outcome'] as ContactOutcome | undefined,
        from: f.from,
        loggedBy: f.loggedBy,
        cmhw: f['cmhw'],
        cursor: append ? (this.nextCursor ?? undefined) : undefined,
        pageSize: PAGE_SIZE,
      })
      .pipe(
        catchError(() => {
          this.error.set('Unable to load contacts right now. Please try again.');
          return of(null);
        }),
      )
      .subscribe((page) => {
        if (token !== this.fetchToken) return;
        this.loading.set(false);
        this.loadingMore.set(false);
        if (!page) return;
        this.rows.update((current) => (append ? [...current, ...page.items] : page.items));
        this.nextCursor = page.nextCursor;
        this.hasMore.set(page.hasMore);
        if (page.totalCount !== null) this.totalCount.set(page.totalCount);
      });
  }

  protected initials(row: ContactHistoryRowDto): string {
    const parts = row.guestName.trim().split(/\s+/);
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
  }

  protected statusLabel(status: GuestStatus): string {
    return status === 'OnHold' ? 'On hold' : status;
  }

  protected openGuest(guestId: string): void {
    this.router.navigate(['/guests', guestId], { queryParams: { tab: 'contacts' } });
  }
}

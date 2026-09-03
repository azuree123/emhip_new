import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, of } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { DashboardsApiService } from '../../core/dashboards-api.service';
import { FollowUpsApiService } from '../../core/follow-ups-api.service';
import { GuestsApiService } from '../../core/guests-api.service';
import { Permissions } from '../../core/permissions';
import { PATHWAY_CATEGORY_OPTIONS, pathwayCategoryLabel } from '../../core/demographic-options';
import { CmhwDashboardDto, FollowUpQueueItemDto, GuestListItemDto, GuestStatus, PathwayCategory } from '../../core/api-models';
import { GuestSeenCardComponent } from './guest-seen-card.component';

/** "Contact Status" pill filters in the design's Filter contacts card. */
type ContactChip = 'all' | 'overdue' | 'today' | 'week';

/** "Sort:" dropdown in the Filter contacts card. */
type ContactSort = 'next' | 'last' | 'name';

const DAY_MS = 24 * 60 * 60 * 1000;

/** The guest endpoint clamps pageSize at 200 — a CMHW caseload fits comfortably in one page. */
const CASELOAD_PAGE = 200;

const SORT_OPTIONS: { value: ContactSort; label: string }[] = [
  { value: 'next', label: 'Sort: next contact date' },
  { value: 'last', label: 'Sort: last activity' },
  { value: 'name', label: 'Sort: guest name' },
];

/** yyyy-MM-dd for a Date in local time. */
function isoDay(date: Date): string {
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

/**
 * CMHW home dashboard — reworked to the new `GuestDataSheet` design (node 1033:5531,
 * project/screens/Components.bundle.js lines 41-2748). Sidebar/header come from the shared
 * shell; this component is the content area only.
 *
 * Sections: static KPI row (design note: "Static KPI cards - no interaction"), overdue-contact
 * banner, "Filter contacts" card, the "Guest Seen" card (GET /dashboards/guests-seen with
 * mine=true — the worker's own contacts), the clinical complexity indicators (spec §5.1,
 * labels supplied by the API) and the "Actions pending today" follow-up list
 * (Mark done → POST /followups/{id}/complete).
 *
 * "Filter contacts" is a real, working filter over the worker's own caseload: the guests
 * assigned to the signed-in CMHW (GET /guests?cmhw=me) with the Pathway dropdown applied
 * server-side, the Contact Status chips bucketing each guest's next scheduled contact
 * (overdue / due today / upcoming this week) and the Sort dropdown ordering the resulting
 * list, which is shown as a table under the chips. The design's "Pathway distribution" card
 * has no backing fields on CmhwDashboardDto and is omitted (see feature report). The urgent
 * banner from the previous iteration is kept — it is real data (urgentBanner) the new design
 * gives no other surface for.
 */
@Component({
  selector: 'app-dashboard-cmhw',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GuestSeenCardComponent],
  templateUrl: './dashboard-cmhw.component.html',
  styleUrl: './dashboard-cmhw.component.scss',
})
export class DashboardCmhwComponent {
  private readonly dashboardsApi = inject(DashboardsApiService);
  private readonly followUpsApi = inject(FollowUpsApiService);
  private readonly guestsApi = inject(GuestsApiService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly data = signal<CmhwDashboardDto | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  /** Open follow-ups for the signed-in worker's caseload — GET /followups. */
  protected readonly queue = signal<FollowUpQueueItemDto[]>([]);
  protected readonly queueState = signal<'loading' | 'ready' | 'unavailable'>('loading');
  /** Follow-up ids with an in-flight "Mark done" call. */
  protected readonly completing = signal<ReadonlySet<string>>(new Set<string>());

  protected readonly canManageFollowUps = this.auth.hasPermission(Permissions.FollowUps.Manage);
  protected readonly canViewGuests = this.auth.hasPermission(Permissions.Guests.View);

  // ---- "Filter contacts" card ----
  /** The worker's assigned guests, already narrowed by the Pathway dropdown server-side. */
  protected readonly caseload = signal<GuestListItemDto[]>([]);
  protected readonly caseloadState = signal<'loading' | 'ready' | 'unavailable'>('loading');
  protected readonly chip = signal<ContactChip>('all');
  protected readonly contactSearch = signal('');
  protected readonly pathwayFilter = signal<'' | PathwayCategory>('');
  protected readonly sortBy = signal<ContactSort>('next');
  protected readonly pathwayOptions = PATHWAY_CATEGORY_OPTIONS;
  protected readonly sortOptions = SORT_OPTIONS;

  /** Search bar under "Actions pending today" is the same box — it filters both lists. */
  protected readonly actionSearch = this.contactSearch;

  private readonly todayIso = isoDay(new Date());
  private readonly weekEndIso = isoDay(new Date(Date.now() + 7 * DAY_MS));
  private caseloadToken = 0;

  protected readonly overdueItems = computed(() => this.queue().filter((i) => i.isOverdue));
  protected readonly dueTodayItems = computed(() =>
    this.queue().filter((i) => !i.isOverdue && i.dueDate.slice(0, 10) === this.todayIso),
  );
  protected readonly upcomingWeekItems = computed(() =>
    this.queue().filter((i) => {
      const day = i.dueDate.slice(0, 10);
      return !i.isOverdue && day > this.todayIso && day <= this.weekEndIso;
    }),
  );
  protected readonly pendingTodayCount = computed(() => this.overdueItems().length + this.dueTodayItems().length);

  /** Banner heading names — "Miriam Kamara and Rashida Begum …" in the design. */
  protected readonly overdueNames = computed(() => {
    const names = this.overdueItems().map((i) => i.guestName);
    if (names.length <= 1) return names[0] ?? '';
    if (names.length === 2) return `${names[0]} and ${names[1]}`;
    return `${names[0]}, ${names[1]} and ${names.length - 2} more`;
  });

  // ---- Contact-status buckets over the caseload (by next scheduled contact) ----
  private bucketOf(guest: GuestListItemDto): Exclude<ContactChip, 'all'> | null {
    const due = guest.nextContactDue?.slice(0, 10) ?? null;
    if (due === null) return null;
    if (due < this.todayIso) return 'overdue';
    if (due === this.todayIso) return 'today';
    if (due <= this.weekEndIso) return 'week';
    return null;
  }

  protected readonly overdueGuests = computed(() => this.caseload().filter((g) => this.bucketOf(g) === 'overdue'));
  protected readonly dueTodayGuests = computed(() => this.caseload().filter((g) => this.bucketOf(g) === 'today'));
  protected readonly upcomingWeekGuests = computed(() => this.caseload().filter((g) => this.bucketOf(g) === 'week'));

  /** The Filter contacts table: chip bucket + search, in the chosen sort order. */
  protected readonly filteredGuests = computed(() => {
    let items: GuestListItemDto[];
    switch (this.chip()) {
      case 'overdue':
        items = this.overdueGuests();
        break;
      case 'today':
        items = this.dueTodayGuests();
        break;
      case 'week':
        items = this.upcomingWeekGuests();
        break;
      default:
        items = this.caseload();
    }
    const q = this.contactSearch().trim().toLowerCase();
    if (q) {
      items = items.filter(
        (g) =>
          `${g.firstName} ${g.lastName}`.toLowerCase().includes(q) ||
          `g-${g.guestNumber}`.includes(q) ||
          (g.assignedCmhwName ?? '').toLowerCase().includes(q),
      );
    }
    const sort = this.sortBy();
    return [...items].sort((a, b) => {
      if (sort === 'name') return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
      if (sort === 'last') return (b.lastContactAt ?? '').localeCompare(a.lastContactAt ?? '');
      // Next contact date: soonest first, guests with nothing scheduled last.
      const ad = a.nextContactDue ?? '9999-12-31';
      const bd = b.nextContactDue ?? '9999-12-31';
      return ad.localeCompare(bd) || `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
    });
  });

  protected readonly filteredActions = computed(() => {
    let items: FollowUpQueueItemDto[];
    switch (this.chip()) {
      case 'overdue':
        items = this.overdueItems();
        break;
      case 'today':
        items = this.dueTodayItems();
        break;
      case 'week':
        items = this.upcomingWeekItems();
        break;
      default:
        items = this.queue();
    }
    const q = this.actionSearch().trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.guestName.toLowerCase().includes(q) || i.assigneeName.toLowerCase().includes(q));
  });

  constructor() {
    this.dashboardsApi
      .getCmhwDashboard()
      .pipe(
        catchError(() => {
          this.error.set('Unable to load the dashboard right now.');
          return of(null);
        }),
      )
      .subscribe((result) => {
        this.loading.set(false);
        this.data.set(result);
      });

    if (this.auth.hasPermission(Permissions.FollowUps.View)) {
      this.followUpsApi
        .getQueue({ pageSize: 100 })
        .pipe(catchError(() => of(null)))
        .subscribe((page) => {
          if (!page) {
            this.queueState.set('unavailable');
            return;
          }
          const open = page.items
            .filter((i) => i.status !== 'Completed' && i.status !== 'Cancelled')
            .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
          this.queue.set(open);
          this.queueState.set('ready');
        });
    } else {
      this.queueState.set('unavailable');
    }

    this.loadCaseload();
  }

  /** GET /guests scoped to the signed-in worker, with the Pathway dropdown applied server-side. */
  private loadCaseload(): void {
    if (!this.canViewGuests) {
      this.caseloadState.set('unavailable');
      return;
    }
    const token = ++this.caseloadToken;
    this.caseloadState.set('loading');
    this.guestsApi
      .getGuestList({
        cmhw: this.auth.current().staffId,
        pathway: this.pathwayFilter() || undefined,
        pageSize: CASELOAD_PAGE,
      })
      .pipe(catchError(() => of(null)))
      .subscribe((page) => {
        if (token !== this.caseloadToken) return;
        if (!page) {
          this.caseloadState.set('unavailable');
          return;
        }
        this.caseload.set(page.items);
        this.caseloadState.set('ready');
      });
  }

  /** KPI number for the three queue-backed cards — em dash while the queue is unavailable. */
  protected queueCount(kind: 'today' | 'overdue' | 'pending'): string {
    if (this.queueState() !== 'ready') return this.queueState() === 'loading' ? '…' : '—';
    switch (kind) {
      case 'today':
        return `${this.dueTodayItems().length}`;
      case 'overdue':
        return `${this.overdueItems().length}`;
      default:
        return `${this.pendingTodayCount()}`;
    }
  }

  protected setChip(chip: ContactChip): void {
    this.chip.set(chip);
  }

  protected onPathwayChange(value: string): void {
    this.pathwayFilter.set(value as '' | PathwayCategory);
    this.loadCaseload();
  }

  protected onSortChange(value: string): void {
    this.sortBy.set(value as ContactSort);
  }

  protected initials(name: string): string {
    const parts = name.trim().split(/\s+/);
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
  }

  protected guestName(g: GuestListItemDto): string {
    return `${g.firstName} ${g.lastName}`;
  }

  protected pathwayLabel(g: GuestListItemDto): string {
    return pathwayCategoryLabel(g.pathwayCategory);
  }

  protected statusLabel(status: GuestStatus): string {
    return status === 'OnHold' ? 'On hold' : status;
  }

  /** Next-contact cell — red when overdue, gold when due today or this week. */
  protected nextContactFor(g: GuestListItemDto): { text: string; tone: 'red' | 'yellow' | 'plain' } {
    const bucket = this.bucketOf(g);
    if (!g.nextContactDue) return { text: 'Not scheduled', tone: 'plain' };
    if (bucket === 'overdue') return { text: `Overdue · ${this.formatDayMonth(g.nextContactDue)}`, tone: 'red' };
    if (bucket === 'today') return { text: 'Due today', tone: 'yellow' };
    if (bucket === 'week') return { text: `Due ${this.formatDayMonth(g.nextContactDue)}`, tone: 'yellow' };
    return { text: this.formatDayMonth(g.nextContactDue), tone: 'plain' };
  }

  protected formatDayMonth(value: string | null): string {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  }

  /** Status line under each action row: red overdue / yellow pending, as in the design. */
  protected statusFor(item: FollowUpQueueItemDto): { text: string; tone: 'red' | 'yellow' } {
    if (item.isOverdue) return { text: `Overdue · was due ${this.formatDayMonth(item.dueDate)}`, tone: 'red' };
    if (item.dueDate.slice(0, 10) === this.todayIso) return { text: 'Due today', tone: 'yellow' };
    return { text: `Due ${this.formatDayMonth(item.dueDate)}`, tone: 'yellow' };
  }

  protected completeFollowUp(item: FollowUpQueueItemDto, event: Event): void {
    event.stopPropagation();
    if (!this.canManageFollowUps || this.completing().has(item.id)) return;
    const started = new Set(this.completing());
    started.add(item.id);
    this.completing.set(started);
    this.followUpsApi.complete(item.id).subscribe({
      next: () => {
        this.queue.set(this.queue().filter((q) => q.id !== item.id));
        const done = new Set(this.completing());
        done.delete(item.id);
        this.completing.set(done);
      },
      error: () => {
        const done = new Set(this.completing());
        done.delete(item.id);
        this.completing.set(done);
      },
    });
  }

  protected openGuest(guestId: string): void {
    this.router.navigate(['/guests', guestId]);
  }

  protected goToUrgentCases(): void {
    this.router.navigate(['/urgent-cases']);
  }
}

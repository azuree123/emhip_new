import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, of } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { DashboardsApiService } from '../../core/dashboards-api.service';
import { FollowUpsApiService } from '../../core/follow-ups-api.service';
import { Permissions } from '../../core/permissions';
import { CmhwDashboardDto, FollowUpQueueItemDto } from '../../core/api-models';

/** "Contact Status" pill filters in the design's Filter contacts card. */
type ContactChip = 'all' | 'overdue' | 'today' | 'week';

const DAY_MS = 24 * 60 * 60 * 1000;

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
 * banner, "Filter contacts" card, and the "Actions pending today" follow-up list (Mark done →
 * POST /followups/{id}/complete). The design's "Pathway distribution" and "Guest Seen" cards
 * have no backing fields on CmhwDashboardDto and are omitted (see feature report). The urgent
 * banner from the previous iteration is kept — it is real data (urgentBanner) the new design
 * gives no other surface for.
 */
@Component({
  selector: 'app-dashboard-cmhw',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard-cmhw.component.html',
  styleUrl: './dashboard-cmhw.component.scss',
})
export class DashboardCmhwComponent {
  private readonly dashboardsApi = inject(DashboardsApiService);
  private readonly followUpsApi = inject(FollowUpsApiService);
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

  protected readonly chip = signal<ContactChip>('all');
  protected readonly actionSearch = signal('');

  private readonly todayIso = isoDay(new Date());
  private readonly weekEndIso = isoDay(new Date(Date.now() + 7 * DAY_MS));

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

  protected initials(name: string): string {
    const parts = name.trim().split(/\s+/);
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
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

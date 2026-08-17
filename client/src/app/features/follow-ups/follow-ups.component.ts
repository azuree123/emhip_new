import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import {
  AddContactRequest,
  ContactOutcome,
  ContactType,
  FollowUpQueueItemDto,
  FollowUpStatus,
  ScheduleFollowUpRequest,
} from '../../core/api-models';
import { FollowUpsApiService } from '../../core/follow-ups-api.service';
import { GuestsApiService } from '../../core/guests-api.service';
import { IconComponent } from '../../design-system/icon.component';

const PAGE_SIZE = 5;

const STATUS_COLORS: Record<FollowUpStatus, { bg: string; fg: string }> = {
  Scheduled: { bg: 'rgb(231,238,255)', fg: 'rgb(52,91,177)' },
  Completed: { bg: 'rgb(220,252,231)', fg: 'rgb(21,128,61)' },
  Overdue: { bg: 'rgb(255,234,236)', fg: 'rgb(225,38,40)' },
  Cancelled: { bg: 'rgb(241,245,249)', fg: 'rgb(51,65,85)' },
};

type DateRangeFilter = '' | 'today' | 'week' | 'month';

/**
 * "Follow-up log" screen — ported from Desktop34 in project/screens/Components.bundle.js.
 * Backed by GET /followups (keyset/cursor pagination per ARCHITECTURE.md: we never offset-paginate,
 * we always pass the opaque `nextCursor` from the previous page back verbatim).
 * Search / entry-type / date-range filters are applied client-side over the loaded pages;
 * the overdue toggle and assignee filter are passed to the API.
 */
@Component({
  selector: 'app-follow-ups',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, IconComponent],
  templateUrl: './follow-ups.component.html',
  styleUrl: './follow-ups.component.scss',
})
export class FollowUpsComponent implements OnInit {
  private readonly followUpsApi = inject(FollowUpsApiService);
  private readonly guestsApi = inject(GuestsApiService);
  private readonly auth = inject(AuthService);

  readonly contactTypes: ContactType[] = ['PhoneCall', 'InPerson', 'VideoCall', 'TextMessage', 'Email'];
  readonly contactOutcomes: ContactOutcome[] = ['Successful', 'NoAnswer', 'LeftMessage', 'Declined', 'Rescheduled'];
  readonly statusOptions: FollowUpStatus[] = ['Scheduled', 'Overdue', 'Completed', 'Cancelled'];

  readonly items = signal<FollowUpQueueItemDto[]>([]);
  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly hasMore = signal(false);
  private cursor: string | null = null;

  // Server-side filters (passed to GET /followups).
  readonly overdueOnly = signal(false);
  readonly assigneeFilter = signal('');

  // Client-side filters over the loaded pages.
  readonly searchText = signal('');
  readonly statusFilter = signal<'' | FollowUpStatus>('');
  readonly dateRange = signal<DateRangeFilter>('');

  readonly now = new Date();
  readonly weekStart = FollowUpsComponent.startOfWeek(new Date());
  readonly userName = this.auth.current().displayName;

  readonly visibleItems = computed(() => {
    const q = this.searchText().trim().toLowerCase();
    const status = this.statusFilter();
    const range = this.dateRange();
    return this.items().filter((i) => {
      if (q && !(`${i.guestName} ${i.assigneeName} ${i.id}`.toLowerCase().includes(q))) return false;
      if (status && i.status !== status) return false;
      if (range && !this.inRange(i.dueDate, range)) return false;
      return true;
    });
  });

  // Stats reflect only what has been loaded so far — keyset pagination means we deliberately
  // never fetch the whole queue just to compute a total. (The design's static "Entries today /
  // This week / This month / Logged by you today" tiles are mapped onto due-date buckets and
  // the current user's assignments, the nearest real fields in FollowUpQueueItemDto.)
  readonly dueTodayCount = computed(() => this.items().filter((i) => this.inRange(i.dueDate, 'today')).length);
  readonly dueTodayGuests = computed(
    () => new Set(this.items().filter((i) => this.inRange(i.dueDate, 'today')).map((i) => i.guestId)).size,
  );
  readonly dueThisWeekCount = computed(() => this.items().filter((i) => this.inRange(i.dueDate, 'week')).length);
  readonly dueThisMonthCount = computed(() => this.items().filter((i) => this.inRange(i.dueDate, 'month')).length);
  readonly assignedToMeCount = computed(() => this.items().filter((i) => i.assigneeName === this.userName).length);

  readonly modalOpen = signal(false);
  readonly modalMode = signal<'schedule' | 'contact'>('schedule');
  readonly modalGuestId = signal('');
  readonly modalGuestName = signal<string | null>(null);
  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);
  readonly exporting = signal(false);

  scheduleForm = { dueDate: '', assigneeStaffId: this.auth.current().staffId, notes: '' };
  contactForm = { type: 'PhoneCall' as ContactType, outcome: 'Successful' as ContactOutcome, occurredAt: this.nowLocal(), notes: '' };

  ngOnInit(): void {
    this.loadFirstPage();
  }

  statusColor(status: string): { bg: string; fg: string } {
    return STATUS_COLORS[status as FollowUpStatus] ?? { bg: 'rgb(240,240,240)', fg: 'rgb(50,50,50)' };
  }

  /** Short human-readable reference derived from the follow-up id (no ref number exists in the DTO). */
  refLabel(item: FollowUpQueueItemDto): string {
    return item.id.replace(/-/g, '').slice(0, 6).toUpperCase();
  }

  private static startOfWeek(d: Date): Date {
    const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const day = (out.getDay() + 6) % 7; // Monday-based
    out.setDate(out.getDate() - day);
    return out;
  }

  private inRange(iso: string, range: Exclude<DateRangeFilter, ''>): boolean {
    const d = new Date(iso);
    const today = new Date();
    if (range === 'today') {
      return (
        d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate()
      );
    }
    if (range === 'week') {
      const start = FollowUpsComponent.startOfWeek(today);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      return d >= start && d < end;
    }
    return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth();
  }

  loadFirstPage(): void {
    this.cursor = null;
    this.items.set([]);
    this.hasMore.set(false);
    this.fetchPage(true);
  }

  loadMore(): void {
    if (!this.hasMore() || this.loading()) return;
    this.fetchPage(false);
  }

  private fetchPage(reset: boolean): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.followUpsApi
      .getQueue({
        overdue: this.overdueOnly() || undefined,
        assignee: this.assigneeFilter().trim() || undefined,
        cursor: reset ? undefined : (this.cursor ?? undefined),
        pageSize: PAGE_SIZE,
      })
      .subscribe({
        next: (page) => {
          this.items.update((cur) => (reset ? page.items : [...cur, ...page.items]));
          this.cursor = page.nextCursor;
          this.hasMore.set(page.hasMore);
          this.loading.set(false);
        },
        error: () => {
          this.loadError.set('Could not load the follow-up queue. The API may be unavailable.');
          this.loading.set(false);
        },
      });
  }

  setOverdueOnly(value: boolean): void {
    this.overdueOnly.set(value);
    this.loadFirstPage();
  }

  applyAssigneeFilter(): void {
    this.loadFirstPage();
  }

  complete(item: FollowUpQueueItemDto): void {
    this.followUpsApi.complete(item.id).subscribe({
      next: () =>
        this.items.update((cur) => cur.map((i) => (i.id === item.id ? { ...i, status: 'Completed', isOverdue: false } : i))),
      error: () => this.loadError.set('Could not mark this follow-up complete.'),
    });
  }

  openAddForGuest(guestId: string, guestName: string): void {
    this.modalGuestId.set(guestId);
    this.modalGuestName.set(guestName);
    this.resetModalForms();
    this.modalOpen.set(true);
  }

  openAddNew(): void {
    this.modalGuestId.set('');
    this.modalGuestName.set(null);
    this.resetModalForms();
    this.modalOpen.set(true);
  }

  private resetModalForms(): void {
    this.modalMode.set('schedule');
    this.saveError.set(null);
    this.scheduleForm = { dueDate: '', assigneeStaffId: this.auth.current().staffId, notes: '' };
    this.contactForm = { type: 'PhoneCall', outcome: 'Successful', occurredAt: this.nowLocal(), notes: '' };
  }

  closeModal(): void {
    this.modalOpen.set(false);
  }

  submitModal(): void {
    const guestId = this.modalGuestId().trim();
    if (!guestId) {
      this.saveError.set('Guest ID is required.');
      return;
    }
    this.saving.set(true);
    this.saveError.set(null);
    const done = () => {
      this.saving.set(false);
      this.modalOpen.set(false);
      this.loadFirstPage();
    };
    const fail = (msg: string) => {
      this.saving.set(false);
      this.saveError.set(msg);
    };

    if (this.modalMode() === 'schedule') {
      if (!this.scheduleForm.dueDate || !this.scheduleForm.assigneeStaffId) {
        this.saving.set(false);
        this.saveError.set('Due date and assignee are required.');
        return;
      }
      const req: ScheduleFollowUpRequest = {
        dueDate: new Date(this.scheduleForm.dueDate).toISOString(),
        assigneeStaffId: this.scheduleForm.assigneeStaffId,
        notes: this.scheduleForm.notes || null,
      };
      this.guestsApi.scheduleFollowUp(guestId, req).subscribe({ next: done, error: () => fail('Could not schedule the follow-up.') });
    } else {
      if (!this.contactForm.occurredAt) {
        this.saving.set(false);
        this.saveError.set('Date/time of contact is required.');
        return;
      }
      const req: AddContactRequest = {
        type: this.contactForm.type,
        outcome: this.contactForm.outcome,
        occurredAt: new Date(this.contactForm.occurredAt).toISOString(),
        notes: this.contactForm.notes || null,
      };
      this.guestsApi.addContact(guestId, req).subscribe({ next: done, error: () => fail('Could not log the contact.') });
    }
  }

  exportCsv(): void {
    const rows = this.visibleItems();
    if (!rows.length || this.exporting()) return;
    this.exporting.set(true);
    try {
      const header = ['Ref', 'Guest', 'Due date', 'Status', 'Assignee', 'Overdue'];
      const lines = rows.map((r) => [this.refLabel(r), r.guestName, r.dueDate, r.status, r.assigneeName, r.isOverdue ? 'Yes' : 'No']);
      const csv = [header, ...lines].map((cols) => cols.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'follow-up-log.csv';
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      this.exporting.set(false);
    }
  }

  private nowLocal(): string {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  }
}

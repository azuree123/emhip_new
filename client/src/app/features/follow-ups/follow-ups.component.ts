import { CommonModule, formatDate } from '@angular/common';
import { Component, OnInit, computed, effect, inject, signal, viewChild } from '@angular/core';
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
import { CustomFieldsComponent } from '../../shared/custom-fields.component';
import { GuestPickerComponent } from '../../shared/guest-picker.component';
import { StaffPickerComponent } from '../../shared/staff-picker.component';

const PAGE_SIZE = 5;

const STATUS_COLORS: Record<FollowUpStatus, { bg: string; fg: string }> = {
  Scheduled: { bg: 'rgb(231,238,255)', fg: 'rgb(52,91,177)' },
  Completed: { bg: 'rgb(220,252,231)', fg: 'rgb(21,128,61)' },
  Overdue: { bg: 'rgb(255,234,236)', fg: 'rgb(225,38,40)' },
  Cancelled: { bg: 'rgb(241,245,249)', fg: 'rgb(51,65,85)' },
};

type DateRangeFilter = '' | 'today' | 'week' | 'month';

/**
 * "Follow-up log" screen — restyled after Desktop58/Desktop65 in
 * project/screens/Components.bundle.js (the due/overdue queue design: red overdue alert banner,
 * stat tiles with plain sub-labels, 185px row cards with a right-hand countdown column and a
 * record-contact affordance; the post-record confirmation state reuses the design's green
 * "Resolved" pill / "Follow-up logged" chip).
 * Backed by GET /followups (keyset/cursor pagination per ARCHITECTURE.md: we never offset-paginate,
 * we always pass the opaque `nextCursor` from the previous page back verbatim).
 * Search / status / date-range filters are applied client-side over the loaded pages;
 * the overdue toggle and assignee filter are passed to the API.
 */
@Component({
  selector: 'app-follow-ups',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    IconComponent,
    StaffPickerComponent,
    GuestPickerComponent,
    CustomFieldsComponent,
  ],
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
  /** Total matching entries — only the first keyset page carries it, so we hold on to it. */
  readonly totalCount = signal<number | null>(null);
  private cursor: string | null = null;

  // Server-side filters (passed to GET /followups).
  readonly overdueOnly = signal(false);
  readonly assigneeFilter = signal('');

  // Client-side filters over the loaded pages.
  readonly searchText = signal('');
  readonly statusFilter = signal<'' | FollowUpStatus>('');
  readonly dateRange = signal<DateRangeFilter>('');

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
  readonly assignedToMeCount = computed(() => this.items().filter((i) => i.assigneeName === this.userName).length);
  readonly overdueLoadedCount = computed(() => this.items().filter((i) => i.isOverdue).length);

  readonly modalOpen = signal(false);
  readonly modalMode = signal<'schedule' | 'contact'>('schedule');
  readonly modalGuestId = signal('');
  readonly modalGuestName = signal<string | null>(null);
  /** Set when the modal was opened from a specific queue row — drives the recorded state on that row. */
  readonly modalFollowUpId = signal<string | null>(null);
  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);
  readonly exporting = signal(false);

  /** followUpId -> occurredAt ISO of a contact recorded this session (the Desktop65 recorded state). */
  readonly recordedContact = signal<Record<string, string>>({});
  readonly successMsg = signal<string | null>(null);

  scheduleForm = { dueDate: '', assigneeStaffId: this.auth.current().staffId, notes: '' };
  contactForm = { type: 'PhoneCall' as ContactType, outcome: 'Successful' as ContactOutcome, occurredAt: this.nowLocal(), notes: '' };

  // ---- Admin-defined extra fields (one panel per modal tab) ---------------

  private readonly followUpFields = viewChild<CustomFieldsComponent>('followUpFields');
  private readonly contactFields = viewChild<CustomFieldsComponent>('contactFields');
  /** Mirror the panels' own hasFields(), so an unconfigured form looks exactly as it did before. */
  readonly hasFollowUpFields = signal(false);
  readonly hasContactFields = signal(false);
  /**
   * Set when the follow-up/contact was created but its extra answers were rejected — Save then
   * retries only the answers, so a second press can never create a duplicate record.
   */
  private pendingExtras: (() => void) | null = null;

  constructor() {
    effect(() => this.hasFollowUpFields.set(this.followUpFields()?.hasFields() ?? false));
    effect(() => this.hasContactFields.set(this.contactFields()?.hasFields() ?? false));
  }

  ngOnInit(): void {
    this.loadFirstPage();
  }

  statusColor(status: string): { bg: string; fg: string } {
    return STATUS_COLORS[status as FollowUpStatus] ?? { bg: 'rgb(240,240,240)', fg: 'rgb(50,50,50)' };
  }

  /** Real sequential guest reference — api-models: render as "G-{guestNumber}". */
  refLabel(item: FollowUpQueueItemDto): string {
    return `G-${item.guestNumber}`;
  }

  /** "of Y entries" — real total from the first keyset page, else the loaded count. */
  readonly totalLabel = computed(() => {
    const total = this.totalCount();
    return total !== null ? `${total}` : `${this.items().length}${this.hasMore() ? '+' : ''}`;
  });

  /** Right-hand countdown column, Desktop58-style: "18h overdue" / "11h left" against dueDate. */
  windowLabel(item: FollowUpQueueItemDto): { text: string; cls: 'overdue' | 'left' | 'done' | 'muted' } {
    if (item.status === 'Completed') return { text: 'Completed', cls: 'done' };
    if (item.status === 'Cancelled') return { text: 'Cancelled', cls: 'muted' };
    const hrs = (new Date(item.dueDate).getTime() - Date.now()) / 3_600_000;
    if (hrs <= 0) return { text: `${FollowUpsComponent.formatDelta(hrs)} overdue`, cls: 'overdue' };
    if (item.isOverdue) return { text: 'Overdue', cls: 'overdue' };
    return { text: `${FollowUpsComponent.formatDelta(hrs)} left`, cls: 'left' };
  }

  /** Second line under the countdown: "Due by 22:00 today" / "Was due 12 May, 10:00 AM". */
  deadlineLabel(item: FollowUpQueueItemDto): string {
    const due = new Date(item.dueDate);
    if (item.status === 'Completed' || item.status === 'Cancelled') {
      return `Due ${formatDate(due, 'd MMM y', 'en-US')}`;
    }
    if (due.getTime() <= Date.now()) {
      return `Was due ${formatDate(due, 'd MMM, h:mm a', 'en-US')}`;
    }
    const time = formatDate(due, 'HH:mm', 'en-US');
    const today = new Date();
    const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    if (FollowUpsComponent.sameDay(due, today)) return `Due by ${time} today`;
    if (FollowUpsComponent.sameDay(due, tomorrow)) return `Due by ${time} tomorrow`;
    return `Due by ${time}, ${formatDate(due, 'd MMM', 'en-US')}`;
  }

  private static formatDelta(hours: number): string {
    const total = Math.abs(hours);
    if (total >= 48) {
      const d = Math.floor(total / 24);
      const h = Math.round(total % 24);
      return h > 0 ? `${d}d ${h}h` : `${d}d`;
    }
    return `${Math.max(1, Math.round(total))}h`;
  }

  private static sameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  scrollToOverdue(): void {
    document.querySelector('.row--overdue')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
    this.totalCount.set(null);
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
          if (page.totalCount !== null) this.totalCount.set(page.totalCount);
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

  /** Assignee filter — the picker yields a staff id, which is what GET /followups?assignee= expects. */
  setAssigneeFilter(staffId: string | null): void {
    this.assigneeFilter.set(staffId ?? '');
    this.loadFirstPage();
  }

  complete(item: FollowUpQueueItemDto): void {
    this.followUpsApi.complete(item.id).subscribe({
      next: () =>
        this.items.update((cur) => cur.map((i) => (i.id === item.id ? { ...i, status: 'Completed', isOverdue: false } : i))),
      error: () => this.loadError.set('Could not mark this follow-up complete.'),
    });
  }

  /** Record-contact affordance on a due/overdue row (Desktop58's "Log follow up"). */
  openContactForItem(item: FollowUpQueueItemDto): void {
    this.modalGuestId.set(item.guestId);
    this.modalGuestName.set(item.guestName);
    this.modalFollowUpId.set(item.id);
    this.resetModalForms();
    this.modalMode.set('contact');
    this.modalOpen.set(true);
  }

  openAddNew(): void {
    this.modalGuestId.set('');
    this.modalGuestName.set(null);
    this.modalFollowUpId.set(null);
    this.resetModalForms();
    this.modalOpen.set(true);
  }

  private resetModalForms(): void {
    this.modalMode.set('schedule');
    this.saveError.set(null);
    this.pendingExtras = null;
    this.scheduleForm = { dueDate: '', assigneeStaffId: this.auth.current().staffId, notes: '' };
    this.contactForm = { type: 'PhoneCall', outcome: 'Successful', occurredAt: this.nowLocal(), notes: '' };
  }

  closeModal(): void {
    // The record itself was created — only its extras failed — so the queue is stale on the way out.
    const hadPendingExtras = this.pendingExtras !== null;
    this.pendingExtras = null;
    this.modalOpen.set(false);
    if (hadPendingExtras) {
      this.loadFirstPage();
    }
  }

  submitModal(): void {
    // Retry path: the record exists, only the extra answers still have to land.
    const retry = this.pendingExtras;
    if (retry) {
      this.saving.set(true);
      this.saveError.set(null);
      retry();
      return;
    }

    const guestId = this.modalGuestId().trim();
    if (!guestId) {
      this.saveError.set('Select a guest.');
      return;
    }
    const panel = this.modalMode() === 'schedule' ? this.followUpFields() : this.contactFields();
    if (panel?.hasFields() && !panel.isValid()) {
      panel.showErrors.set(true);
      this.saveError.set('Complete the required additional fields.');
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
      this.guestsApi.scheduleFollowUp(guestId, req).subscribe({
        next: ({ id }) => this.saveExtras(panel, id, 'The follow-up was scheduled', done),
        error: () => fail('Could not schedule the follow-up.'),
      });
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
      const followUpId = this.modalFollowUpId();
      const guestName = this.modalGuestName();
      const recorded = () => {
        this.saving.set(false);
        this.modalOpen.set(false);
        if (followUpId) {
          // Recorded state (Desktop65): annotate the row in place instead of reloading, so the
          // loaded keyset pages (and the confirmation chip) survive.
          this.recordedContact.update((m) => ({ ...m, [followUpId]: req.occurredAt }));
          this.successMsg.set(
            `Contact recorded for ${guestName ?? 'guest'} — ${formatDate(req.occurredAt, 'd MMM, h:mm a', 'en-US')}.`,
          );
        } else {
          this.loadFirstPage();
        }
      };
      this.guestsApi.addContact(guestId, req).subscribe({
        next: ({ id }) => this.saveExtras(panel, id, 'The contact was recorded', recorded),
        error: () => fail('Could not log the contact.'),
      });
    }
  }

  /**
   * Second leg of the save: the record already exists here, so a rejection is reported as
   * "record saved, extra fields weren't" and the modal stays open to retry just the answers.
   */
  private saveExtras(panel: CustomFieldsComponent | undefined, entityId: string, created: string, done: () => void): void {
    if (!panel?.hasFields()) {
      this.pendingExtras = null;
      done();
      return;
    }
    panel.saveFor(entityId).subscribe({
      next: () => {
        this.pendingExtras = null;
        done();
      },
      error: () => {
        this.pendingExtras = () => this.saveExtras(panel, entityId, created, done);
        this.saving.set(false);
        this.saveError.set(`${created}, but its additional information could not be saved. Save again to retry.`);
      },
    });
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

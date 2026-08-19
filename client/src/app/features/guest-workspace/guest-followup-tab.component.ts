import { Component, EventEmitter, Output, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FollowUpItemDto, GuestFollowUpsDto, ScheduleFollowUpRequest } from '../../core/api-models';
import { AuthService } from '../../core/auth.service';
import { GuestsApiService } from '../../core/guests-api.service';
import { StaffPickerComponent } from '../../shared/staff-picker.component';
import { followUpStatusChip, formatDate, formatDateTime } from './guest-workspace.util';

/**
 * Follow-up tab — visual language pixel-sourced from GuestFollowUpTab in
 * project/screens/Components.bundle.js (lines 27147–29090): one wide card with a free-text
 * keyword search, a segmented filter and a timeline rail of bordered entry tiles. The
 * source screen's entries are activity-log samples with Casework/Activity/AFA/Hospitality
 * categories that have no backing field here, so the segments filter by follow-up status
 * instead and each tile renders a FollowUpItemDto (due date + status chip, notes, assignee).
 */
@Component({
  selector: 'app-guest-followup-tab',
  standalone: true,
  imports: [FormsModule, StaffPickerComponent],
  templateUrl: './guest-followup-tab.component.html',
  styleUrl: './guest-followup-tab.component.scss',
})
export class GuestFollowUpTabComponent {
  private readonly guestsApi = inject(GuestsApiService);
  private readonly auth = inject(AuthService);

  readonly guestId = input.required<string>();
  @Output() readonly refresh = new EventEmitter<void>();

  readonly followUps = signal<GuestFollowUpsDto | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly search = signal('');
  readonly statusFilter = signal<string>('All');
  readonly statusSegments = ['All', 'Scheduled', 'Completed', 'Overdue', 'Cancelled'];

  readonly filtered = computed<FollowUpItemDto[]>(() => {
    const items = this.followUps()?.followUps ?? [];
    const status = this.statusFilter();
    const query = this.search().trim().toLowerCase();
    return items.filter((item) => {
      if (status !== 'All' && item.status !== status) return false;
      if (!query) return true;
      return (
        (item.notes ?? '').toLowerCase().includes(query) ||
        item.assigneeName.toLowerCase().includes(query)
      );
    });
  });

  readonly showForm = signal(false);
  readonly submitting = signal(false);
  readonly submitError = signal<string | null>(null);

  readonly formatDate = formatDate;
  readonly formatDateTime = formatDateTime;
  readonly followUpStatusChip = followUpStatusChip;

  form: ScheduleFollowUpRequest = this.emptyForm();

  constructor() {
    effect((onCleanup) => {
      const id = this.guestId();
      let cancelled = false;
      onCleanup(() => (cancelled = true));
      this.load(id, () => cancelled);
    });
  }

  private emptyForm(): ScheduleFollowUpRequest {
    // Default the assignee to the signed-in worker — the API requires a valid staff GUID.
    return {
      dueDate: new Date().toISOString().slice(0, 10),
      assigneeStaffId: this.auth.current().staffId,
      notes: '',
    };
  }

  private load(guestId: string, isCancelled: () => boolean): void {
    this.loading.set(true);
    this.error.set(null);
    this.guestsApi.getFollowUps(guestId).subscribe({
      next: (dto) => {
        if (isCancelled()) return;
        this.followUps.set(dto);
        this.loading.set(false);
      },
      error: () => {
        if (isCancelled()) return;
        this.error.set('Could not load follow-ups for this guest.');
        this.loading.set(false);
      },
    });
  }

  toggleForm(): void {
    this.showForm.update((v) => !v);
    this.form = this.emptyForm();
    this.submitError.set(null);
  }

  submit(): void {
    if (!this.form.assigneeStaffId) {
      this.submitError.set('An assignee is required.');
      return;
    }
    this.submitting.set(true);
    this.submitError.set(null);
    this.guestsApi.scheduleFollowUp(this.guestId(), this.form).subscribe({
      next: () => {
        this.submitting.set(false);
        this.showForm.set(false);
        this.load(this.guestId(), () => false);
        this.refresh.emit();
      },
      error: () => {
        this.submitting.set(false);
        this.submitError.set('Could not schedule this follow-up. Please try again.');
      },
    });
  }
}

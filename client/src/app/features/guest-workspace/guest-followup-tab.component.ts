import { Component, EventEmitter, Output, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GuestFollowUpsDto, ScheduleFollowUpRequest } from '../../core/api-models';
import { GuestsApiService } from '../../core/guests-api.service';
import { followUpStatusChip, formatDate, formatDateTime } from './guest-workspace.util';

/** Follow-up tab — clean panel over GuestFollowUpsDto, plus a form to schedule a new
 *  follow-up (due date + assignee staff id + notes) via scheduleFollowUp. */
@Component({
  selector: 'app-guest-followup-tab',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './guest-followup-tab.component.html',
  styleUrl: './guest-followup-tab.component.scss',
})
export class GuestFollowUpTabComponent {
  private readonly guestsApi = inject(GuestsApiService);

  readonly guestId = input.required<string>();
  @Output() readonly refresh = new EventEmitter<void>();

  readonly followUps = signal<GuestFollowUpsDto | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

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
    return { dueDate: new Date().toISOString().slice(0, 10), assigneeStaffId: '', notes: '' };
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

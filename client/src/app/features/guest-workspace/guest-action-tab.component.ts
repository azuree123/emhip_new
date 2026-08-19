import { Component, EventEmitter, Output, computed, effect, inject, input, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable, map, of, switchMap } from 'rxjs';
import { GuestActionDto, GuestActionRequest } from '../../core/api-models';
import { GuestsApiService } from '../../core/guests-api.service';
import { CustomFieldsComponent } from '../../shared/custom-fields.component';
import { StaffPickerComponent } from '../../shared/staff-picker.component';
import { formatDate } from './guest-workspace.util';

/**
 * Actions & Reminders tab — pixel-sourced from GuestActionTab in
 * project/screens/Components.bundle.js (lines 31430–33912): an "open actions" card with the
 * red "Add Actions" button and an Action / Due date / Assigned to / Actions table (unchecked
 * green-tick checkboxes, red "13 May — overdue" and gold "15 May — due soon" due dates,
 * outline Edit/Delete buttons), plus a "Completed actions" card whose rows show the active
 * green checkbox with struck-through text and a Delete button only.
 *
 * The add/edit form also carries the admin-defined extra GuestAction fields. Editing an
 * existing action loads its answers (entityId bound to editingId); adding one runs the
 * deferred flow — the answers are typed before the action exists and are saved with
 * saveFor(newId) as soon as addAction() returns the id. The panel renders nothing (and the
 * form is untouched) when no extra fields are configured.
 */
@Component({
  selector: 'emhip-guest-action-tab',
  standalone: true,
  imports: [FormsModule, StaffPickerComponent, CustomFieldsComponent],
  templateUrl: './guest-action-tab.component.html',
  styleUrl: './guest-action-tab.component.scss',
})
export class GuestActionTabComponent {
  private readonly guestsApi = inject(GuestsApiService);

  readonly guestId = input.required<string>();
  @Output() readonly refresh = new EventEmitter<void>();

  readonly actions = signal<GuestActionDto[] | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly openActions = computed(() => (this.actions() ?? []).filter((a) => !a.isCompleted));
  readonly completedActions = computed(() => (this.actions() ?? []).filter((a) => a.isCompleted));

  readonly showForm = signal(false);
  /** Id of the action being edited, or null when the form is adding a new one. */
  readonly editingId = signal<string | null>(null);
  readonly submitting = signal(false);
  readonly submitError = signal<string | null>(null);
  /** Id of the action currently being toggled/deleted, to disable its row controls. */
  readonly busyId = signal<string | null>(null);

  /** Admin-defined extra GuestAction fields, rendered inside the add/edit form. */
  private readonly customFields = viewChild(CustomFieldsComponent);
  readonly hasCustomFields = computed(() => this.customFields()?.hasFields() ?? false);
  /**
   * Id of an action that was just created but whose extra fields failed to save — a retry then
   * updates that action instead of adding a second one.
   */
  private readonly createdActionId = signal<string | null>(null);

  readonly formatDate = formatDate;

  form: GuestActionRequest = this.emptyForm();

  constructor() {
    effect((onCleanup) => {
      const id = this.guestId();
      let cancelled = false;
      onCleanup(() => (cancelled = true));
      this.load(id, () => cancelled);
    });
  }

  private emptyForm(): GuestActionRequest {
    return {
      description: '',
      dueDate: new Date().toISOString().slice(0, 10),
      assignedToStaffId: null,
      isCompleted: false,
    };
  }

  private load(guestId: string, isCancelled: () => boolean): void {
    this.loading.set(true);
    this.error.set(null);
    this.guestsApi.getActions(guestId).subscribe({
      next: (items) => {
        if (isCancelled()) return;
        this.actions.set(items);
        this.loading.set(false);
      },
      error: () => {
        if (isCancelled()) return;
        this.error.set('Could not load actions for this guest.');
        this.loading.set(false);
      },
    });
  }

  /** "13 May — overdue" / "15 May — due soon" / "20 May 2025", as in the design table. */
  dueLabel(action: GuestActionDto): string {
    const date = new Date(action.dueDate);
    if (Number.isNaN(date.getTime())) return '—';
    const short = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    if (action.isCompleted) return formatDate(action.dueDate);
    if (action.isOverdue) return `${short} — overdue`;
    const daysAhead = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysAhead <= 3) return `${short} — due soon`;
    return formatDate(action.dueDate);
  }

  dueState(action: GuestActionDto): 'overdue' | 'soon' | 'normal' {
    if (action.isCompleted) return 'normal';
    if (action.isOverdue) return 'overdue';
    const date = new Date(action.dueDate);
    if (Number.isNaN(date.getTime())) return 'normal';
    const daysAhead = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysAhead <= 3 ? 'soon' : 'normal';
  }

  openAddForm(): void {
    if (this.showForm() && this.editingId() === null) {
      this.closeForm();
      return;
    }
    this.form = this.emptyForm();
    this.editingId.set(null);
    this.createdActionId.set(null);
    this.submitError.set(null);
    this.showForm.set(true);
  }

  openEditForm(action: GuestActionDto): void {
    this.form = {
      description: action.description,
      dueDate: action.dueDate,
      assignedToStaffId: action.assignedToStaffId,
      isCompleted: action.isCompleted,
    };
    this.editingId.set(action.id);
    this.createdActionId.set(null);
    this.submitError.set(null);
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editingId.set(null);
    this.createdActionId.set(null);
    this.submitError.set(null);
  }

  submit(): void {
    if (!this.form.description.trim()) {
      this.submitError.set('A description is required.');
      return;
    }
    const panel = this.customFields();
    if (panel?.hasFields() && !panel.isValid()) {
      panel.showErrors.set(true);
      this.submitError.set('Complete the required additional fields.');
      return;
    }
    this.submitting.set(true);
    this.submitError.set(null);
    // An add whose extra fields failed to save left a real action behind — retry updates it.
    const existingId = this.editingId() ?? this.createdActionId();
    const saved$: Observable<string> = existingId
      ? this.guestsApi.updateAction(this.guestId(), existingId, this.form).pipe(map(() => existingId))
      : this.guestsApi.addAction(this.guestId(), this.form).pipe(map((res) => res.id));
    saved$
      .pipe(
        // The answers are typed before a new action exists, so they are saved against its id
        // the moment addAction() hands one back; an edit saves against the action being edited.
        switchMap((id) => {
          this.createdActionId.set(id);
          return panel?.hasFields() ? panel.saveFor(id) : of(void 0);
        }),
      )
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.closeForm();
          this.load(this.guestId(), () => false);
          this.refresh.emit();
        },
        error: () => {
          this.submitting.set(false);
          this.submitError.set('Could not save this action. Please try again.');
        },
      });
  }

  toggleComplete(action: GuestActionDto): void {
    if (this.busyId()) return;
    this.busyId.set(action.id);
    const request: GuestActionRequest = {
      description: action.description,
      dueDate: action.dueDate,
      assignedToStaffId: action.assignedToStaffId,
      isCompleted: !action.isCompleted,
    };
    this.guestsApi.updateAction(this.guestId(), action.id, request).subscribe({
      next: () => {
        this.busyId.set(null);
        this.load(this.guestId(), () => false);
        this.refresh.emit();
      },
      error: () => this.busyId.set(null),
    });
  }

  deleteAction(action: GuestActionDto): void {
    if (this.busyId()) return;
    this.busyId.set(action.id);
    this.guestsApi.deleteAction(this.guestId(), action.id).subscribe({
      next: () => {
        this.busyId.set(null);
        if (this.editingId() === action.id) this.closeForm();
        this.load(this.guestId(), () => false);
        this.refresh.emit();
      },
      error: () => this.busyId.set(null),
    });
  }
}

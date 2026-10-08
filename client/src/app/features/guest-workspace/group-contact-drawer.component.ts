import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GuestSuggestionDto, LookupItemDto } from '../../core/api-models';
import { AuthService } from '../../core/auth.service';
import { GuestsApiService } from '../../core/guests-api.service';
import { SettingsApiService } from '../../core/settings-api.service';
import { GuestPickerComponent } from '../../shared/guest-picker.component';

/** A guest added to the session; `highRisk` is their own Activity risk check. */
interface Attendee {
  guestId: string;
  label: string;
  highRisk: boolean;
}

export type GroupContactCategory = 'Activity' | 'Hospitality';

/** A guest the drawer opens with already on the list (the profile it was opened from). */
export interface GroupContactGuest {
  guestId: string;
  label: string;
}

/** Mirrors LogGroupContactCommandValidator.MaxAttendees. */
const MAX_ATTENDEES = 60;

/** yyyy-MM-dd in the browser's local time. */
function today(): string {
  const d = new Date();
  const pad = (n: number) => `${n}`.padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * "Log group contact" — one Activity or Hospitality contact for every guest at a session
 * (customer feedback, Oct 2026: an activity can have ten guests, and opening ten profiles to log
 * the same contact is not workable). POST /guests/group-contacts writes, for each guest, exactly
 * what the Add Contact popup's Activity / Hospitality form writes, so each guest's Contact
 * History, the Contact History screen's counts and the reports see ten ordinary contacts.
 *
 * The fields are the Add Contact short forms': Activity asks for the hub activity (or the
 * occasion), observation notes and a risk check — kept per guest here, since one guest's risk is
 * not the group's; Hospitality has optional notes only, and its date is auto-logged as today.
 * Opened from the Contact History screen (empty) or a guest's Add Contact popup (that guest
 * already on the list).
 */
@Component({
  selector: 'emhip-group-contact-drawer',
  standalone: true,
  imports: [FormsModule, GuestPickerComponent],
  templateUrl: './group-contact-drawer.component.html',
  styleUrl: './group-contact-drawer.component.scss',
})
export class GroupContactDrawerComponent implements OnInit {
  private readonly guestsApi = inject(GuestsApiService);
  private readonly settingsApi = inject(SettingsApiService);
  private readonly auth = inject(AuthService);
  private readonly picker = viewChild(GuestPickerComponent);

  readonly initialCategory = input<GroupContactCategory>('Activity');
  readonly initialGuests = input<GroupContactGuest[]>([]);

  /** Emits the number of guests the contact was logged for. */
  readonly saved = output<number>();
  readonly closed = output<void>();

  readonly categories: { value: GroupContactCategory; label: string }[] = [
    { value: 'Activity', label: 'ACTIVITY' },
    { value: 'Hospitality', label: 'HOSPITALITY' },
  ];
  readonly maxAttendees = MAX_ATTENDEES;
  readonly loggedBy = this.auth.current().displayName || '—';

  readonly category = signal<GroupContactCategory>('Activity');
  readonly attendees = signal<Attendee[]>([]);
  readonly activities = signal<LookupItemDto[]>([]);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  /** "Already on the list" and similar hints under the guest search. */
  readonly pickerHint = signal<string | null>(null);

  occurredOn = today();
  activityType = '';
  occasion = '';
  notes = '';

  readonly isActivity = computed(() => this.category() === 'Activity');
  readonly submitLabel = computed(() => {
    const n = this.attendees().length;
    if (this.saving()) return 'Logging…';
    return n ? `Log for ${n} guest${n === 1 ? '' : 's'}` : 'Log group contact';
  });

  ngOnInit(): void {
    this.category.set(this.initialCategory());
    this.attendees.set(this.initialGuests().map((g) => ({ guestId: g.guestId, label: g.label, highRisk: false })));
    this.settingsApi.getLookups('HubActivity').subscribe({
      next: (items) => this.activities.set(items),
      // The free-text occasion still lets an activity be logged without the list.
      error: () => this.activities.set([]),
    });
  }

  setCategory(value: GroupContactCategory): void {
    this.category.set(value);
    // A hospitality contact's date is auto-logged as today (design).
    if (value === 'Hospitality') this.occurredOn = today();
    this.error.set(null);
  }

  addGuest(guest: GuestSuggestionDto): void {
    // Clear the search straight away so the next name can be typed.
    queueMicrotask(() => this.picker()?.clear());
    if (this.attendees().some((a) => a.guestId === guest.id)) {
      this.pickerHint.set(`${guest.fullName} is already on the list.`);
      return;
    }
    if (this.attendees().length >= MAX_ATTENDEES) {
      this.pickerHint.set(`A group contact can include up to ${MAX_ATTENDEES} guests.`);
      return;
    }
    this.pickerHint.set(null);
    this.error.set(null);
    this.attendees.update((list) => [...list, { guestId: guest.id, label: `${guest.fullName} · G-${guest.guestNumber}`, highRisk: false }]);
  }

  removeGuest(guestId: string): void {
    this.attendees.update((list) => list.filter((a) => a.guestId !== guestId));
  }

  toggleHighRisk(guestId: string): void {
    this.attendees.update((list) => list.map((a) => (a.guestId === guestId ? { ...a, highRisk: !a.highRisk } : a)));
  }

  close(): void {
    if (this.saving()) return;
    this.closed.emit();
  }

  submit(): void {
    if (this.saving()) return;
    const problem = this.validate();
    if (problem) {
      this.error.set(problem);
      return;
    }

    const activity = this.isActivity();
    this.saving.set(true);
    this.error.set(null);
    this.guestsApi
      .logGroupContact({
        category: this.category(),
        // Date-only field: midday local keeps the contact on the chosen day in every timezone.
        occurredAt: new Date(`${this.occurredOn}T12:00:00`).toISOString(),
        attendees: this.attendees().map((a) => ({ guestId: a.guestId, highRisk: activity && a.highRisk })),
        activityType: activity ? this.activityType || null : null,
        occasion: activity ? this.occasion.trim() || null : null,
        notes: this.notes.trim() || null,
      })
      .subscribe({
        next: (result) => {
          this.saving.set(false);
          this.saved.emit(result.logged);
        },
        error: (err: HttpErrorResponse) => {
          this.saving.set(false);
          this.error.set(this.problemDetail(err) ?? 'Could not log this group contact. Please try again.');
        },
      });
  }

  private validate(): string | null {
    if (!this.attendees().length) return 'Add the guests who attended.';
    if (!this.occurredOn) return 'Enter the date of the session.';
    if (this.isActivity() && !this.activityType && !this.occasion.trim()) {
      return 'Select the hub activity, or describe the occasion if it is not listed.';
    }
    return null;
  }

  /** ProblemDetails bodies carry the message in `detail`, validation failures in `errors`. */
  private problemDetail(err: HttpErrorResponse): string | null {
    const body = err?.error as { detail?: unknown; errors?: Record<string, string[]> } | null;
    const first = body?.errors ? Object.values(body.errors).flat()[0] : null;
    if (first) return first;
    return typeof body?.detail === 'string' && body.detail.trim() ? body.detail : null;
  }
}

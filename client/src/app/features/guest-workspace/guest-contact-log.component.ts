import { Component, EventEmitter, Output, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  AddContactRequest,
  ContactOutcome,
  ContactType,
  GuestContactSummaryDto,
} from '../../core/api-models';
import { AuthService } from '../../core/auth.service';
import { GuestsApiService } from '../../core/guests-api.service';
import { formatDateTime, humanize, outcomeChip } from './guest-workspace.util';

/**
 * Add Contact drawer — the modal panel from GuestOverviewTab2 (Components.bundle.js
 * 50271-54563): a dimmed overlay with a white rounded panel titled "Add contact" over the
 * guest's name, a required contact method + date, a read-only "Logged by" field pre-filled
 * from the login session, optional notes, and the guest's recent contact log underneath.
 *
 * Honest-data notes: the bundle's casework-note flow (CASEWORK/ACTIVITY/Hospitality/AFA
 * type tags, SBAR sections, risk check, session actions, MDT toggle, draft save) has no
 * backing on AddContactRequest {type, outcome, occurredAt, notes} and is omitted. An
 * Outcome select is included instead — the API requires it even though the bundle's form
 * doesn't show one. "Logged by" is display-only; the server records the caller itself.
 */
@Component({
  selector: 'app-guest-contact-log',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './guest-contact-log.component.html',
  styleUrl: './guest-contact-log.component.scss',
})
export class GuestContactLogComponent {
  private readonly guestsApi = inject(GuestsApiService);
  private readonly auth = inject(AuthService);

  readonly guestId = input.required<string>();
  readonly guestName = input.required<string>();
  /** The guest's recent contact log (from GuestOverviewDto), listed under the form. */
  readonly recentContacts = input<GuestContactSummaryDto[]>([]);

  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly saved = new EventEmitter<void>();

  readonly submitting = signal(false);
  readonly submitError = signal<string | null>(null);

  contactType: ContactType = 'PhoneCall';
  contactOutcome: ContactOutcome = 'Successful';
  occurredAt: string = new Date().toISOString().slice(0, 16);
  notes = '';

  readonly contactTypes: ContactType[] = ['PhoneCall', 'InPerson', 'VideoCall', 'TextMessage', 'Email'];
  readonly contactOutcomes: ContactOutcome[] = ['Successful', 'NoAnswer', 'LeftMessage', 'Declined', 'Rescheduled'];

  readonly loggedBy = this.auth.current().displayName || '—';

  readonly humanize = humanize;
  readonly formatDateTime = formatDateTime;
  readonly outcomeChip = outcomeChip;

  close(): void {
    if (this.submitting()) return;
    this.closed.emit();
  }

  submit(): void {
    if (this.submitting()) return;
    const request: AddContactRequest = {
      type: this.contactType,
      outcome: this.contactOutcome,
      occurredAt: new Date(this.occurredAt).toISOString(),
      notes: this.notes || null,
    };
    this.submitting.set(true);
    this.submitError.set(null);
    this.guestsApi.addContact(this.guestId(), request).subscribe({
      next: () => {
        this.submitting.set(false);
        this.saved.emit();
      },
      error: () => {
        this.submitting.set(false);
        this.submitError.set('Could not save this contact. Please try again.');
      },
    });
  }
}

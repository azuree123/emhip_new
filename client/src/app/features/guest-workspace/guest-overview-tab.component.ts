import { Component, EventEmitter, Output, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AddContactRequest, ContactOutcome, ContactType, GuestOverviewDto } from '../../core/api-models';
import { GuestsApiService } from '../../core/guests-api.service';
import { daysSince, formatDate, formatDateTime, humanize, noteColorDot, outcomeChip } from './guest-workspace.util';

/**
 * Overview tab — pixel-matched to GuestOverviewTab (project/screens/Components.bundle.js,
 * lines 12158-14621), translated from the source's absolutely-positioned div soup into
 * flex/grid layout. Content offsets in the source start at x≈226 (sidebar width) / y≈86
 * (header height) — both chrome elements are already rendered by AppShellComponent, so this
 * component starts exactly where the guest's own content begins.
 *
 * The bundle's third stat tile shows a fabricated "DIALOG baseline score" and the "Recent
 * follow-up entries" card shows fixed sample case notes — neither maps to a real field on
 * GuestOverviewDto. Per the brief we never hardcode that sample data: the tile is repurposed
 * to show pinned-note count (a real field) and the entries card is repurposed to show
 * `recentContacts` (also real), using the bundle's one repeating entry as the exact template.
 */
@Component({
  selector: 'app-guest-overview-tab',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './guest-overview-tab.component.html',
  styleUrl: './guest-overview-tab.component.scss',
})
export class GuestOverviewTabComponent {
  private readonly guestsApi = inject(GuestsApiService);

  readonly overview = input.required<GuestOverviewDto>();
  /** When true (header "Add contact" button), the add-contact form starts expanded. */
  readonly openContactForm = input(false);
  @Output() readonly refresh = new EventEmitter<void>();
  /** "View all →" footer on the Recent contacts card (design: follow-up log link) — the
   *  workspace responds by switching to the Follow-up tab. */
  @Output() readonly viewFollowUps = new EventEmitter<void>();

  constructor() {
    effect(() => {
      if (this.openContactForm()) this.showAddContact.set(true);
    });
  }

  readonly lastContactDaysAgo = computed(() => {
    const contacts = this.overview().recentContacts;
    if (!contacts.length) return null;
    return daysSince(contacts[0].occurredAt);
  });

  readonly formatDate = formatDate;
  readonly formatDateTime = formatDateTime;
  readonly humanize = humanize;
  readonly outcomeChip = outcomeChip;
  readonly noteColorDot = noteColorDot;

  // --- Add contact form state ---
  readonly showAddContact = signal(false);
  readonly submitting = signal(false);
  readonly submitError = signal<string | null>(null);

  contactType: ContactType = 'PhoneCall';
  contactOutcome: ContactOutcome = 'Successful';
  contactOccurredAt: string = new Date().toISOString().slice(0, 16);
  contactNotes = '';

  readonly contactTypes: ContactType[] = ['PhoneCall', 'InPerson', 'VideoCall', 'TextMessage', 'Email'];
  readonly contactOutcomes: ContactOutcome[] = ['Successful', 'NoAnswer', 'LeftMessage', 'Declined', 'Rescheduled'];

  toggleAddContact(): void {
    this.showAddContact.update((v) => !v);
    this.submitError.set(null);
  }

  submitContact(): void {
    const request: AddContactRequest = {
      type: this.contactType,
      outcome: this.contactOutcome,
      occurredAt: new Date(this.contactOccurredAt).toISOString(),
      notes: this.contactNotes || null,
    };
    this.submitting.set(true);
    this.submitError.set(null);
    this.guestsApi.addContact(this.overview().id, request).subscribe({
      next: () => {
        this.submitting.set(false);
        this.showAddContact.set(false);
        this.contactNotes = '';
        this.refresh.emit();
      },
      error: () => {
        this.submitting.set(false);
        this.submitError.set('Could not save this contact. Please try again.');
      },
    });
  }
}

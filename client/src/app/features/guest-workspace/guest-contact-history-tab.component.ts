import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { CaseworkNoteCategory, GuestContactSummaryDto } from '../../core/api-models';
import { GuestsApiService } from '../../core/guests-api.service';
import { formatDateTime, humanize } from './guest-workspace.util';

const PAGE_SIZE = 25;

/** Display names for the contact types offered on Add Contact. */
const CATEGORY_LABELS: Record<CaseworkNoteCategory, string> = {
  Casework: 'Casework',
  Activity: 'Activity',
  Meeting: 'Meeting',
  DailyLog: 'Daily Log',
  Hospitality: 'Hospitality',
  Afa: 'AFA',
};

/**
 * Contact History tab — every contact recorded against the guest, newest first. Each row leads
 * with the type of contact the worker chose on Add Contact (Casework, Activity, Hospitality, AFA,
 * or a CPN contact), with how they made contact (phone call, text, …) as the smaller detail.
 * Contacts not written through a casework note (e.g. older imports) just read "Contact".
 *
 * The endpoint is keyset-paged (GET /guests/{id}/contacts), so the list grows by handing the
 * opaque `nextCursor` straight back to the API rather than by page number. `totalCount` only
 * comes back on the first page (no cursor), so it is captured once and carried forward to
 * drive the "Showing X of Y" line.
 *
 * Read-only by design: contacts are written by the Add Contact / casework-note flow on the
 * workspace header, and the clinical record never rewrites a logged contact.
 */
@Component({
  selector: 'emhip-guest-contact-history-tab',
  standalone: true,
  templateUrl: './guest-contact-history-tab.component.html',
  styleUrl: './guest-contact-history-tab.component.scss',
})
export class GuestContactHistoryTabComponent {
  private readonly guestsApi = inject(GuestsApiService);

  readonly guestId = input.required<string>();

  readonly contacts = signal<GuestContactSummaryDto[]>([]);
  readonly loading = signal(true);
  readonly loadingMore = signal(false);
  readonly error = signal<string | null>(null);
  readonly moreError = signal<string | null>(null);
  readonly nextCursor = signal<string | null>(null);
  /** Only sent on the first page — held here and carried across "Load more". */
  readonly totalCount = signal<number | null>(null);

  readonly showingLabel = computed(() => {
    const shown = this.contacts().length;
    if (!shown) return null;
    const total = this.totalCount();
    return total === null ? `Showing ${shown} contacts` : `Showing ${shown} of ${total}`;
  });

  readonly humanize = humanize;

  typeLabel(contact: GuestContactSummaryDto): string {
    if (contact.isCpnContact) return 'CPN contact';
    return contact.category ? (CATEGORY_LABELS[contact.category] ?? humanize(contact.category)) : 'Contact';
  }
  readonly formatDateTime = formatDateTime;

  constructor() {
    effect((onCleanup) => {
      const id = this.guestId();
      let cancelled = false;
      onCleanup(() => (cancelled = true));
      this.load(id, () => cancelled);
    });
  }

  private load(guestId: string, isCancelled: () => boolean): void {
    this.loading.set(true);
    this.error.set(null);
    this.moreError.set(null);
    this.guestsApi.getContactHistory(guestId, undefined, PAGE_SIZE).subscribe({
      next: (page) => {
        if (isCancelled()) return;
        this.contacts.set(page.items);
        this.totalCount.set(page.totalCount);
        this.nextCursor.set(page.hasMore ? page.nextCursor : null);
        this.loading.set(false);
      },
      error: () => {
        if (isCancelled()) return;
        this.contacts.set([]);
        this.totalCount.set(null);
        this.nextCursor.set(null);
        this.error.set('Could not load the contact history for this guest.');
        this.loading.set(false);
      },
    });
  }

  loadMore(): void {
    const cursor = this.nextCursor();
    if (!cursor || this.loadingMore()) return;
    this.loadingMore.set(true);
    this.moreError.set(null);
    this.guestsApi.getContactHistory(this.guestId(), cursor, PAGE_SIZE).subscribe({
      next: (page) => {
        this.contacts.update((current) => [...current, ...page.items]);
        this.nextCursor.set(page.hasMore ? page.nextCursor : null);
        this.loadingMore.set(false);
      },
      error: () => {
        this.loadingMore.set(false);
        this.moreError.set('Could not load more contacts. Please try again.');
      },
    });
  }

  retry(): void {
    this.load(this.guestId(), () => false);
  }
}

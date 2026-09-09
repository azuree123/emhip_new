import { Component, effect, inject, input, signal } from '@angular/core';
import { GuestAuditEntryDto } from '../../core/api-models';
import { GuestsApiService } from '../../core/guests-api.service';
import { formatDateTime } from './guest-workspace.util';

/**
 * Access Log tab — who has viewed, changed, exported or anonymised this guest's record, newest
 * first (UK GDPR Art. 5(2) accountability; the "recipients" part of a subject access request).
 * Reads are written by the API's audit middleware, writes by the EF audit interceptor, and
 * exports/downloads/episode views by their handlers, so nothing here is client-reported.
 * Hub Managers and Admins only (guests.audit.view).
 */
@Component({
  selector: 'emhip-guest-access-log-tab',
  standalone: true,
  templateUrl: './guest-access-log-tab.component.html',
  styleUrl: './guest-access-log-tab.component.scss',
})
export class GuestAccessLogTabComponent {
  private readonly guestsApi = inject(GuestsApiService);

  readonly guestId = input.required<string>();

  readonly entries = signal<GuestAuditEntryDto[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly formatDateTime = formatDateTime;

  constructor() {
    effect((onCleanup) => {
      const id = this.guestId();
      let cancelled = false;
      onCleanup(() => (cancelled = true));
      this.load(id, () => cancelled);
    });
  }

  retry(): void {
    this.load(this.guestId(), () => false);
  }

  /** "Read UrgentEpisode" → "Viewed urgent episode"; "Update Guest — Changed: ContactPhone" stays literal in Details. */
  actionLabel(entry: GuestAuditEntryDto): string {
    const verb = { Read: 'Viewed', Create: 'Created', Update: 'Updated', Delete: 'Deleted' }[entry.action] ?? entry.action;
    if (entry.details?.startsWith('Subject access export')) return 'Exported (subject access)';
    if (entry.details?.startsWith('Record anonymised')) return 'Anonymised';
    if (entry.details?.startsWith('Downloaded')) return 'Downloaded document';
    if (entry.details?.startsWith('Urgent episode record exported')) return 'Exported episode record';
    return `${verb} ${entry.entityName.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase()}`;
  }

  tone(entry: GuestAuditEntryDto): 'read' | 'write' | 'danger' {
    if (entry.details?.startsWith('Record anonymised') || entry.action === 'Delete') return 'danger';
    return entry.action === 'Read' ? 'read' : 'write';
  }

  private load(guestId: string, isCancelled: () => boolean): void {
    this.loading.set(true);
    this.error.set(null);
    this.guestsApi.getAccessLog(guestId, 300).subscribe({
      next: (entries) => {
        if (isCancelled()) return;
        this.entries.set(entries);
        this.loading.set(false);
      },
      error: () => {
        if (isCancelled()) return;
        this.error.set('Could not load the access log for this guest.');
        this.loading.set(false);
      },
    });
  }
}

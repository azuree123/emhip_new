import { Injectable, inject, signal } from '@angular/core';
import { CmhwOptionDto } from '../core/api-models';
import { GuestsApiService } from '../core/guests-api.service';

/**
 * Caches the hub's staff list for the whole session. Several screens show a staff picker at
 * once (filters, assignment forms, drawers); this keeps that to a single request and lets the
 * picker resolve a stored staff id to a name without a lookup round-trip.
 */
@Injectable({ providedIn: 'root' })
export class StaffDirectoryService {
  private readonly guestsApi = inject(GuestsApiService);
  private requested = false;

  readonly options = signal<CmhwOptionDto[]>([]);
  readonly loading = signal(false);

  /** Safe to call from every picker instance — only the first triggers a request. */
  ensureLoaded(): void {
    if (this.requested) return;
    this.requested = true;
    this.loading.set(true);

    this.guestsApi.getCmhwOptions().subscribe({
      next: (options) => {
        this.options.set(options);
        this.loading.set(false);
      },
      error: () => {
        // Leave the list empty; the picker shows "No matching staff" rather than breaking the form.
        this.requested = false;
        this.loading.set(false);
      },
    });
  }

  /** Forces a refresh — e.g. after an admin adds a hub worker. */
  reload(): void {
    this.requested = false;
    this.ensureLoaded();
  }

  displayName(staffId: string | null | undefined): string {
    if (!staffId) return '';
    return this.options().find((o) => o.id === staffId)?.displayName ?? '';
  }
}

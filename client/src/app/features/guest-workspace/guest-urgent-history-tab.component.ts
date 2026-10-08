import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { UrgentCaseHistoryRowDto } from '../../core/api-models';
import { UrgentCasesApiService } from '../../core/urgent-cases-api.service';
import { UrgentCaseRecordChange, UrgentEpisodeRecordComponent } from '../urgent-cases/urgent-episode-record.component';
import { formatDateTime } from './guest-workspace.util';

/**
 * "Urgent Case History" tab — every urgent case raised for the guest, open and resolved, newest
 * first (GET /urgent-cases/{guestId}/history). Customer feedback (Oct 2026): CMHWs need this
 * history from the guest profile, not only from the Urgent Cases dashboard, so the tab follows
 * urgentcases.view — which CMHWs, CPNs and Hub Managers all hold by default.
 *
 * Each case opens the full Urgent Case Record in place; the record does its own writes (CMHT
 * contact, Add contact, Mark as resolved) and tells us when something changed, so the list and
 * the workspace header (urgent badge) are refreshed.
 */
@Component({
  selector: 'emhip-guest-urgent-history-tab',
  standalone: true,
  imports: [UrgentEpisodeRecordComponent],
  templateUrl: './guest-urgent-history-tab.component.html',
  styleUrl: './guest-urgent-history-tab.component.scss',
})
export class GuestUrgentHistoryTabComponent {
  private readonly urgentApi = inject(UrgentCasesApiService);

  readonly guestId = input.required<string>();
  /** A case was resolved or updated from the record — the workspace reloads its header. */
  readonly refresh = output<void>();

  readonly cases = signal<UrgentCaseHistoryRowDto[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  /** The case whose Urgent Case Record is open, or null. */
  readonly openEpisodeId = signal<string | null>(null);

  readonly openCount = computed(() => this.cases().filter((c) => !c.isResolved).length);
  readonly countLabel = computed(() => {
    const total = this.cases().length;
    if (!total) return null;
    const open = this.openCount();
    return `${total} urgent case${total === 1 ? '' : 's'}${open ? ` · ${open} open` : ''}`;
  });

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
    this.urgentApi.getHistory(guestId).subscribe({
      next: (rows) => {
        if (isCancelled()) return;
        this.cases.set(rows);
        this.loading.set(false);
      },
      error: () => {
        if (isCancelled()) return;
        this.error.set('Could not load the urgent case history for this guest.');
        this.loading.set(false);
      },
    });
  }

  retry(): void {
    this.load(this.guestId(), () => false);
  }

  openRecord(row: UrgentCaseHistoryRowDto): void {
    this.openEpisodeId.set(row.id);
  }

  closeRecord(): void {
    this.openEpisodeId.set(null);
  }

  recordChanged(change: UrgentCaseRecordChange): void {
    this.load(this.guestId(), () => false);
    if (change.resolved) this.refresh.emit();
  }

  /** "Yes" / "No" / "Not recorded" for the CMHT question, which is only asked once a case is open. */
  cmhtLabel(row: UrgentCaseHistoryRowDto): string {
    if (row.cmhtNotified === null) return 'Not recorded';
    return row.cmhtNotified ? 'Yes' : 'No';
  }

  withinWindowLabel(row: UrgentCaseHistoryRowDto): string {
    if (row.resolvedWithinWindow === null) return '—';
    return row.resolvedWithinWindow ? 'Yes' : 'No';
  }
}

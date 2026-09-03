import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, of } from 'rxjs';
import { LookupItemDto, MdtQueueDto, MdtQueueItemDto, MdtQueueKind } from '../../core/api-models';
import { MdtApiService } from '../../core/mdt-api.service';
import { LookupCategories, SettingsApiService } from '../../core/settings-api.service';
import { StaffPickerComponent } from '../../shared/staff-picker.component';
import { formatDate, formatDateTime, guestPathwayLabel, statusChip } from '../guest-workspace/guest-workspace.util';

/** The filter chips: All / CPN referrals / Initial review / Discussion. */
type QueueFilter = 'all' | MdtQueueKind;

/** Which dialog is open, and for which item. */
type Dialog = { kind: 'confirm' | 'decline' | 'discussed'; item: MdtQueueItemDto } | null;

const KIND_META: Record<MdtQueueKind, { label: string; badgeClass: string }> = {
  CpnReferral: { label: 'CPN referral', badgeClass: 'badge--cpn' },
  InitialReview: { label: 'Initial review', badgeClass: 'badge--review' },
  DiscussionRequest: { label: 'Discussion request', badgeClass: 'badge--discussion' },
};

/**
 * "MDT queue" — design Frame 54 (Hub Managers). Every request raised for the multidisciplinary
 * team, badged by kind: CPN referrals (from the Add Contact popup's "Refer this guest to the
 * CPN"), initial reviews (intakes with immediate risk or the clinical pathway) and discussion
 * requests ("Add this guest for MDT discussion"). The actions differ per badge, as the design
 * notes: a CPN referral is confirmed (allocating the CPN, which starts CPN activity tracking in
 * reports) or declined with a documented reason; the other two are marked as discussed with a
 * required MDT note. Reviewed items stay listed as the permanent MDT record.
 */
@Component({
  selector: 'app-mdt-queue',
  standalone: true,
  imports: [FormsModule, StaffPickerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './mdt-queue.component.html',
  styleUrl: './mdt-queue.component.scss',
})
export class MdtQueueComponent {
  private readonly api = inject(MdtApiService);
  private readonly settingsApi = inject(SettingsApiService);
  private readonly router = inject(Router);

  protected readonly queue = signal<MdtQueueDto | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly filter = signal<QueueFilter>('all');
  protected readonly showReviewed = signal(false);

  protected readonly dialog = signal<Dialog>(null);
  protected readonly saving = signal(false);
  protected readonly dialogError = signal<string | null>(null);
  protected readonly declineReasons = signal<LookupItemDto[]>([]);

  // Dialog forms (plain objects — reset every time a dialog opens).
  protected confirmForm = { cpnStaffId: null as string | null, note: '' };
  protected declineForm = { reason: '', context: '' };
  protected discussedForm = { note: '' };

  protected readonly pending = computed(() => this.queue()?.pending ?? []);
  protected readonly reviewed = computed(() => this.queue()?.reviewed ?? []);

  protected readonly counts = computed(() => {
    const p = this.pending();
    return {
      all: p.length,
      CpnReferral: p.filter((i) => i.kind === 'CpnReferral').length,
      InitialReview: p.filter((i) => i.kind === 'InitialReview').length,
      DiscussionRequest: p.filter((i) => i.kind === 'DiscussionRequest').length,
    };
  });

  protected readonly visiblePending = computed(() => {
    const f = this.filter();
    return f === 'all' ? this.pending() : this.pending().filter((i) => i.kind === f);
  });

  protected readonly visibleReviewed = computed(() => {
    const f = this.filter();
    return f === 'all' ? this.reviewed() : this.reviewed().filter((i) => i.kind === f);
  });

  protected readonly formatDate = formatDate;
  protected readonly formatDateTime = formatDateTime;
  protected readonly statusChip = statusChip;

  constructor() {
    this.load();
    this.settingsApi
      .getLookups(LookupCategories.MdtDeclineReason)
      .pipe(catchError(() => of([] as LookupItemDto[])))
      .subscribe((items) => this.declineReasons.set(items.filter((i) => i.isActive)));
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api
      .getQueue()
      .pipe(
        catchError(() => {
          this.error.set('Unable to load the MDT queue right now.');
          return of(null);
        }),
      )
      .subscribe((queue) => {
        this.queue.set(queue);
        this.loading.set(false);
      });
  }

  protected setFilter(filter: QueueFilter): void {
    this.filter.set(filter);
  }

  protected kindLabel(kind: MdtQueueKind): string {
    return KIND_META[kind].label;
  }

  protected badgeClass(kind: MdtQueueKind): string {
    return KIND_META[kind].badgeClass;
  }

  protected initials(name: string): string {
    const parts = name.trim().split(/\s+/);
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
  }

  protected pathwayLabel(item: MdtQueueItemDto): string {
    return guestPathwayLabel(item.pathway) ?? 'No pathway yet';
  }

  protected isUrgent(item: MdtQueueItemDto): boolean {
    return !!item.urgency && item.urgency.toLowerCase().startsWith('urgent');
  }

  /** "Confirmed · CPN: Dr X" / "Declined — reason" / "Discussed" for the reviewed list. */
  protected outcome(item: MdtQueueItemDto): string {
    switch (item.status) {
      case 'Confirmed':
        return item.assignedCpnName ? `CPN assigned: ${item.assignedCpnName}` : 'CPN assigned';
      case 'Declined':
        return item.declineReason ? `Declined — ${item.declineReason}` : 'Declined';
      case 'Discussed':
        return 'Discussed at MDT';
      default:
        return 'Pending';
    }
  }

  protected openGuest(item: MdtQueueItemDto): void {
    this.router.navigate(['/guests', item.guestId], { queryParams: { tab: item.kind === 'CpnReferral' ? 'cpn' : 'notes' } });
  }

  // ---- Dialogs ----------------------------------------------------------------------------

  protected openConfirm(item: MdtQueueItemDto): void {
    this.confirmForm = { cpnStaffId: null, note: '' };
    this.dialogError.set(null);
    this.dialog.set({ kind: 'confirm', item });
  }

  protected openDecline(item: MdtQueueItemDto): void {
    this.declineForm = { reason: '', context: '' };
    this.dialogError.set(null);
    this.dialog.set({ kind: 'decline', item });
  }

  protected openDiscussed(item: MdtQueueItemDto): void {
    this.discussedForm = { note: '' };
    this.dialogError.set(null);
    this.dialog.set({ kind: 'discussed', item });
  }

  protected closeDialog(): void {
    if (this.saving()) return;
    this.dialog.set(null);
  }

  protected submitConfirm(): void {
    const d = this.dialog();
    if (!d || d.kind !== 'confirm') return;
    if (!this.confirmForm.cpnStaffId) {
      this.dialogError.set('Select the CPN to assign.');
      return;
    }
    this.run(this.api.confirmCpn(d.item.id, this.confirmForm.cpnStaffId, this.confirmForm.note.trim() || null), 'Could not confirm the CPN assignment.');
  }

  protected submitDecline(): void {
    const d = this.dialog();
    if (!d || d.kind !== 'decline') return;
    if (!this.declineForm.reason) {
      this.dialogError.set('Select a reason for declining.');
      return;
    }
    this.run(this.api.decline(d.item.id, this.declineForm.reason, this.declineForm.context.trim() || null), 'Could not decline this request.');
  }

  protected submitDiscussed(): void {
    const d = this.dialog();
    if (!d || d.kind !== 'discussed') return;
    if (!this.discussedForm.note.trim()) {
      this.dialogError.set('An MDT note is required to mark this as discussed.');
      return;
    }
    this.run(this.api.markDiscussed(d.item.id, this.discussedForm.note.trim()), 'Could not mark this as discussed.');
  }

  private run(request: ReturnType<MdtApiService['decline']>, failure: string): void {
    this.saving.set(true);
    this.dialogError.set(null);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.dialog.set(null);
        this.showReviewed.set(true);
        this.load();
      },
      error: () => {
        this.saving.set(false);
        this.dialogError.set(failure);
      },
    });
  }
}

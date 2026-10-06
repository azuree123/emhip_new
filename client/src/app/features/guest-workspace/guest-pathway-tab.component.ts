import { HttpErrorResponse } from '@angular/common/http';
import { Component, EventEmitter, Output, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  CaseloadAssignmentDto,
  CreatePathwayReferralRequest,
  GuestOverviewDto,
  GuestPathway,
  GuestPathwayDto,
  PathwayCategory,
} from '../../core/api-models';
import { AuthService } from '../../core/auth.service';
import { GuestsApiService } from '../../core/guests-api.service';
import { Permissions } from '../../core/permissions';
import { StaffPickerComponent } from '../../shared/staff-picker.component';
import { formatDate, formatDateTime, guestPathwayLabel, humanize, pathwayStatusChip } from './guest-workspace.util';

/** One of the three "Select new pathway" option cards in the Change Pathway dialog. */
interface PathwayOption {
  value: GuestPathway;
  label: string;
  description: string;
  /** The tile glyph from the Change Pathway design, positioned inside a 24×24 box. */
  icon: { transform: string; d: string };
}

/**
 * Change Pathway tile glyphs (design_download_claude_3 Components.bundle.js, the Change Pathway
 * modal): a heart for Mental Wellbeing, a medical bag for Clinical Support and a medical cross
 * for Community Recovery.
 */
const PATHWAY_ICONS: Record<GuestPathway, PathwayOption['icon']> = {
  MentalWellbeing: { transform: 'translate(2 4.002)', d: 'M 10.82 1.577 L 9.999 2.4 L 9.176 1.576 C 7.077 -0.523 3.673 -0.523 1.574 1.576 C -0.525 3.675 -0.525 7.079 1.574 9.178 L 9.47 17.073 C 9.763 17.366 10.237 17.366 10.53 17.073 L 18.432 9.176 C 20.526 7.07 20.53 3.677 18.43 1.577 C 16.327 -0.526 12.923 -0.526 10.82 1.577 Z M 17.368 8.119 L 10 15.482 L 2.635 8.117 C 1.122 6.604 1.122 4.15 2.635 2.637 C 4.148 1.124 6.602 1.124 8.115 2.637 L 9.472 3.995 C 9.77 4.292 10.255 4.287 10.546 3.982 L 11.88 2.638 C 13.397 1.121 15.853 1.121 17.37 2.638 C 18.883 4.151 18.881 6.598 17.368 8.119 Z' },
  ClinicalSupport: { transform: 'translate(3 2)', d: 'M 7.25 1.5 L 10.75 1.5 C 11.164 1.5 11.5 1.836 11.5 2.25 L 11.5 4 L 6.5 4 L 6.5 2.25 C 6.5 1.836 6.836 1.5 7.25 1.5 Z M 5 2.25 L 5 4 L 3.25 4 C 1.455 4 0 5.455 0 7.25 L 0 14.75 C 0 16.545 1.455 18 3.25 18 L 14.75 18 C 16.545 18 18 16.545 18 14.75 L 18 7.25 C 18 5.455 16.545 4 14.75 4 L 13 4 L 13 2.25 C 13 1.007 11.993 0 10.75 0 L 7.25 0 C 6.007 0 5 1.007 5 2.25 Z M 14.75 5.5 C 15.717 5.5 16.5 6.284 16.5 7.25 L 16.5 14.75 C 16.5 15.717 15.717 16.5 14.75 16.5 L 3.25 16.5 C 2.283 16.5 1.5 15.717 1.5 14.75 L 1.5 7.25 C 1.5 6.284 2.283 5.5 3.25 5.5 L 14.75 5.5 Z M 8.5 8.75 L 8.5 10.5 L 6.75 10.5 C 6.336 10.5 6 10.836 6 11.25 C 6 11.664 6.336 12 6.75 12 L 8.5 12 L 8.5 13.75 C 8.5 14.164 8.836 14.5 9.25 14.5 C 9.664 14.5 10 14.164 10 13.75 L 10 12 L 11.75 12 C 12.164 12 12.5 11.664 12.5 11.25 C 12.5 10.836 12.164 10.5 11.75 10.5 L 10 10.5 L 10 8.75 C 10 8.336 9.664 8 9.25 8 C 8.836 8 8.5 8.336 8.5 8.75 Z' },
  CommunityRecovery: { transform: 'translate(3 3)', d: 'M 6.75 1.5 C 6.612 1.5 6.5 1.612 6.5 1.75 L 6.5 5.75 C 6.5 6.164 6.164 6.5 5.75 6.5 L 1.75 6.5 C 1.612 6.5 1.5 6.612 1.5 6.75 L 1.5 11.25 C 1.5 11.388 1.612 11.5 1.75 11.5 L 5.75 11.5 C 6.164 11.5 6.5 11.836 6.5 12.25 L 6.5 16.25 C 6.5 16.388 6.612 16.5 6.75 16.5 L 11.25 16.5 C 11.388 16.5 11.5 16.388 11.5 16.25 L 11.5 12.25 C 11.5 11.836 11.836 11.5 12.25 11.5 L 16.25 11.5 C 16.388 11.5 16.5 11.388 16.5 11.25 L 16.5 6.75 C 16.5 6.612 16.388 6.5 16.25 6.5 L 12.25 6.5 C 11.836 6.5 11.5 6.164 11.5 5.75 L 11.5 1.75 C 11.5 1.612 11.388 1.5 11.25 1.5 L 6.75 1.5 Z M 5 1.75 C 5 0.784 5.784 0 6.75 0 L 11.25 0 C 12.217 0 13 0.784 13 1.75 L 13 5 L 16.25 5 C 17.216 5 18 5.784 18 6.75 L 18 11.25 C 18 12.217 17.216 13 16.25 13 L 13 13 L 13 16.25 C 13 17.216 12.217 18 11.25 18 L 6.75 18 C 5.784 18 5 17.216 5 16.25 L 5 13 L 1.75 13 C 0.784 13 0 12.217 0 11.25 L 0 6.75 C 0 5.784 0.784 5 1.75 5 L 5 5 L 5 1.75 Z' },
};

/** Local (not UTC) yyyy-MM-dd, so "today" matches the worker's calendar day and the API's DateOnly. */
function isoToday(): string {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/** ProblemDetails carries the useful sentence in `detail` (e.g. "The guest is already on this pathway."). */
function problemDetail(err: unknown, fallback: string): string {
  const body = (err as HttpErrorResponse | null)?.error as { detail?: unknown } | null | undefined;
  const detail = body?.detail;
  return typeof detail === 'string' && detail.trim() ? detail.trim() : fallback;
}

/**
 * Pathway tab — pixel-sourced from GuestPathwayTab in project/screens/Components.bundle.js
 * (lines 29090–31284): a "Pathway History" card of bordered entry tiles (the current
 * allocation flagged with the grey "Current Pathway" pill) plus the red "Add New Pathway"
 * button that opens the Change Pathway dialog.
 *
 * The dialog carries the design's full field set — "Select new pathway *" option cards,
 * "Date of change *", "Assigned by *" and "Reason for change *" — all now backed by
 * POST /guests/{id}/pathway-changes, which appends to GuestPathwayDto.changes. The tab's
 * current pathway and AFA flag come from that same DTO; the practical-support referrals
 * are separate data and keep their own secondary card.
 *
 * Caseload allocation (spec §4.4) lives here too, in its own "Caseload allocation" card:
 * who the guest is allocated to, a "Reassign CMHW" action (staff picker + reason, gated on
 * guests.edit) and the append-only allocation history from GET /guests/{id}/caseload-history.
 * This tab is already the record's "who owns this guest, and how did that change" history —
 * pathway changes and allocation changes are read together, both are append-only audit trails
 * with the same from → to / reason / recorded-by shape, and the staff picker and dialog chrome
 * they need are already here. The Overview snapshot card keeps its read-only "Assigned CMHW"
 * line and stays a summary.
 */
@Component({
  selector: 'app-guest-pathway-tab',
  standalone: true,
  imports: [FormsModule, StaffPickerComponent],
  templateUrl: './guest-pathway-tab.component.html',
  styleUrl: './guest-pathway-tab.component.scss',
})
export class GuestPathwayTabComponent {
  private readonly guestsApi = inject(GuestsApiService);
  private readonly auth = inject(AuthService);

  readonly guestId = input.required<string>();
  /** Header context (assigned CMHW) so the allocation card reads without a second fetch. */
  readonly overview = input<GuestOverviewDto | null>(null);
  @Output() readonly refresh = new EventEmitter<void>();

  readonly pathway = signal<GuestPathwayDto | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly canEdit = this.auth.hasPermission(Permissions.Guests.PathwayEdit);
  /** Reassignment is a caseload action, not a pathway one — it follows the guests.edit claim. */
  readonly canReassign = this.auth.hasPermission(Permissions.Guests.Edit);

  /** Practical-support referrals are hidden: the only pathways are the three clinical ones. */
  readonly showSupportReferrals = false;

  // "+ New referral" inline form (practical-support referrals, secondary card).
  readonly showReferralForm = signal(false);
  readonly submittingReferral = signal(false);
  readonly referralError = signal<string | null>(null);

  // "Add New Pathway" → Change Pathway dialog.
  readonly showChangeDialog = signal(false);
  readonly selectedPathway = signal<GuestPathway | null>(null);
  readonly assignedByStaffId = signal<string | null>(null);
  readonly changedOn = signal<string>(isoToday());
  readonly reason = signal<string>('');
  readonly submitted = signal(false);
  readonly changingPathway = signal(false);
  readonly changeError = signal<string | null>(null);

  // "Reassign CMHW" → caseload allocation dialog (spec §4.4).
  readonly caseloadHistory = signal<CaseloadAssignmentDto[] | null>(null);
  readonly caseloadLoading = signal(true);
  readonly caseloadError = signal<string | null>(null);
  readonly showReassignDialog = signal(false);
  readonly reassignStaffId = signal<string | null>(null);
  readonly reassignReason = signal<string>('');
  readonly reassignSubmitted = signal(false);
  readonly reassigning = signal(false);
  readonly reassignError = signal<string | null>(null);

  readonly today = isoToday();

  readonly formatDate = formatDate;
  readonly formatDateTime = formatDateTime;
  readonly humanize = humanize;
  readonly pathwayStatusChip = pathwayStatusChip;
  readonly guestPathwayLabel = guestPathwayLabel;

  readonly categories: PathwayCategory[] = [
    'HousingAdvice',
    'EmploymentSupport',
    'BenefitsFinancialSupport',
    'FoodEssentials',
    'ImmigrationLegalAdvice',
    'OtherPracticalAdvice',
  ];

  readonly pathwayOptions: PathwayOption[] = [
    {
      value: 'MentalWellbeing',
      label: 'Mental Wellbeing',
      description: 'Early intervention and general wellbeing support.',
      icon: PATHWAY_ICONS.MentalWellbeing,
    },
    {
      value: 'ClinicalSupport',
      label: 'Clinical Support',
      description: 'Intense support for complex mental health needs.',
      icon: PATHWAY_ICONS.ClinicalSupport,
    },
    {
      value: 'CommunityRecovery',
      label: 'Community Recovery',
      description: 'Community-focused recovery and group support.',
      icon: PATHWAY_ICONS.CommunityRecovery,
    },
  ];

  /** Label for the guest's live allocation, straight from GuestPathwayDto. */
  readonly currentPathwayLabel = computed(() => guestPathwayLabel(this.pathway()?.currentPathway ?? null));
  readonly afaSupportNeeded = computed(() => this.pathway()?.afaSupportNeeded ?? false);

  /** Fallback label for the staff picker while the directory loads (the default is the signed-in user). */
  readonly signedInName = computed(() => this.auth.current().displayName || null);

  readonly pathwayFieldError = computed(() => {
    const selected = this.selectedPathway();
    if (!selected) return 'Select a new pathway.';
    if (selected === this.pathway()?.currentPathway) return 'The guest is already on this pathway.';
    return null;
  });

  readonly assignedByFieldError = computed(() =>
    this.assignedByStaffId() ? null : 'Select who authorised this change.',
  );

  readonly changedOnFieldError = computed(() => {
    const value = this.changedOn();
    if (!value) return 'Enter the date of change.';
    if (value > this.today) return 'The date of change cannot be in the future.';
    return null;
  });

  readonly reasonFieldError = computed(() =>
    this.reason().trim() ? null : 'Enter the reason for changing the pathway.',
  );

  readonly formValid = computed(
    () =>
      !this.pathwayFieldError() &&
      !this.assignedByFieldError() &&
      !this.changedOnFieldError() &&
      !this.reasonFieldError(),
  );

  /** Live allocation — the header's name, falling back to the newest history entry. */
  readonly assignedCmhwName = computed(
    () => this.overview()?.assignedCmhwName ?? this.caseloadHistory()?.[0]?.toStaffName ?? null,
  );

  readonly reassignFieldError = computed(() =>
    this.reassignStaffId() ? null : 'Select the CMHW who will take this guest on.',
  );

  referralForm: CreatePathwayReferralRequest = { category: 'HousingAdvice', detail: '' };

  constructor() {
    effect((onCleanup) => {
      const id = this.guestId();
      let cancelled = false;
      onCleanup(() => (cancelled = true));
      this.load(id, () => cancelled);
      this.loadCaseload(id, () => cancelled);
    });
  }

  private load(guestId: string, isCancelled: () => boolean): void {
    this.loading.set(true);
    this.error.set(null);
    this.guestsApi.getPathway(guestId).subscribe({
      next: (pathway) => {
        if (isCancelled()) return;
        this.pathway.set(pathway);
        this.loading.set(false);
      },
      error: () => {
        if (isCancelled()) return;
        this.error.set('Could not load pathway history for this guest.');
        this.loading.set(false);
      },
    });
  }

  /** Allocation history is append-only and newest first; a 403 leaves the card empty, not broken. */
  private loadCaseload(guestId: string, isCancelled: () => boolean): void {
    this.caseloadLoading.set(true);
    this.caseloadError.set(null);
    this.guestsApi.getCaseloadHistory(guestId).subscribe({
      next: (history) => {
        if (isCancelled()) return;
        this.caseloadHistory.set(history);
        this.caseloadLoading.set(false);
      },
      error: () => {
        if (isCancelled()) return;
        this.caseloadHistory.set(null);
        this.caseloadError.set('Could not load the allocation history for this guest.');
        this.caseloadLoading.set(false);
      },
    });
  }

  openReassignDialog(): void {
    if (!this.canReassign) return;
    this.reassignStaffId.set(null);
    this.reassignReason.set('');
    this.reassignSubmitted.set(false);
    this.reassignError.set(null);
    this.showReassignDialog.set(true);
  }

  closeReassignDialog(): void {
    if (this.reassigning()) return;
    this.showReassignDialog.set(false);
  }

  reassign(): void {
    this.reassignSubmitted.set(true);
    const staffId = this.reassignStaffId();
    if (!staffId || this.reassigning()) return;

    this.reassigning.set(true);
    this.reassignError.set(null);
    const reason = this.reassignReason().trim();
    this.guestsApi.reassign(this.guestId(), { assignedCmhwId: staffId, reason: reason || null }).subscribe({
      next: () => {
        this.reassigning.set(false);
        this.showReassignDialog.set(false);
        this.loadCaseload(this.guestId(), () => false);
        // The workspace header and Overview card both show the assigned CMHW.
        this.refresh.emit();
      },
      error: (err) => {
        this.reassigning.set(false);
        this.reassignError.set(problemDetail(err, 'Could not reassign this guest. Please try again.'));
      },
    });
  }

  /** The newest entry is the live allocation, so it wears the "Current Pathway" pill. */
  isCurrentEntry(index: number, toPathway: GuestPathway): boolean {
    return index === 0 && toPathway === this.pathway()?.currentPathway;
  }

  isCurrentPathway(option: GuestPathway): boolean {
    return option === this.pathway()?.currentPathway;
  }

  toggleReferralForm(): void {
    this.showReferralForm.update((v) => !v);
    this.referralForm = { category: 'HousingAdvice', detail: '' };
    this.referralError.set(null);
  }

  submitReferral(): void {
    this.submittingReferral.set(true);
    this.referralError.set(null);
    this.guestsApi.createPathwayReferral(this.guestId(), this.referralForm).subscribe({
      next: () => {
        this.submittingReferral.set(false);
        this.showReferralForm.set(false);
        this.load(this.guestId(), () => false);
        this.refresh.emit();
      },
      error: (err) => {
        this.submittingReferral.set(false);
        this.referralError.set(problemDetail(err, 'Could not create this referral. Please try again.'));
      },
    });
  }

  openChangeDialog(): void {
    if (!this.canEdit) return;
    this.selectedPathway.set(null);
    this.assignedByStaffId.set(this.auth.current().staffId || null);
    this.changedOn.set(isoToday());
    this.reason.set('');
    this.submitted.set(false);
    this.changeError.set(null);
    this.showChangeDialog.set(true);
  }

  closeChangeDialog(): void {
    if (this.changingPathway()) return;
    this.showChangeDialog.set(false);
  }

  selectPathway(option: GuestPathway): void {
    if (this.isCurrentPathway(option)) return;
    this.selectedPathway.set(option);
  }

  changePathway(): void {
    this.submitted.set(true);
    const pathway = this.selectedPathway();
    if (!this.formValid() || !pathway) return;

    this.changingPathway.set(true);
    this.changeError.set(null);
    this.guestsApi
      .changePathway(this.guestId(), {
        pathway,
        reason: this.reason().trim(),
        assignedByStaffId: this.assignedByStaffId(),
        changedOn: this.changedOn(),
      })
      .subscribe({
        next: () => {
          this.changingPathway.set(false);
          this.showChangeDialog.set(false);
          this.load(this.guestId(), () => false);
          this.refresh.emit();
        },
        error: (err) => {
          this.changingPathway.set(false);
          this.changeError.set(problemDetail(err, 'Could not change the pathway. Please try again.'));
        },
      });
  }
}

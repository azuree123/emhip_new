import { HttpErrorResponse } from '@angular/common/http';
import { Component, EventEmitter, Output, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  CreatePathwayReferralRequest,
  GuestPathway,
  GuestPathwayDto,
  PathwayCategory,
} from '../../core/api-models';
import { AuthService } from '../../core/auth.service';
import { GuestsApiService } from '../../core/guests-api.service';
import { Permissions } from '../../core/permissions';
import { StaffPickerComponent } from '../../shared/staff-picker.component';
import { formatDate, guestPathwayLabel, humanize, pathwayStatusChip } from './guest-workspace.util';

/** One of the three "Select new pathway" option cards in the Change Pathway dialog. */
interface PathwayOption {
  value: GuestPathway;
  label: string;
  description: string;
}

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
 * "Date of change *", "Assigned by *" and the free-text reason — all now backed by
 * POST /guests/{id}/pathway-changes, which appends to GuestPathwayDto.changes. The tab's
 * current pathway and AFA flag come from that same DTO; the practical-support referrals
 * are separate data and keep their own secondary card.
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
  @Output() readonly refresh = new EventEmitter<void>();

  readonly pathway = signal<GuestPathwayDto | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly canEdit = this.auth.hasPermission(Permissions.Guests.PathwayEdit);

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

  readonly today = isoToday();

  readonly formatDate = formatDate;
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
    { value: 'MentalWellbeing', label: 'Mental Wellbeing', description: 'Early intervention and general wellbeing support.' },
    { value: 'ClinicalSupport', label: 'Clinical Support', description: 'Intense support for complex mental health needs.' },
    { value: 'CommunityRecovery', label: 'Community Recovery', description: 'Community-focused recovery and group support.' },
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

  readonly formValid = computed(
    () => !this.pathwayFieldError() && !this.assignedByFieldError() && !this.changedOnFieldError(),
  );

  referralForm: CreatePathwayReferralRequest = { category: 'HousingAdvice', detail: '' };

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
    const reason = this.reason().trim();
    this.guestsApi
      .changePathway(this.guestId(), {
        pathway,
        reason: reason || null,
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

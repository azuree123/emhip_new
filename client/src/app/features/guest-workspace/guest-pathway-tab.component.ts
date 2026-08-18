import { Component, EventEmitter, Output, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import {
  CreatePathwayReferralRequest,
  GuestOverviewDto,
  GuestPathway,
  GuestPathwayDto,
  PathwayCategory,
} from '../../core/api-models';
import { GuestsApiService } from '../../core/guests-api.service';
import { formatDate, humanize, pathwayStatusChip } from './guest-workspace.util';

/** One of the three "Select new pathway" option cards in the Change Pathway dialog. */
interface PathwayOption {
  value: GuestPathway;
  label: string;
  description: string;
}

/**
 * Pathway tab — pixel-sourced from GuestPathwayTab in project/screens/Components.bundle.js
 * (lines 29090–31284): a "Pathway History" card of bordered entry tiles (the current
 * allocation flagged with the grey "Current Pathway" pill) plus the red "Add New Pathway"
 * button that opens the Change Pathway dialog with its three pathway option cards.
 * The design's history entries are backed here by the guest's pathway referrals
 * (GuestPathwayDto), and the current allocation comes from GuestOverviewDto.pathway;
 * changing pathway calls the allocation endpoint.
 */
@Component({
  selector: 'app-guest-pathway-tab',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './guest-pathway-tab.component.html',
  styleUrl: './guest-pathway-tab.component.scss',
})
export class GuestPathwayTabComponent {
  private readonly guestsApi = inject(GuestsApiService);

  readonly guestId = input.required<string>();
  @Output() readonly refresh = new EventEmitter<void>();

  readonly pathway = signal<GuestPathwayDto | null>(null);
  readonly overview = signal<GuestOverviewDto | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  // "+ New referral" inline form.
  readonly showReferralForm = signal(false);
  readonly submittingReferral = signal(false);
  readonly referralError = signal<string | null>(null);

  // "Add New Pathway" → Change Pathway dialog.
  readonly showChangeDialog = signal(false);
  readonly selectedPathway = signal<GuestPathway | null>(null);
  readonly changingPathway = signal(false);
  readonly changeError = signal<string | null>(null);

  readonly formatDate = formatDate;
  readonly humanize = humanize;
  readonly pathwayStatusChip = pathwayStatusChip;

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
    forkJoin({
      pathway: this.guestsApi.getPathway(guestId),
      overview: this.guestsApi.getOverview(guestId),
    }).subscribe({
      next: ({ pathway, overview }) => {
        if (isCancelled()) return;
        this.pathway.set(pathway);
        this.overview.set(overview);
        this.loading.set(false);
      },
      error: () => {
        if (isCancelled()) return;
        this.error.set('Could not load pathway history for this guest.');
        this.loading.set(false);
      },
    });
  }

  currentPathwayLabel(): string | null {
    const current = this.overview()?.pathway;
    if (!current) return null;
    return this.pathwayOptions.find((o) => o.value === current)?.label ?? humanize(current);
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
      error: () => {
        this.submittingReferral.set(false);
        this.referralError.set('Could not create this referral. Please try again.');
      },
    });
  }

  openChangeDialog(): void {
    this.selectedPathway.set(this.overview()?.pathway ?? null);
    this.changeError.set(null);
    this.showChangeDialog.set(true);
  }

  closeChangeDialog(): void {
    if (this.changingPathway()) return;
    this.showChangeDialog.set(false);
  }

  selectPathway(option: GuestPathway): void {
    this.selectedPathway.set(option);
  }

  changePathway(): void {
    const pathway = this.selectedPathway();
    const overview = this.overview();
    if (!pathway || !overview) {
      this.changeError.set('Select a pathway first.');
      return;
    }
    this.changingPathway.set(true);
    this.changeError.set(null);
    this.guestsApi
      .allocate(this.guestId(), { pathway, afaSupportNeeded: overview.afaSupportNeeded })
      .subscribe({
        next: () => {
          this.changingPathway.set(false);
          this.showChangeDialog.set(false);
          this.load(this.guestId(), () => false);
          this.refresh.emit();
        },
        error: () => {
          this.changingPathway.set(false);
          this.changeError.set('Could not change the pathway. Please try again.');
        },
      });
  }
}

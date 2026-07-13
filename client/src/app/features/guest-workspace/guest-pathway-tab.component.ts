import { Component, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CreatePathwayReferralRequest, GuestPathwayDto, PathwayCategory } from '../../core/api-models';
import { GuestsApiService } from '../../core/guests-api.service';
import { formatDate, humanize, pathwayStatusChip } from './guest-workspace.util';

/** Pathway tab — clean panel over GuestPathwayDto's referral list, plus a form to create a
 *  new referral (housing, employment, benefits, food/essentials, immigration/legal, other). */
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

  readonly pathway = signal<GuestPathwayDto | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly showForm = signal(false);
  readonly submitting = signal(false);
  readonly submitError = signal<string | null>(null);

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

  form: CreatePathwayReferralRequest = { category: 'HousingAdvice', detail: '' };

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
      next: (dto) => {
        if (isCancelled()) return;
        this.pathway.set(dto);
        this.loading.set(false);
      },
      error: () => {
        if (isCancelled()) return;
        this.error.set('Could not load pathway history for this guest.');
        this.loading.set(false);
      },
    });
  }

  toggleForm(): void {
    this.showForm.update((v) => !v);
    this.form = { category: 'HousingAdvice', detail: '' };
    this.submitError.set(null);
  }

  submit(): void {
    this.submitting.set(true);
    this.submitError.set(null);
    this.guestsApi.createPathwayReferral(this.guestId(), this.form).subscribe({
      next: () => {
        this.submitting.set(false);
        this.showForm.set(false);
        this.load(this.guestId(), () => false);
      },
      error: () => {
        this.submitting.set(false);
        this.submitError.set('Could not create this referral. Please try again.');
      },
    });
  }
}

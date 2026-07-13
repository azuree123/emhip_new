import { Component, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GuestDemographicsDto, UpdateDemographicsRequest } from '../../core/api-models';
import { GuestsApiService } from '../../core/guests-api.service';

/**
 * Demographics tab — no exact pixel source exists for this tab in the Figma export (only
 * Overview was extracted), so this is a clean, functional panel built from the same card/type
 * tokens as the Overview tab, wired to GuestDemographicsDto via GuestsApiService.
 */
@Component({
  selector: 'app-guest-demographics-tab',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './guest-demographics-tab.component.html',
  styleUrl: './guest-demographics-tab.component.scss',
})
export class GuestDemographicsTabComponent {
  private readonly guestsApi = inject(GuestsApiService);

  readonly guestId = input.required<string>();

  readonly demographics = signal<GuestDemographicsDto | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly editing = signal(false);
  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);

  form: UpdateDemographicsRequest = this.emptyForm();

  constructor() {
    effect((onCleanup) => {
      const id = this.guestId();
      let cancelled = false;
      onCleanup(() => (cancelled = true));
      this.load(id, () => cancelled);
    });
  }

  private emptyForm(): UpdateDemographicsRequest {
    return {
      ethnicity: null,
      nationality: null,
      preferredLanguage: null,
      interpreterNeeded: false,
      housingStatus: null,
      employmentStatus: null,
      emergencyContactName: null,
      emergencyContactPhone: null,
      emergencyContactRelationship: null,
      gpName: null,
      gpPractice: null,
      nhsNumber: null,
    };
  }

  private load(guestId: string, isCancelled: () => boolean): void {
    this.loading.set(true);
    this.error.set(null);
    this.guestsApi.getDemographics(guestId).subscribe({
      next: (dto) => {
        if (isCancelled()) return;
        this.demographics.set(dto);
        this.loading.set(false);
      },
      error: () => {
        if (isCancelled()) return;
        this.error.set('Could not load demographics for this guest.');
        this.loading.set(false);
      },
    });
  }

  startEdit(): void {
    const d = this.demographics();
    this.form = d
      ? {
          ethnicity: d.ethnicity,
          nationality: d.nationality,
          preferredLanguage: d.preferredLanguage,
          interpreterNeeded: d.interpreterNeeded,
          housingStatus: d.housingStatus,
          employmentStatus: d.employmentStatus,
          emergencyContactName: d.emergencyContactName,
          emergencyContactPhone: d.emergencyContactPhone,
          emergencyContactRelationship: d.emergencyContactRelationship,
          gpName: d.gpName,
          gpPractice: d.gpPractice,
          nhsNumber: d.nhsNumber,
        }
      : this.emptyForm();
    this.saveError.set(null);
    this.editing.set(true);
  }

  cancelEdit(): void {
    this.editing.set(false);
  }

  save(): void {
    this.saving.set(true);
    this.saveError.set(null);
    this.guestsApi.updateDemographics(this.guestId(), this.form).subscribe({
      next: () => {
        this.saving.set(false);
        this.editing.set(false);
        this.load(this.guestId(), () => false);
      },
      error: () => {
        this.saving.set(false);
        this.saveError.set('Could not save these changes. Please try again.');
      },
    });
  }
}

import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GuestDemographicsDto, GuestOverviewDto, LookupItemDto, UpdateDemographicsRequest } from '../../core/api-models';
import { GuestsApiService } from '../../core/guests-api.service';
import { LookupCategories, SettingsApiService } from '../../core/settings-api.service';
import { formatDate } from './guest-workspace.util';

/** One row in the "Profile completion" side card — a demographics section and whether every
 *  one of its (text) fields has been recorded. */
interface CompletionSection {
  label: string;
  complete: boolean;
}

/**
 * Demographics tab — layout from GuestDemographicsTab (project/screens/Components.bundle.js,
 * lines 15849-18990): a wide column of section cards ("Personal details — captured at
 * registration", then the phase-2 sections) beside a "Profile completion" summary card with
 * Completed/Pending chips per section.
 *
 * Honest-data notes: the bundle's "Marital status", "Address", "Postcode", "Sex", "Living
 * situation" and "Referral type" fields have no backing on GuestDemographicsDto /
 * GuestOverviewDto and are omitted. The completion percentage is computed from the 12 real
 * text fields of GuestDemographicsDto (interpreterNeeded is a boolean and always "recorded",
 * so it is excluded from the count).
 *
 * "Country of origin" is reported separately from nationality (it drives the demographics
 * report filters), so both are stored and edited side by side; its options come from the
 * admin-maintained "CountryOfOrigin" lookup category.
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
  private readonly settingsApi = inject(SettingsApiService);

  readonly guestId = input.required<string>();
  /** Registration-time identity fields (name, DOB, phone, email) shown in "Personal details".
   *  Optional so the tab still renders standalone without the workspace shell. */
  readonly overview = input<GuestOverviewDto | null>(null);

  readonly demographics = signal<GuestDemographicsDto | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly editing = signal(false);
  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);

  /** Admin-maintained "CountryOfOrigin" options; a failed load just leaves the dropdown empty. */
  readonly countryOfOriginOptions = signal<LookupItemDto[]>([]);

  /** The dropdown's choices: the active lookup labels, plus any value already stored on the
   *  guest that is no longer an active lookup item, so opening the editor never silently
   *  drops what a colleague recorded earlier. */
  readonly countryOfOriginChoices = computed(() => {
    const labels = this.countryOfOriginOptions().map((item) => item.label);
    const current = this.demographics()?.countryOfOrigin;
    return current && !labels.includes(current) ? [current, ...labels] : labels;
  });

  form: UpdateDemographicsRequest = this.emptyForm();

  readonly formatDate = formatDate;

  /** Sections mirrored from the design's completion list, backed by real fields only. */
  readonly sections = computed<CompletionSection[]>(() => {
    const d = this.demographics();
    const filled = (...values: (string | null | undefined)[]) => values.every((v) => !!v && v.trim() !== '');
    return [
      {
        label: 'Identity & language',
        complete: !!d && filled(d.ethnicity, d.nationality, d.countryOfOrigin, d.preferredLanguage),
      },
      { label: 'GP & NHS details', complete: !!d && filled(d.gpName, d.gpPractice, d.nhsNumber) },
      {
        label: 'Emergency contact',
        complete:
          !!d && filled(d.emergencyContactName, d.emergencyContactPhone, d.emergencyContactRelationship),
      },
      { label: 'Housing & employment', complete: !!d && filled(d.housingStatus, d.employmentStatus) },
    ];
  });

  readonly completedSectionCount = computed(() => this.sections().filter((s) => s.complete).length);

  /** Percent of the 12 recordable text fields that are filled in. */
  readonly completionPercent = computed(() => {
    const d = this.demographics();
    if (!d) return 0;
    const fields: (string | null | undefined)[] = [
      d.ethnicity,
      d.nationality,
      d.countryOfOrigin,
      d.preferredLanguage,
      d.housingStatus,
      d.employmentStatus,
      d.emergencyContactName,
      d.emergencyContactPhone,
      d.emergencyContactRelationship,
      d.gpName,
      d.gpPractice,
      d.nhsNumber,
    ];
    const filled = fields.filter((v) => !!v && v.trim() !== '').length;
    return Math.round((filled / fields.length) * 100);
  });

  constructor() {
    effect((onCleanup) => {
      const id = this.guestId();
      let cancelled = false;
      onCleanup(() => (cancelled = true));
      this.load(id, () => cancelled);
    });
    this.settingsApi.getLookups(LookupCategories.CountryOfOrigin).subscribe({
      next: (items) => this.countryOfOriginOptions.set(items.filter((i) => i.isActive)),
      error: () => this.countryOfOriginOptions.set([]),
    });
  }

  private emptyForm(): UpdateDemographicsRequest {
    return {
      ethnicity: null,
      nationality: null,
      countryOfOrigin: null,
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
          countryOfOrigin: d.countryOfOrigin ?? null,
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
        this.saveError.set('Could not save these changes. You may not have permission to edit guest profiles.');
      },
    });
  }
}

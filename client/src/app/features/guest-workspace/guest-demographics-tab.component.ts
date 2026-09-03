import { Component, computed, effect, inject, input, output, signal, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GuestDemographicsDto, GuestOverviewDto, LookupItemDto, UpdateDemographicsRequest } from '../../core/api-models';
import { EMPLOYMENT_STATUS_OPTIONS, ETHNICITY_OPTIONS, HOUSING_STATUS_OPTIONS } from '../../core/demographic-options';
import { GuestsApiService } from '../../core/guests-api.service';
import { LookupCategories, SettingsApiService } from '../../core/settings-api.service';
import { formatDate } from './guest-workspace.util';

/** One row in the "Profile completion" side card — a demographics section and whether every
 *  one of its (text) fields has been recorded. */
interface CompletionSection {
  label: string;
  complete: boolean;
}

/** The workspace tabs this tab can hand off to once the demographics are done. */
export type DemographicsNextStep = 'initial' | 'dialog';

/**
 * Demographics tab — layout from GuestDemographicsTab (project/screens/Components.bundle.js,
 * lines 15849-18990): a wide column of section cards ("Personal details — captured at
 * registration", then the phase-2 sections) beside a "Profile completion" summary card with
 * Completed/Pending chips per section.
 *
 * This is where the demographic record is actually completed. Registration (the reception /
 * check-in step) only captures the identity fields plus ethnicity, so every other section here
 * — identity & language, household (marital status, living group, housing, employment),
 * emergency contact, GP & NHS — starts Pending and is filled in by the worker when they have
 * time with the guest. The side card carries the flow on: "Continue to Initial conversation"
 * hands off to the next workspace section (then DIALOG scores), which is where the clinical
 * record starts.
 *
 * Honest-data notes: the bundle's "Address", "Postcode" and "Sex" fields live on the Guest
 * record itself (captured at registration) and "Referral type" on the overview, so they are
 * not repeated here. The completion percentage is computed from the 14 real text fields of
 * GuestDemographicsDto (interpreterNeeded is a boolean and always "recorded", so it is
 * excluded from the count).
 *
 * Ethnicity, country of origin, marital status and living group are lookup-backed
 * (Settings → Lookups); ethnicity falls back to the built-in list when no lookup is configured.
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
  /** Open straight into the editor (e.g. arriving from the registration success screen). */
  readonly startEditing = input(false);

  /** "Continue to Initial conversation" / "DIALOG scores" — the workspace switches tab. */
  readonly continueTo = output<DemographicsNextStep>();

  readonly demographics = signal<GuestDemographicsDto | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly editing = signal(false);
  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);
  /** Set after a successful save so the side card can confirm it. */
  readonly savedAt = signal<Date | null>(null);

  /** Admin-maintained option lists; a failed load just leaves the dropdown on its fallback. */
  readonly ethnicityLookup = signal<LookupItemDto[]>([]);
  readonly countryOfOriginOptions = signal<LookupItemDto[]>([]);
  readonly maritalStatusOptions = signal<LookupItemDto[]>([]);
  readonly livingGroupOptions = signal<LookupItemDto[]>([]);

  readonly housingStatusOptions = HOUSING_STATUS_OPTIONS;
  readonly employmentStatusOptions = EMPLOYMENT_STATUS_OPTIONS;

  /** The dropdown's choices: the active lookup labels (or the built-in list), plus any value
   *  already stored on the guest that is no longer offered, so opening the editor never
   *  silently drops what a colleague recorded earlier. */
  readonly ethnicityChoices = computed(() => this.withCurrent(
    this.ethnicityLookup().length > 0 ? this.ethnicityLookup().map((i) => i.label) : ETHNICITY_OPTIONS,
    this.demographics()?.ethnicity,
  ));
  readonly countryOfOriginChoices = computed(() =>
    this.withCurrent(this.countryOfOriginOptions().map((i) => i.label), this.demographics()?.countryOfOrigin),
  );
  readonly maritalStatusChoices = computed(() =>
    this.withCurrent(this.maritalStatusOptions().map((i) => i.label), this.demographics()?.maritalStatus),
  );
  readonly livingGroupChoices = computed(() =>
    this.withCurrent(this.livingGroupOptions().map((i) => i.label), this.demographics()?.livingGroup),
  );
  readonly housingChoices = computed(() => this.withCurrent(HOUSING_STATUS_OPTIONS, this.demographics()?.housingStatus));
  readonly employmentChoices = computed(() =>
    this.withCurrent(EMPLOYMENT_STATUS_OPTIONS, this.demographics()?.employmentStatus),
  );

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
      {
        label: 'Household, housing & employment',
        complete: !!d && filled(d.maritalStatus, d.livingGroup, d.housingStatus, d.employmentStatus),
      },
      {
        label: 'Emergency contact',
        complete:
          !!d && filled(d.emergencyContactName, d.emergencyContactPhone, d.emergencyContactRelationship),
      },
      { label: 'GP & NHS details', complete: !!d && filled(d.gpName, d.gpPractice, d.nhsNumber) },
    ];
  });

  readonly completedSectionCount = computed(() => this.sections().filter((s) => s.complete).length);
  readonly allComplete = computed(() => this.sections().length > 0 && this.completedSectionCount() === this.sections().length);

  /** Percent of the 14 recordable text fields that are filled in. */
  readonly completionPercent = computed(() => {
    const d = this.demographics();
    if (!d) return 0;
    const fields: (string | null | undefined)[] = [
      d.ethnicity,
      d.nationality,
      d.countryOfOrigin,
      d.preferredLanguage,
      d.maritalStatus,
      d.livingGroup,
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
      this.load(id, () => cancelled, this.startEditing());
    });
    this.loadLookup(LookupCategories.Ethnicity, this.ethnicityLookup);
    this.loadLookup(LookupCategories.CountryOfOrigin, this.countryOfOriginOptions);
    this.loadLookup(LookupCategories.MaritalStatus, this.maritalStatusOptions);
    this.loadLookup(LookupCategories.LivingGroup, this.livingGroupOptions);
  }

  private withCurrent(options: readonly string[], current: string | null | undefined): string[] {
    return current && !options.includes(current) ? [current, ...options] : [...options];
  }

  private loadLookup(category: string, target: WritableSignal<LookupItemDto[]>): void {
    this.settingsApi.getLookups(category).subscribe({
      next: (items) => target.set(items.filter((i) => i.isActive)),
      error: () => target.set([]),
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
      maritalStatus: null,
      livingGroup: null,
      emergencyContactName: null,
      emergencyContactPhone: null,
      emergencyContactRelationship: null,
      gpName: null,
      gpPractice: null,
      nhsNumber: null,
    };
  }

  private load(guestId: string, isCancelled: () => boolean, openEditor = false): void {
    this.loading.set(true);
    this.error.set(null);
    this.guestsApi.getDemographics(guestId).subscribe({
      next: (dto) => {
        if (isCancelled()) return;
        this.demographics.set(dto);
        this.loading.set(false);
        if (openEditor) this.startEdit();
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
          maritalStatus: d.maritalStatus ?? null,
          livingGroup: d.livingGroup ?? null,
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

  /** Save; when `andContinue` is set the workspace moves on to the initial conversation. */
  save(andContinue = false): void {
    this.saving.set(true);
    this.saveError.set(null);
    this.guestsApi.updateDemographics(this.guestId(), this.form).subscribe({
      next: () => {
        this.saving.set(false);
        this.editing.set(false);
        this.savedAt.set(new Date());
        this.load(this.guestId(), () => false);
        if (andContinue) this.continueTo.emit('initial');
      },
      error: () => {
        this.saving.set(false);
        this.saveError.set('Could not save these changes. You may not have permission to edit guest profiles.');
      },
    });
  }

  goTo(step: DemographicsNextStep): void {
    this.continueTo.emit(step);
  }
}

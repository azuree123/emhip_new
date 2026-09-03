import { Component, computed, effect, inject, input, output, signal, WritableSignal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { catchError, of } from 'rxjs';
import {
  ClinicalProfileDto,
  GuestDemographicsDto,
  GuestOverviewDto,
  LookupItemDto,
  UpdateDemographicsRequest,
} from '../../core/api-models';
import { AuthService } from '../../core/auth.service';
import { EMPLOYMENT_STATUS_OPTIONS, ETHNICITY_OPTIONS, HOUSING_STATUS_OPTIONS } from '../../core/demographic-options';
import { GuestsApiService } from '../../core/guests-api.service';
import { Permissions } from '../../core/permissions';
import { LookupCategories, SettingsApiService } from '../../core/settings-api.service';
import { formatDate } from './guest-workspace.util';

/** The five Phase 2 sections of the design's Demographics tab, each saved independently. */
export type DemographicsSectionKey = 'contact' | 'identity' | 'migration' | 'gp' | 'emergency';

/** One row in the "Profile completion" side card. */
interface CompletionSection {
  key: DemographicsSectionKey;
  label: string;
  complete: boolean;
}

/** The workspace tabs this tab can hand off to. */
export type DemographicsNextStep = 'initial' | 'dialog' | 'clinical';

/**
 * Demographics tab — design "Guest - Demographics Tab" (EMHIP - Additional Changes): a wide
 * column of section cards beside a "Profile completion" summary card.
 *
 * "Personal details — captured at registration" is read-only (the reception / check-in step
 * only captures identity, contact details, ethnicity and the referral). The remaining record
 * is the design's five Phase 2 sections, each with its own Completed / Pending chip and its
 * own Edit → Save, so "each section saves independently":
 *
 *   Contact & housing · Identity, language & interpreter · Migration & background ·
 *   GP, NHS & PCN details · Emergency / additional contact
 *
 * plus "Relationship to other services", which reads the clinical profile's service
 * involvement (MH team / clinician, social services coordinator, CPN, Trust) — those fields
 * belong to the Clinical Details tab, so this card links there instead of duplicating them.
 *
 * The API stores the whole demographics record in one PUT, so a section save sends the
 * current record with only that section's fields changed. Editing follows the
 * guests.demographics.edit permission (the design's "Only managers can edit guest profiles"
 * note, made role-configurable); without it every section is read-only.
 *
 * The side card carries the flow on: "Continue to Initial conversation" hands off to the
 * next workspace section (then DIALOG scores), where the clinical record starts.
 */
@Component({
  selector: 'app-guest-demographics-tab',
  standalone: true,
  imports: [FormsModule, NgTemplateOutlet],
  templateUrl: './guest-demographics-tab.component.html',
  styleUrl: './guest-demographics-tab.component.scss',
})
export class GuestDemographicsTabComponent {
  private readonly guestsApi = inject(GuestsApiService);
  private readonly settingsApi = inject(SettingsApiService);
  private readonly auth = inject(AuthService);

  readonly guestId = input.required<string>();
  /** Registration-time identity fields shown in "Personal details". Optional so the tab still
   *  renders standalone without the workspace shell. */
  readonly overview = input<GuestOverviewDto | null>(null);
  /** Open the first pending section's editor straight away (arriving from registration). */
  readonly startEditing = input(false);

  /** "Continue to …" — the workspace switches tab. */
  readonly continueTo = output<DemographicsNextStep>();

  readonly canEdit = this.auth.hasPermission(Permissions.Guests.DemographicsEdit);

  readonly demographics = signal<GuestDemographicsDto | null>(null);
  readonly clinical = signal<ClinicalProfileDto | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  /** Which section's editor is open — at most one at a time. */
  readonly editingSection = signal<DemographicsSectionKey | null>(null);
  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);
  /** Which section was last saved, for its "Saved" confirmation. */
  readonly lastSaved = signal<{ key: DemographicsSectionKey; at: Date } | null>(null);

  /** Admin-maintained option lists; a failed load just leaves the dropdown on its fallback. */
  readonly ethnicityLookup = signal<LookupItemDto[]>([]);
  readonly countryOfOriginOptions = signal<LookupItemDto[]>([]);
  readonly maritalStatusOptions = signal<LookupItemDto[]>([]);
  readonly livingGroupOptions = signal<LookupItemDto[]>([]);

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

  /** The five Phase 2 sections, in the design's order, with their completion. */
  readonly sections = computed<CompletionSection[]>(() => {
    const d = this.demographics();
    const filled = (...values: (string | null | undefined)[]) => values.every((v) => !!v && v.trim() !== '');
    return [
      { key: 'contact', label: 'Contact & housing', complete: !!d && filled(d.housingStatus, d.livingGroup, d.employmentStatus) },
      {
        key: 'identity',
        label: 'Identity, language & interpreter',
        complete: !!d && filled(d.ethnicity, d.preferredLanguage, d.maritalStatus),
      },
      { key: 'migration', label: 'Migration & background', complete: !!d && filled(d.nationality, d.countryOfOrigin) },
      { key: 'gp', label: 'GP, NHS & PCN details', complete: !!d && filled(d.gpName, d.gpPractice, d.nhsNumber) },
      {
        key: 'emergency',
        label: 'Emergency / additional contact',
        complete: !!d && filled(d.emergencyContactName, d.emergencyContactPhone, d.emergencyContactRelationship),
      },
    ];
  });

  readonly completedSectionCount = computed(() => this.sections().filter((s) => s.complete).length);
  readonly remainingSectionCount = computed(() => this.sections().length - this.completedSectionCount());
  readonly allComplete = computed(() => this.remainingSectionCount() === 0);

  /** "Relationship to other services" — recorded on the clinical profile, shown here read-only. */
  readonly otherServicesRecorded = computed(() => {
    const c = this.clinical();
    return !!c && (!!c.mhTeamClinician || !!c.socialServicesCoordinator || c.cpnInvolved || c.trustInvolvement);
  });

  /** Percent of the 14 recordable text fields that are filled in. */
  readonly completionPercent = computed(() => {
    const d = this.demographics();
    if (!d) return 0;
    const fields: (string | null | undefined)[] = [
      d.ethnicity, d.nationality, d.countryOfOrigin, d.preferredLanguage, d.maritalStatus, d.livingGroup,
      d.housingStatus, d.employmentStatus, d.emergencyContactName, d.emergencyContactPhone,
      d.emergencyContactRelationship, d.gpName, d.gpPractice, d.nhsNumber,
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
      ethnicity: null, nationality: null, countryOfOrigin: null, preferredLanguage: null, interpreterNeeded: false,
      housingStatus: null, employmentStatus: null, maritalStatus: null, livingGroup: null,
      emergencyContactName: null, emergencyContactPhone: null, emergencyContactRelationship: null,
      gpName: null, gpPractice: null, nhsNumber: null,
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
        if (openEditor && this.canEdit) {
          const firstPending = this.sections().find((s) => !s.complete);
          if (firstPending) this.startEdit(firstPending.key);
        }
      },
      error: () => {
        if (isCancelled()) return;
        this.error.set('Could not load demographics for this guest.');
        this.loading.set(false);
      },
    });
    // The other-services card is a courtesy view; a 403/404 simply leaves it empty.
    this.guestsApi
      .getClinicalProfile(guestId)
      .pipe(catchError(() => of(null)))
      .subscribe((profile) => {
        if (!isCancelled()) this.clinical.set(profile);
      });
  }

  isEditing(key: DemographicsSectionKey): boolean {
    return this.editingSection() === key;
  }

  sectionComplete(key: DemographicsSectionKey): boolean {
    return this.sections().find((s) => s.key === key)?.complete ?? false;
  }

  /** Opens one section's editor, seeded from the whole record (so the PUT carries every field). */
  startEdit(key: DemographicsSectionKey): void {
    if (!this.canEdit) return;
    const d = this.demographics();
    this.form = d
      ? {
          ethnicity: d.ethnicity, nationality: d.nationality, countryOfOrigin: d.countryOfOrigin ?? null,
          preferredLanguage: d.preferredLanguage, interpreterNeeded: d.interpreterNeeded,
          housingStatus: d.housingStatus, employmentStatus: d.employmentStatus,
          maritalStatus: d.maritalStatus ?? null, livingGroup: d.livingGroup ?? null,
          emergencyContactName: d.emergencyContactName, emergencyContactPhone: d.emergencyContactPhone,
          emergencyContactRelationship: d.emergencyContactRelationship,
          gpName: d.gpName, gpPractice: d.gpPractice, nhsNumber: d.nhsNumber,
        }
      : this.emptyForm();
    this.saveError.set(null);
    this.editingSection.set(key);
  }

  cancelEdit(): void {
    this.editingSection.set(null);
    this.saveError.set(null);
  }

  /** Saves the open section (the whole record, with that section's edits). */
  save(): void {
    const key = this.editingSection();
    if (!key) return;
    this.saving.set(true);
    this.saveError.set(null);
    this.guestsApi.updateDemographics(this.guestId(), this.form).subscribe({
      next: () => {
        this.saving.set(false);
        this.editingSection.set(null);
        this.lastSaved.set({ key, at: new Date() });
        this.load(this.guestId(), () => false);
      },
      error: () => {
        this.saving.set(false);
        this.saveError.set('Could not save this section. You may not have permission to edit guest profiles.');
      },
    });
  }

  goTo(step: DemographicsNextStep): void {
    this.continueTo.emit(step);
  }
}

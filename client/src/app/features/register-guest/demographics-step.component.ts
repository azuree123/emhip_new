import { ChangeDetectionStrategy, Component, inject, Input, OnInit, signal, WritableSignal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { catchError, of } from 'rxjs';
import { LookupItemDto, ReferralType } from '../../core/api-models';
import { LookupCategories, SettingsApiService } from '../../core/settings-api.service';

/**
 * Step 1 of the Register Guest wizard — "Demographics", ported from the Desktop83 screen
 * (project/screens/Components.bundle.js lines 44679-47045). The source lays four white cards
 * on a gray canvas: "Pre-registration form" (info banner + Completed by/Date), "Personal
 * details", "Contact & housing" and "Referral information"; here they are reflowed into the
 * drawer and driven by a real Reactive Form.
 *
 * Field-to-backend mapping (RegisterGuestRequest / UpdateDemographicsRequest in
 * core/api-models.ts) — honest-data deviations from the mock:
 *  - "Completed by *" and "Date *" have no request fields (the API stamps the registering
 *    user and registeredAt server-side), so they render read-only, pre-filled from the login
 *    session, and are never submitted.
 *  - "Marital status" and "Living group" (spec §6.1) are real UpdateDemographicsRequest
 *    fields, populated from the MaritalStatus / LivingGroup lookups. Gender
 *    (RegisterGuestRequest.gender) and Nationality (UpdateDemographicsRequest.nationality)
 *    keep the separate inputs the design gives them. "Economic activity" is re-labelled
 *    "Employment status" (UpdateDemographicsRequest.employmentStatus).
 *  - "Country of origin" (UpdateDemographicsRequest.countryOfOrigin) is recorded separately
 *    from nationality — the demographics reports filter on it — and is populated from the
 *    CountryOfOrigin lookup, alongside Nationality in "Contact & housing".
 *  - The second "Phone Number" in Contact & housing has no backend field (only one
 *    contactPhone exists); dropped — emergency-contact numbers live in "Additional details".
 *  - "Additional details" is a functional addition (not in the mock) so every remaining
 *    UpdateDemographicsRequest field (preferred language, interpreter, emergency contact,
 *    GP, NHS number) has a real place to be captured, in the same field styling.
 *  - "Referral source *" maps to RegisterGuestRequest.referralSource (options match the
 *    backend's seeded sources). Next to it, the spec §6.2 Primary/Secondary classification
 *    and — for Secondary referrals — the subcategory map to RegisterGuestRequest.referralType
 *    and .referralSubcategory. The subcategory is required client-side for Secondary so the
 *    user sees it before the server's own rule rejects the registration.
 *  - The consent checkbox is not drawn on any of the redesigned screens, but
 *    RegisterGuestRequest.consentGiven is required — kept at the bottom of this step.
 */
@Component({
  selector: 'app-demographics-step',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './demographics-step.component.html',
  styleUrls: ['./demographics-step.component.scss', './_form-shared.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DemographicsStepComponent implements OnInit {
  private readonly settingsApi = inject(SettingsApiService);

  @Input({ required: true }) form!: FormGroup;
  /** "Completed by *" — pre-filled from the logged-in user, read-only (no API field). */
  @Input({ required: true }) completedBy = '';
  /** "Date *" — today, read-only (registeredAt is stamped server-side). */
  @Input({ required: true }) todayLabel = '';

  /** Admin-maintained option lists; a failed load just leaves the dropdown empty. */
  protected readonly maritalStatusOptions = signal<LookupItemDto[]>([]);
  protected readonly livingGroupOptions = signal<LookupItemDto[]>([]);
  protected readonly countryOfOriginOptions = signal<LookupItemDto[]>([]);
  protected readonly secondaryReferralOptions = signal<LookupItemDto[]>([]);

  constructor() {
    this.loadLookups(LookupCategories.MaritalStatus, this.maritalStatusOptions);
    this.loadLookups(LookupCategories.LivingGroup, this.livingGroupOptions);
    this.loadLookups(LookupCategories.CountryOfOrigin, this.countryOfOriginOptions);
    this.loadLookups(LookupCategories.SecondaryReferralSubcategory, this.secondaryReferralOptions);
  }

  /**
   * "Country of origin" belongs to this step, but the wizard form group is built by the
   * parent; register the control here when the parent's "contact" group does not already
   * declare one, so the field works either way.
   */
  ngOnInit(): void {
    const contact = this.form.get('contact');
    if (contact instanceof FormGroup && !contact.get('countryOfOrigin')) {
      contact.addControl('countryOfOrigin', new FormControl('', { nonNullable: true }));
    }
  }

  private loadLookups(category: string, target: WritableSignal<LookupItemDto[]>): void {
    this.settingsApi
      .getLookups(category)
      .pipe(catchError(() => of([] as LookupItemDto[])))
      .subscribe((items) => target.set(items.filter((item) => item.isActive)));
  }

  /** True once the Primary/Secondary classification is "Secondary" — reveals the subcategory. */
  protected get secondaryReferral(): boolean {
    return this.form.get('referral.referralType')?.value === 'Secondary';
  }

  protected invalid(path: string): boolean {
    const control = this.form.get(path);
    return !!control && control.invalid && control.touched;
  }

  protected readonly genderOptions = ['Male', 'Female', 'Non-binary', 'Prefer not to say', 'Other'];
  protected readonly ethnicityOptions = [
    'Black African',
    'Black Caribbean',
    'Black British',
    'White British',
    'White Irish',
    'White Other',
    'Asian Indian',
    'Asian Pakistani',
    'Asian Bangladeshi',
    'Asian Chinese',
    'Asian Other',
    'Mixed White & Black Caribbean',
    'Mixed White & Black African',
    'Mixed Other',
    'Arab',
    'Other',
    'Prefer not to say',
  ];
  protected readonly housingStatusOptions = [
    'Private Rented',
    'Social Housing',
    'Owner Occupier',
    'Temporary Accommodation',
    'Homeless / No Fixed Abode',
    'Living with Family/Friends',
    'Other',
  ];
  protected readonly employmentStatusOptions = [
    'Employed Full-time',
    'Employed part-time',
    'Self-employed',
    'Unemployed',
    'Student',
    'Retired',
    'Unable to Work',
  ];
  /** Matches the backend's seeded referral sources — submitted as RegisterGuestRequest.referralSource. */
  protected readonly referralSourceOptions = [
    'GP referral',
    'CMHT',
    'Community organisation',
    'Self-referral',
    'Family / carer',
    'Hospital discharge',
  ];
  /** Spec §6.2 referral classification — RegisterGuestRequest.referralType. */
  protected readonly referralTypeOptions: ReferralType[] = ['Primary', 'Secondary'];
}

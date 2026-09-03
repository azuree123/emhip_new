import { ChangeDetectionStrategy, Component, inject, Input, signal, WritableSignal } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { catchError, of } from 'rxjs';
import { LookupItemDto, ReferralType } from '../../core/api-models';
import { ETHNICITY_OPTIONS, GENDER_OPTIONS } from '../../core/demographic-options';
import { LookupCategories, SettingsApiService } from '../../core/settings-api.service';

/**
 * Step 1 of the Register Guest wizard — "Demographics", ported from the Desktop83 screen
 * (project/screens/Components.bundle.js lines 44679-47045) and then deliberately trimmed to
 * what reception / check-in actually captures: the "Pre-registration form" banner, the
 * identity fields the guest record itself needs (RegisterGuestRequest — name, date of birth,
 * phone, email, address, gender), ethnicity for reporting, and the referral + consent.
 *
 * Everything else the design's demographics screen carries — marital status, living group,
 * housing, employment, nationality, country of origin, preferred language, interpreter,
 * emergency contact, GP and NHS number — is NOT asked here. Those live on the workspace
 * Demographics tab (GuestDemographicsTabComponent), where each section shows as Pending
 * until a worker completes it with the guest. The wizard moves straight on to the initial
 * conversation, DIALOG and pathway allocation instead.
 *
 * Field-to-backend mapping — honest-data deviations from the mock:
 *  - "Completed by *" and "Date *" have no request fields (the API stamps the registering
 *    user and registeredAt server-side), so they render read-only, pre-filled from the login
 *    session, and are never submitted.
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
export class DemographicsStepComponent {
  private readonly settingsApi = inject(SettingsApiService);

  @Input({ required: true }) form!: FormGroup;
  /** "Completed by *" — pre-filled from the logged-in user, read-only (no API field). */
  @Input({ required: true }) completedBy = '';
  /** "Date *" — today, read-only (registeredAt is stamped server-side). */
  @Input({ required: true }) todayLabel = '';

  /** Admin-maintained option lists; a failed load just leaves the dropdown on its fallback. */
  protected readonly ethnicityLookup = signal<LookupItemDto[]>([]);
  protected readonly genderLookup = signal<LookupItemDto[]>([]);
  protected readonly secondaryReferralOptions = signal<LookupItemDto[]>([]);

  constructor() {
    this.loadLookups(LookupCategories.Ethnicity, this.ethnicityLookup);
    this.loadLookups(LookupCategories.Gender, this.genderLookup);
    this.loadLookups(LookupCategories.SecondaryReferralSubcategory, this.secondaryReferralOptions);
  }

  private loadLookups(category: string, target: WritableSignal<LookupItemDto[]>): void {
    this.settingsApi
      .getLookups(category)
      .pipe(catchError(() => of([] as LookupItemDto[])))
      .subscribe((items) => target.set(items.filter((item) => item.isActive)));
  }

  /** Lookup labels when the admin has configured the category, else the built-in list. */
  protected get ethnicityOptions(): string[] {
    const configured = this.ethnicityLookup().map((i) => i.label);
    return configured.length > 0 ? configured : ETHNICITY_OPTIONS;
  }

  protected get genderOptions(): string[] {
    const configured = this.genderLookup().map((i) => i.label);
    return configured.length > 0 ? configured : GENDER_OPTIONS;
  }

  /** True once the Primary/Secondary classification is "Secondary" — reveals the subcategory. */
  protected get secondaryReferral(): boolean {
    return this.form.get('referral.referralType')?.value === 'Secondary';
  }

  protected invalid(path: string): boolean {
    const control = this.form.get(path);
    return !!control && control.invalid && control.touched;
  }

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

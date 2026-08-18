import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

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
 *  - The source's "Marital status *" dropdown renders the sample value "Male" — a Figma
 *    content mismatch (no maritalStatus exists anywhere in the API). Re-labelled "Gender"
 *    since that is the field the value represents (RegisterGuestRequest.gender).
 *  - "Living group" ("Lives alone") has no backend field — its slot captures "Nationality"
 *    (UpdateDemographicsRequest.nationality) instead. "Economic activity" is re-labelled
 *    "Employment status" (UpdateDemographicsRequest.employmentStatus).
 *  - The second "Phone Number" in Contact & housing has no backend field (only one
 *    contactPhone exists); dropped — emergency-contact numbers live in "Additional details".
 *  - "Additional details" is a functional addition (not in the mock) so every remaining
 *    UpdateDemographicsRequest field (preferred language, interpreter, emergency contact,
 *    GP, NHS number) has a real place to be captured, in the same field styling.
 *  - "Referral type *" maps to RegisterGuestRequest.referralSource (options match the
 *    backend's seeded sources) and is additionally echoed into the initial-conversation
 *    notes on submit (see RegisterGuestComponent.buildConversationRequest).
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
  @Input({ required: true }) form!: FormGroup;
  /** "Completed by *" — pre-filled from the logged-in user, read-only (no API field). */
  @Input({ required: true }) completedBy = '';
  /** "Date *" — today, read-only (registeredAt is stamped server-side). */
  @Input({ required: true }) todayLabel = '';

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
  protected readonly referralTypeOptions = [
    'GP referral',
    'CMHT',
    'Community organisation',
    'Self-referral',
    'Family / carer',
    'Hospital discharge',
  ];
}

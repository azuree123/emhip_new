import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

/**
 * Step 1 of the Register Guest wizard — ported from the `DmegographicsTab` function
 * (project/screens/Components.bundle.js lines 14622-20342, the "Register New Guest" panel
 * inside that screen). The source is a 1440px-wide Figma export of the guest list with this
 * panel as an absolutely-positioned drawer on top; here it's reflowed into a normal
 * grid/flexbox layout and driven by a real Reactive Form instead of static sample values.
 *
 * Field-to-backend mapping (see RegisterGuestRequest / UpdateDemographicsRequest in
 * core/api-models.ts):
 *  - First/Last name, Date of birth, Phone, Ethnicity -> RegisterGuestRequest core fields.
 *  - The source's "Marital status *" dropdown actually renders the sample value "Male" — a
 *    Figma content mismatch (there is no maritalStatus field anywhere in the API). Re-labelled
 *    "Gender" here since that's the field the value actually represents and it maps to
 *    RegisterGuestRequest.gender.
 *  - "Living group" (sample "Lives alone") and "Economic activity" have no matching backend
 *    field/data either; re-labelled "Nationality" and "Employment status" respectively so the
 *    same visual slots capture real UpdateDemographicsRequest fields instead of inventing new
 *    ones the API can't accept.
 *  - "Additional details" is a new section (not pixel-matched to the source, which didn't
 *    surface these) added so every other UpdateDemographicsRequest field (preferred language,
 *    interpreter needed, emergency contact, GP, NHS number) has a real place to be captured,
 *    using the same field styling as the rest of the form.
 *  - "Referral type" is rendered exactly as in the source for visual fidelity, but there is no
 *    referralType field in the API, so it is intentionally not submitted anywhere.
 *  - Consent checkbox: the source's demographics/initial-conversation screens don't show one
 *    (per the design handoff README it likely lives on the "REVIEW" step, which is out of
 *    scope here) — added at the bottom since RegisterGuestRequest.consentGiven is required.
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

  protected readonly genderOptions = ['Male', 'Female', 'Non-binary', 'Prefer not to say', 'Other'];
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
    'Employed Part-time',
    'Self-employed',
    'Unemployed',
    'Student',
    'Retired',
    'Unable to Work',
  ];
  protected readonly referralTypeOptions = [
    'Open access / self referred',
    'GP Referral',
    'Hospital Referral',
    'Social Services Referral',
    'Other Agency Referral',
  ];
}

import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CmhwOptionDto, GuestPathway } from '../../core/api-models';

/** The three pathway cards of Desktop81, keyed by the GuestPathway enum (core/api-models.ts). */
export const PATHWAY_OPTIONS: { value: GuestPathway; title: string; description: string }[] = [
  {
    value: 'MentalWellbeing',
    title: 'Mental Wellbeing',
    description: 'Early intervention and general wellbeing support.',
  },
  {
    value: 'ClinicalSupport',
    title: 'Clinical Support',
    description: 'Intense support for complex mental health needs.',
  },
  {
    value: 'CommunityRecovery',
    title: 'Community Recovery',
    description: 'Community-focused recovery and group support.',
  },
];

/**
 * Step 4 of the Register Guest wizard — "Pathway & allocation", ported from the Desktop81
 * screen (project/screens/Components.bundle.js lines 42794-44679): the "MDT pathway
 * recommendation" card with three selectable pathway tiles, the "Practical support / Advice
 * First Aid also needed?" checkbox band and the "Follow-up contact date" cadence dropdown.
 *
 * Honest-data notes: pathway + AFA checkbox map 1:1 onto AllocateGuestRequest. The follow-up
 * cadence has no field on that endpoint, so the wizard shell folds it into the
 * initial-conversation notes. The "Assigned CMHW" dropdown is not drawn on Desktop81 but is
 * a real AllocateGuestRequest field (and the Desktop87 review card shows "Assigned CMHW"),
 * so it is added here in the same field styling, fed by GET /guests/cmhws.
 */
@Component({
  selector: 'app-pathway-step',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './pathway-step.component.html',
  styleUrls: ['./pathway-step.component.scss', './_form-shared.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PathwayStepComponent {
  @Input({ required: true }) form!: FormGroup;
  @Input({ required: true }) cmhwOptions: CmhwOptionDto[] = [];

  protected readonly pathways = PATHWAY_OPTIONS;
  protected readonly cadenceOptions = [
    'Weekly - 7 days',
    'Fortnightly - 14 days',
    'Monthly - 28 days',
    'No follow-up needed',
  ];

  protected selectedPathway(): GuestPathway | null {
    return this.form.get('pathway')?.value ?? null;
  }

  protected selectPathway(value: GuestPathway): void {
    const control = this.form.get('pathway');
    control?.setValue(value);
    control?.markAsTouched();
  }

  protected pathwayMissing(): boolean {
    const control = this.form.get('pathway');
    return !!control && control.invalid && control.touched;
  }
}

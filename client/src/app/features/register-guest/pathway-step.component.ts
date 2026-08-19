import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { GuestPathway } from '../../core/api-models';
import { StaffPickerComponent } from '../../shared/staff-picker.component';

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

/** The two one-to-one pathways: the server rejects them without a CMHW and a next contact date. */
export const ONE_TO_ONE_PATHWAYS: GuestPathway[] = ['MentalWellbeing', 'ClinicalSupport'];

/**
 * Step 4 of the Register Guest wizard — "Pathway & allocation", ported from the Desktop81
 * screen (project/screens/Components.bundle.js lines 42794-44679): the "MDT pathway
 * recommendation" card with three selectable pathway tiles, the "Practical support / Advice
 * First Aid also needed?" checkbox band and the "Follow-up contact date" field.
 *
 * All four values are submitted as part of the initial-conversation call (spec §4.1-4.2),
 * which performs the allocation, raises the urgent flag and schedules the follow-up in one
 * request — see RegisterGuestComponent.buildConversationRequest.
 *
 * Mandatory rules mirrored from the server: pathway is always required, and Mental Wellbeing
 * and Clinical Support additionally require an assigned CMHW and a next contact date (the
 * wizard shell toggles those validators as the pathway changes). The "Assigned CMHW" picker
 * is not drawn on Desktop81 but the Desktop87 review card shows "Assigned CMHW", so it is
 * added here as the shared searchable staff picker, which sources the hub's staff list from
 * the cached StaffDirectoryService (GET /guests/cmhws).
 */
@Component({
  selector: 'app-pathway-step',
  standalone: true,
  imports: [ReactiveFormsModule, StaffPickerComponent],
  templateUrl: './pathway-step.component.html',
  styleUrls: ['./pathway-step.component.scss', './_form-shared.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PathwayStepComponent {
  @Input({ required: true }) form!: FormGroup;

  protected readonly pathways = PATHWAY_OPTIONS;

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

  /** True for Mental Wellbeing / Clinical Support — CMHW and next contact date become required. */
  protected get oneToOnePathway(): boolean {
    const selected = this.selectedPathway();
    return !!selected && ONE_TO_ONE_PATHWAYS.includes(selected);
  }

  protected pathwayLabel(): string {
    const selected = this.selectedPathway();
    return PATHWAY_OPTIONS.find((p) => p.value === selected)?.title ?? 'This pathway';
  }

  protected invalid(path: string): boolean {
    const control = this.form.get(path);
    return !!control && control.invalid && control.touched;
  }
}

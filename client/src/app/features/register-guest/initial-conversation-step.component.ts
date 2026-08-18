import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

/**
 * The seven "Flag anything that came up in the conversation" checkboxes (Desktop79, risk
 * screening card), in the design's vertical order. Exported so the wizard shell can fold the
 * ticked flags into the initial-conversation notes and the risk-assessment request.
 */
export const MDT_FLAGS = [
  { key: 'selfHarm', label: 'Self-harm or suicide mentioned or hinted at' },
  { key: 'trauma', label: 'Significant trauma disclosed (abuse, violence, loss, forced migration)' },
  { key: 'domesticAbuse', label: 'Domestic abuse or unsafe home situation' },
  { key: 'psychosis', label: 'Possible psychosis or very unusual thinking (e.g. hearing voices, paranoid beliefs)' },
  { key: 'substanceUse', label: 'Significant substance use affecting daily life' },
  { key: 'childSafeguarding', label: 'Child safeguarding concern' },
  { key: 'practicalSupport', label: 'Need for practical support (housing, benefits, immigration, money)' },
] as const;

/**
 * Step 2 of the Register Guest wizard — "Initial conversation", ported from the Desktop79
 * screen (project/screens/Components.bundle.js lines 33912-37844): locked-record info banner,
 * then the "Session details", "Presenting problem" (guided conversation, 4 prompts),
 * "Mental health & psychiatric history" (ending with the MDT Summary), "Physical health" and
 * "Risk screening" cards.
 *
 * Honest-data notes: the backing endpoint (RecordInitialConversationRequest) only stores
 * presentingIssues / notes / consentConfirmed. Prompt 1 maps to presentingIssues; every other
 * answer here is concatenated into `notes` as labelled sections by the wizard shell, and the
 * risk-screening answers additionally feed the existing risk-assessment endpoint when
 * anything is flagged (see RegisterGuestComponent). "Hub worker" / "Job title" render
 * read-only from the login session exactly as the mock's "pre filled from your login". The
 * consent checkbox is not drawn in the mock but consentConfirmed is required by the API.
 * "Diagnosis group(s) — select all that apply" is rendered as a single-choice dropdown;
 * multiple groups can be spelled out in the guest's-own-words box.
 */
@Component({
  selector: 'app-initial-conversation-step',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './initial-conversation-step.component.html',
  styleUrls: ['./initial-conversation-step.component.scss', './_form-shared.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InitialConversationStepComponent {
  @Input({ required: true }) form!: FormGroup;
  /** "Hub worker *" — pre filled from your login. */
  @Input({ required: true }) hubWorkerName = '';
  /** "Job title" — pre filled from your login. */
  @Input() jobTitle = '';

  protected readonly mdtFlags = MDT_FLAGS;

  protected readonly contactTypeOptions = ['Phone call', 'In person', 'Video call', 'Text message', 'Email'];
  protected readonly previousDiagnosisOptions = ['No', 'Yes', 'Unsure'];
  protected readonly diagnosisGroupOptions = [
    'Depression',
    'Anxiety disorder',
    'Bipolar disorder',
    'Schizophrenia / psychosis',
    'PTSD / trauma-related',
    'Personality disorder',
    'Eating disorder',
    'Other',
  ];
  protected readonly inpatientOptions = ['No', 'Yes - NHS', 'Yes - Private', 'Unsure'];
  protected readonly specifyOptions = ['No', 'Yes - Specify', 'Unknown'];
  protected readonly riskAnswerOptions = ['No', 'Yes', 'Unsure'];
  protected readonly escalationOptions = ['No', 'Yes - Awaiting response', 'Yes - Escalated & responded'];

  /** The guided conversation's four prompts, verbatim from Desktop79. */
  protected readonly prompts = [
    {
      control: 'mainConcern',
      tag: 'Prompt 1',
      quote: '"Tell me a bit about yourself and what brings you here today. What’s been going on for you?"',
      label: 'Main concern and reason for coming *',
      hint: "Record in the guest's own words where possible",
      required: true,
      requiredError: 'The main concern is required.',
    },
    {
      control: 'durationImpact',
      tag: 'Prompt 2',
      quote: null,
      label: 'Duration, daily impact, and any recent trigger or stressor *',
      hint: "Record in the guest's own words where possible",
      required: true,
      requiredError: 'Duration and daily impact are required.',
    },
    {
      control: 'background',
      tag: 'Prompt 3',
      quote:
        '"Can you tell me a little about your background and growing up — your family, where you grew up? Were there any difficult times that you feel are connected to how you’re feeling now?"',
      label: 'Brief background — family, upbringing, any early adversity the guest mentions',
      hint: "Record in the guest's own words where possible",
      required: false,
      requiredError: '',
    },
    {
      control: 'ownUnderstanding',
      tag: 'Prompt 4',
      quote:
        '"How do you make sense of what’s been happening to you? And what kind of support are you hoping for from us?"',
      label: "Guest's own understanding of their distress, and what they want from the service",
      hint: 'the guest may frame their distress spiritually, physically, or through family — record their own words and framing.',
      required: false,
      requiredError: '',
    },
  ];

  /** True when "Immediate escalation required?" has a Yes answer — crisis notes become mandatory. */
  protected get escalationNoted(): boolean {
    return String(this.form.get('risk.escalationRequired')?.value ?? '').startsWith('Yes');
  }
}

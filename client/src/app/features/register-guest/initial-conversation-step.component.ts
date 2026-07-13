import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

/**
 * Step 2 of the Register Guest wizard — ported from the `InitialConversationTab` function
 * (project/screens/Components.bundle.js lines 20343-25835, the "Register New Guest" panel's
 * second tab). Reflowed from the source's absolute positioning into normal flex/grid layout.
 *
 * Field mapping to RecordInitialConversationRequest (core/api-models.ts):
 *  - "Description of problem *" -> presentingIssues (required).
 *  - "Hub worker *" is read-only/pre-filled from the signed-in user (as the source's own
 *    "pre filled from your login" caption says) — it isn't part of the request payload, the
 *    API attributes the conversation to the authenticated staff member server-side.
 *  - "Place of interview *", "Past mental health difficulties & treatment", "Family mental
 *    health history" and "Long-term health condition?" have no dedicated request fields, so
 *    their values are folded into the free-text `notes` field on submit (see
 *    RegisterGuestComponent.submit()) rather than being dropped.
 *  - "Immediate Risk Identified? *" drives the risk-flag checklist below it. Per the design
 *    handoff README ("Risk flags ... escalate a guest onto the Urgent Cases queue"), selecting
 *    "Yes, High risk" additionally posts a RecordRiskAssessmentRequest via
 *    GuestsApiService.recordRiskAssessment after the conversation is recorded.
 *  - Consent checkbox: not present in this source screen either (same reasoning as step 1) but
 *    required by RecordInitialConversationRequest.consentConfirmed.
 */
@Component({
  selector: 'app-initial-conversation-step',
  standalone: true,
  imports: [ReactiveFormsModule, NgTemplateOutlet],
  templateUrl: './initial-conversation-step.component.html',
  styleUrls: ['./initial-conversation-step.component.scss', './_form-shared.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InitialConversationStepComponent {
  @Input({ required: true }) form!: FormGroup;
  @Input() hubWorkerName = '';
}

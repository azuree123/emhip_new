import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FormArray, FormGroup } from '@angular/forms';
import { CmhwOptionDto, GuestStatus } from '../../core/api-models';
import { DIALOG_DOMAINS } from './dialog-step.component';
import { PATHWAY_OPTIONS } from './pathway-step.component';

/** One backend call of the final submission sequence, tracked for per-call error surfacing. */
export interface SubmissionCall {
  key: 'register' | 'customFields' | 'conversation' | 'dialog' | 'demographics' | 'risk';
  label: string;
  status: 'pending' | 'running' | 'done' | 'failed';
}

/**
 * Step 5 of the Register Guest wizard — "REVIEW", ported from the Desktop87 screen
 * (project/screens/Components.bundle.js lines 47045-48590): the "Registration summary" card
 * (Guest type / Status after registration / Pathway / Assigned CMHW, with "Not yet selected"
 * / "Not yet assigned" fallbacks verbatim). Extended below the mock's four cells with the
 * values entered on the previous steps, plus a per-call submission checklist so a failed
 * call is visible (and retried) individually.
 *
 * "Status after registration" uses the spec §4.7 vocabulary ('New' | 'Active' | 'OnHold'):
 * registering creates the guest as New, and submitting the initial conversation moves them to
 * Active in the same sequence.
 */
@Component({
  selector: 'app-review-step',
  standalone: true,
  imports: [],
  templateUrl: './review-step.component.html',
  styleUrls: ['./review-step.component.scss', './_form-shared.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewStepComponent {
  @Input({ required: true }) demographicsForm!: FormGroup;
  @Input({ required: true }) conversationForm!: FormGroup;
  @Input({ required: true }) dialogForm!: FormGroup;
  @Input({ required: true }) pathwayForm!: FormGroup;
  @Input({ required: true }) cmhwOptions: CmhwOptionDto[] = [];
  @Input({ required: true }) submissionCalls: SubmissionCall[] = [];
  @Input({ required: true }) showCallStatuses = false;

  private value(form: FormGroup, path: string): string {
    const raw = form.get(path)?.value;
    return raw === null || raw === undefined ? '' : String(raw);
  }

  protected guestName(): string {
    const first = this.value(this.demographicsForm, 'personal.firstName');
    const last = this.value(this.demographicsForm, 'personal.lastName');
    return `${first} ${last}`.trim() || '—';
  }

  protected dateOfBirth(): string {
    const raw = this.value(this.demographicsForm, 'personal.dateOfBirth');
    if (!raw) return '—';
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? raw : date.toLocaleDateString('en-GB');
  }

  protected phone(): string {
    return this.value(this.demographicsForm, 'personal.phoneNumber') || '—';
  }

  protected email(): string {
    return this.value(this.demographicsForm, 'contact.contactEmail') || '—';
  }

  protected ethnicity(): string {
    return this.value(this.demographicsForm, 'personal.ethnicity') || '—';
  }

  /** Spec §4.7 statuses: the guest is created as New and the initial conversation makes them Active. */
  protected readonly statusOnRegistration: GuestStatus = 'New';
  protected readonly statusAfterConversation: GuestStatus = 'Active';

  protected referralSource(): string {
    return this.value(this.demographicsForm, 'referral.referralSource') || '—';
  }

  /** "Primary" / "Secondary — <subcategory>" (spec §6.2). */
  protected referralClassification(): string {
    const type = this.value(this.demographicsForm, 'referral.referralType');
    if (!type) return '—';
    const subcategory = this.value(this.demographicsForm, 'referral.referralSubcategory');
    return subcategory ? `${type} — ${subcategory}` : type;
  }

  protected maritalStatus(): string {
    return this.value(this.demographicsForm, 'personal.maritalStatus') || '—';
  }

  protected livingGroup(): string {
    return this.value(this.demographicsForm, 'contact.livingGroup') || '—';
  }

  protected immediateRisk(): string {
    return this.value(this.conversationForm, 'risk.immediateRisk') || '—';
  }

  protected actionCount(): string {
    const actions = this.conversationForm.get('actions') as FormArray | null;
    const count = actions?.length ?? 0;
    return count === 0 ? 'None recorded' : `${count} action${count === 1 ? '' : 's'}`;
  }

  protected sessionDate(): string {
    const raw = this.value(this.conversationForm, 'session.sessionDate');
    if (!raw) return '—';
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? raw : date.toLocaleDateString('en-GB');
  }

  protected contactType(): string {
    return this.value(this.conversationForm, 'session.contactType') || '—';
  }

  protected escalation(): string {
    return this.value(this.conversationForm, 'risk.escalationRequired') || '—';
  }

  protected dialogTotal(): string {
    let total = 0;
    let answered = 0;
    for (const domain of DIALOG_DOMAINS) {
      const score = this.dialogForm.get(['scores', domain.key])?.value;
      if (typeof score === 'number') {
        total += score;
        answered++;
      }
    }
    return answered === 0 ? '—' : `${total} / 77 (${answered} of 11 areas scored)`;
  }

  protected pathwayLabel(): string {
    const selected = this.pathwayForm.get('pathway')?.value;
    return PATHWAY_OPTIONS.find((p) => p.value === selected)?.title ?? 'Not yet selected';
  }

  protected afaLabel(): string {
    return this.pathwayForm.get('afaSupportNeeded')?.value ? 'Yes' : 'No';
  }

  protected nextContactDate(): string {
    const raw = this.value(this.pathwayForm, 'nextContactDate');
    if (!raw) return 'Not scheduled';
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? raw : date.toLocaleDateString('en-GB');
  }

  protected cmhwName(): string {
    const id = this.pathwayForm.get('assignedCmhwId')?.value;
    if (!id) return 'Not yet assigned';
    return this.cmhwOptions.find((option) => option.id === id)?.displayName ?? 'Not yet assigned';
  }
}

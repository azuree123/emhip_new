import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, map, of, switchMap } from 'rxjs';
import {
  RecordInitialConversationRequest,
  RecordRiskAssessmentRequest,
  RegisterGuestRequest,
  UpdateDemographicsRequest,
} from '../../core/api-models';
import { AuthService } from '../../core/auth.service';
import { GuestsApiService } from '../../core/guests-api.service';
import { DemographicsStepComponent } from './demographics-step.component';
import { InitialConversationStepComponent } from './initial-conversation-step.component';

/** FluentValidation-equivalent rule: date of birth must be in the past. */
function pastDateValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;
    const value = new Date(control.value);
    if (Number.isNaN(value.getTime())) return null;
    return value.getTime() < Date.now() ? null : { futureDate: true };
  };
}

/**
 * Register Guest — a 2-step wizard at route `/guests/new`:
 *   1. Demographics (DemographicsStepComponent) — core registration fields + extended
 *      demographics.
 *   2. Initial Conversation (InitialConversationStepComponent) — first contact record.
 *
 * On final submit this chains three real API calls (see core/guests-api.service.ts):
 *   POST /guests                          -> GuestsApiService.register()
 *   PUT  /guests/{id}/demographics         -> GuestsApiService.updateDemographics()
 *   POST /guests/{id}/initial-conversation -> GuestsApiService.recordInitialConversation()
 * and, only if "Immediate Risk Identified? Yes" was selected on step 2, an additional
 *   POST /guests/{id}/risk-assessments     -> GuestsApiService.recordRiskAssessment()
 * per the design handoff README ("Risk flags ... escalate a guest onto the Urgent Cases
 * queue"). On success it navigates to /guests/:id (Guest Workspace).
 *
 * Sidebar/header are rendered by the shared shell; this component is the content area only —
 * ported from the "Register New Guest" panel inside DmegographicsTab /
 * InitialConversationTab (project/screens/Components.bundle.js), reflowed from the source's
 * absolute-positioned 1440px canvas into a normal centered card layout.
 */
@Component({
  selector: 'app-register-guest',
  standalone: true,
  imports: [ReactiveFormsModule, DemographicsStepComponent, InitialConversationStepComponent],
  templateUrl: './register-guest.component.html',
  styleUrl: './register-guest.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterGuestComponent {
  private readonly fb = inject(FormBuilder);
  private readonly guestsApi = inject(GuestsApiService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly currentUser = this.auth.current;

  protected readonly step = signal<1 | 2>(1);
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly draftSavedAt = signal<Date | null>(null);

  /**
   * The source stepper card shows five steps (Demographics / Initial conversation / DIALOG /
   * Pathway & allocation / REVIEW — casing verbatim, see Components.bundle.js lines
   * 19364-19539). Only the first two are implemented as wizard steps here; 3-5 render
   * permanently "upcoming" for visual parity (those flows live elsewhere in the app / are out
   * of scope for registration).
   */
  protected readonly steps = [
    { index: 1, label: 'Demographics' },
    { index: 2, label: 'Initial conversation' },
    { index: 3, label: 'DIALOG' },
    { index: 4, label: 'Pathway & allocation' },
    { index: 5, label: 'REVIEW' },
  ];

  protected readonly draftSavedLabel = computed(() => {
    const at = this.draftSavedAt();
    return at ? `Last updated at ${at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '';
  });

  protected readonly demographicsForm = this.fb.group({
    personal: this.fb.nonNullable.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      dateOfBirth: ['', [Validators.required, pastDateValidator()]],
      phoneNumber: ['', Validators.required],
      ethnicity: ['', Validators.required],
      gender: [''],
    }),
    contact: this.fb.nonNullable.group({
      address: [''],
      postCode: [''],
      contactEmail: ['', Validators.email],
      housingStatus: [''],
      nationality: [''],
      employmentStatus: [''],
    }),
    additional: this.fb.nonNullable.group({
      preferredLanguage: [''],
      interpreterNeeded: [false],
      emergencyContactName: [''],
      emergencyContactPhone: [''],
      emergencyContactRelationship: [''],
      gpName: [''],
      gpPractice: [''],
      nhsNumber: [''],
    }),
    referral: this.fb.nonNullable.group({
      referralType: ['Open access / self referred'],
    }),
    consent: this.fb.nonNullable.group({
      consentGiven: [false, Validators.requiredTrue],
    }),
  });

  protected readonly conversationForm = this.fb.nonNullable.group({
    placeOfInterview: ['', Validators.required],
    presentingIssues: ['', Validators.required],
    pastMentalHealth: [''],
    familyMentalHealth: [''],
    longTermHealthCondition: [false],
    immediateRisk: [null as boolean | null, Validators.required],
    riskFlags: this.fb.nonNullable.group({
      suicidalIdeation: [false],
      selfHarm: [false],
      riskToOthers: [false],
      severeDeterioration: [false],
      safeguardingConcern: [false],
    }),
    consentConfirmed: [false, Validators.requiredTrue],
  });

  protected goToStep2(): void {
    this.demographicsForm.markAllAsTouched();
    if (this.demographicsForm.invalid) {
      return;
    }
    this.step.set(2);
    window.scrollTo({ top: 0 });
  }

  protected goBack(): void {
    this.step.set(1);
    window.scrollTo({ top: 0 });
  }

  protected saveDraft(): void {
    // No dedicated "save draft" endpoint exists on GuestsApiService — this simply records a
    // local timestamp so the "DRAFT SAVED" indicator (matching the source) reflects reality
    // instead of pretending a server round-trip happened.
    this.draftSavedAt.set(new Date());
  }

  protected cancel(): void {
    this.router.navigate(['/guests']);
  }

  protected submit(): void {
    this.conversationForm.markAllAsTouched();
    if (this.conversationForm.invalid || this.demographicsForm.invalid) {
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    const personal = this.demographicsForm.getRawValue().personal;
    const contact = this.demographicsForm.getRawValue().contact;
    const additional = this.demographicsForm.getRawValue().additional;
    const consent = this.demographicsForm.getRawValue().consent;
    const conversation = this.conversationForm.getRawValue();

    const registerRequest: RegisterGuestRequest = {
      firstName: personal.firstName,
      lastName: personal.lastName,
      dateOfBirth: personal.dateOfBirth,
      consentGiven: consent.consentGiven,
      gender: personal.gender || null,
      contactPhone: personal.phoneNumber || null,
      contactEmail: contact.contactEmail || null,
      addressLine1: contact.address || null,
      postCode: contact.postCode || null,
    };

    this.guestsApi
      .register(registerRequest)
      .pipe(
        switchMap(({ id }) => {
          const demographicsRequest: UpdateDemographicsRequest = {
            ethnicity: personal.ethnicity || null,
            nationality: contact.nationality || null,
            preferredLanguage: additional.preferredLanguage || null,
            interpreterNeeded: additional.interpreterNeeded,
            housingStatus: contact.housingStatus || null,
            employmentStatus: contact.employmentStatus || null,
            emergencyContactName: additional.emergencyContactName || null,
            emergencyContactPhone: additional.emergencyContactPhone || null,
            emergencyContactRelationship: additional.emergencyContactRelationship || null,
            gpName: additional.gpName || null,
            gpPractice: additional.gpPractice || null,
            nhsNumber: additional.nhsNumber || null,
          };
          return this.guestsApi.updateDemographics(id, demographicsRequest).pipe(map(() => id));
        }),
        switchMap((id) => {
          const notes = [
            `Place of interview: ${conversation.placeOfInterview}`,
            conversation.pastMentalHealth && `Past mental health difficulties & treatment: ${conversation.pastMentalHealth}`,
            conversation.familyMentalHealth && `Family mental health history: ${conversation.familyMentalHealth}`,
            `Long-term health condition: ${conversation.longTermHealthCondition ? 'Yes' : 'No'}`,
            `Immediate risk identified: ${conversation.immediateRisk ? 'Yes' : 'No'}`,
          ]
            .filter(Boolean)
            .join('\n');

          const conversationRequest: RecordInitialConversationRequest = {
            presentingIssues: conversation.presentingIssues,
            notes,
            consentConfirmed: conversation.consentConfirmed,
          };

          return this.guestsApi.recordInitialConversation(id, conversationRequest).pipe(
            switchMap(() => {
              if (!conversation.immediateRisk) {
                return of(id);
              }
              const riskRequest: RecordRiskAssessmentRequest = {
                ...conversation.riskFlags,
                notes: 'Immediate risk flagged during the initial conversation.',
              };
              return this.guestsApi.recordRiskAssessment(id, riskRequest).pipe(map(() => id));
            }),
          );
        }),
        catchError(() => {
          this.errorMessage.set('Something went wrong while registering this guest. Please check your connection and try again.');
          this.submitting.set(false);
          return of(null);
        }),
      )
      .subscribe((id) => {
        if (id) {
          this.router.navigate(['/guests', id]);
        }
      });
  }
}

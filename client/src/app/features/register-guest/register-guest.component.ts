import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  DOCUMENT,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, concatMap, defer, from, last, map, Observable, of, switchMap, tap, throwError } from 'rxjs';
import {
  CmhwOptionDto,
  DialogScores,
  GuestPathway,
  InitialConversationActionInput,
  RecordInitialConversationRequest,
  RecordRiskAssessmentRequest,
  ReferralType,
  RegisterGuestRequest,
  UpdateDemographicsRequest,
} from '../../core/api-models';
import { AuthService } from '../../core/auth.service';
import { GuestsApiService } from '../../core/guests-api.service';
import { CustomFieldsComponent } from '../../shared/custom-fields.component';
import { DemographicsStepComponent } from './demographics-step.component';
import { DIALOG_DOMAINS, DialogStepComponent } from './dialog-step.component';
import { InitialConversationStepComponent, MDT_FLAGS } from './initial-conversation-step.component';
import { ONE_TO_ONE_PATHWAYS, PathwayStepComponent } from './pathway-step.component';
import { ReviewStepComponent, SubmissionCall } from './review-step.component';

/** One row of the spec §4.2 actions tracker on the Initial conversation step. */
type ActionRowGroup = FormGroup<{
  description: FormControl<string>;
  dueDate: FormControl<string>;
  assignedToStaffId: FormControl<string>;
}>;

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
 * Register Guest — the 5-step wizard at route `/guests/new`, redesigned per the
 * Desktop79/80/81/83/87/88 screens in project/screens/Components.bundle.js:
 *   1. Demographics            (Desktop83 — "Register & Continue")
 *   2. Initial conversation    (Desktop79 — session, guided prompts, MH history, risk screening)
 *   3. DIALOG                  (Desktop80 — 11 life areas scored 1-7)
 *   4. Pathway & allocation    (Desktop81 — pathway cards, AFA support, CMHW)
 *   5. REVIEW                  (Desktop87 — registration summary, Submit)
 * followed by the Desktop88 "Success!" overlay.
 *
 * Nothing is persisted until Submit on the REVIEW step; the sequence then runs
 *   POST /guests                            -> register()            (returns the guest id)
 *   PUT  /custom-fields/values/Guest/{id}   -> customFields.saveFor() (only when the admin has
 *                                              configured extra Guest fields — the answers are
 *                                              typed on step 1 but have nothing to hang off
 *                                              until the guest exists)
 *   POST /guests/{id}/initial-conversation  -> recordInitialConversation()
 *   POST /guests/{id}/dialog-assessments    -> recordDialogAssessment()
 *   PUT  /guests/{id}/demographics          -> updateDemographics()
 * plus, only when the risk screening flagged anything,
 *   POST /guests/{id}/risk-assessments      -> recordRiskAssessment()  (Urgent Cases escalation)
 *
 * The initial-conversation call is the gate to Active (spec §4.1-4.2): it carries the pathway,
 * the assigned CMHW, the AFA flag, the mandatory immediate-risk answer, the next contact date
 * and the actions tracker, so the server performs the allocation, raises the urgent flag,
 * schedules the follow-up and creates the actions in that one request. The separate
 * allocate() and scheduleFollowUp() calls the wizard used to make afterwards are therefore
 * gone — repeating them would only duplicate what the server has already done.
 *
 * Step 1's referral card maps straight onto RegisterGuestRequest — referralSource plus the
 * spec §6.2 referralType and (for Secondary referrals) referralSubcategory. After completion
 * getOverview() supplies the "G-{guestNumber}" reference for the overlay.
 * Each call is tracked individually: on failure the wizard reports which call failed and
 * "Retry" resumes from that call without repeating the ones that already succeeded.
 *
 * Presentation: unchanged from before the redesign — an 858px right-anchored drawer overlay
 * on top of the Guest Data Sheet (child route rendering into the guest list's router-outlet).
 * The redesigned screens are full-page (1170px content lane on a rgb(237,237,237) canvas);
 * their cards are reflowed into the drawer body, which now uses the same gray canvas.
 */
@Component({
  selector: 'app-register-guest',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CustomFieldsComponent,
    DemographicsStepComponent,
    InitialConversationStepComponent,
    DialogStepComponent,
    PathwayStepComponent,
    ReviewStepComponent,
  ],
  templateUrl: './register-guest.component.html',
  styleUrl: './register-guest.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'onEscape()',
  },
})
export class RegisterGuestComponent {
  private readonly fb = inject(FormBuilder);
  private readonly guestsApi = inject(GuestsApiService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  /** Scrollable drawer body — step changes reset its scroll position (not the window's). */
  private readonly panelBody = viewChild<ElementRef<HTMLElement>>('panelBody');

  /**
   * Admin-defined extra Guest fields. They belong to the Demographics step visually, but the
   * panel is rendered by this component (outside the step @switch) so the answers typed on
   * step 1 survive stepping back and forth and are still there when Submit runs saveFor().
   */
  private readonly customFields = viewChild(CustomFieldsComponent);
  /** False when nothing is configured — the whole card and its submission step are skipped. */
  protected readonly hasCustomFields = computed(() => this.customFields()?.hasFields() ?? false);

  protected readonly currentUser = this.auth.current;

  protected readonly step = signal<1 | 2 | 3 | 4 | 5>(1);
  protected readonly submitting = signal(false);
  protected readonly submitted = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly draftSavedAt = signal<Date | null>(null);

  /** Set after POST /guests succeeds so a retry never registers the guest twice. */
  private readonly guestId = signal<string | null>(null);

  /** "G-{guestNumber}" reference for the Success overlay, fetched via getOverview() on completion. */
  protected readonly guestReference = signal<string | null>(null);

  private readonly callStates = signal<Record<SubmissionCall['key'], SubmissionCall['status']>>({
    register: 'pending',
    customFields: 'pending',
    conversation: 'pending',
    dialog: 'pending',
    demographics: 'pending',
    risk: 'pending',
  });

  private static readonly CALL_LABELS: Record<SubmissionCall['key'], string> = {
    register: 'Register guest',
    customFields: 'Additional information',
    // One call, four effects: allocation, urgent flag, next-contact follow-up and actions.
    conversation: 'Initial conversation (allocation, follow-up & actions)',
    dialog: 'DIALOG assessment',
    demographics: 'Demographics',
    risk: 'Risk assessment (Urgent Cases escalation)',
  };

  /** CMHW names for the Review step's "Assigned CMHW" summary line. */
  protected readonly cmhwOptions = toSignal(
    this.guestsApi.getCmhwOptions().pipe(catchError(() => of([] as CmhwOptionDto[]))),
    { initialValue: [] as CmhwOptionDto[] },
  );

  /**
   * Stepper order and labels exactly as in the Desktop79-88 screens (labels render uppercase
   * there — done via CSS): Demographics, Initial conversation, DIALOG, Pathway & allocation,
   * REVIEW.
   */
  protected readonly steps = [
    { index: 1, label: 'Demographics' },
    { index: 2, label: 'Initial conversation' },
    { index: 3, label: 'DIALOG' },
    { index: 4, label: 'Pathway & allocation' },
    { index: 5, label: 'Review' },
  ];

  protected readonly draftSavedLabel = computed(() => {
    const at = this.draftSavedAt();
    return at ? `Last updated at ${at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '';
  });

  /** Today, for the read-only "Date *" of the pre-registration form (dd/mm/yyyy). */
  protected readonly todayLabel = new Date().toLocaleDateString('en-GB');

  /** "Job title" of the session-details card — pre filled from the login session's roles. */
  protected readonly jobTitle = computed(() => {
    const roles = this.currentUser().roles;
    return roles.length > 0 ? roles.join(', ') : 'Hub worker';
  });

  private static todayIso(): string {
    return new Date().toISOString().slice(0, 10);
  }

  // ---- Step 1 · Demographics (Desktop83) ----
  protected readonly demographicsForm = this.fb.group({
    personal: this.fb.nonNullable.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      dateOfBirth: ['', [Validators.required, pastDateValidator()]],
      phoneNumber: ['', Validators.required],
      ethnicity: ['', Validators.required],
      gender: [''],
      // Spec §6.1 — real UpdateDemographicsRequest fields, filled from the MaritalStatus /
      // LivingGroup lookups by the step component.
      maritalStatus: [''],
    }),
    contact: this.fb.nonNullable.group({
      address: [''],
      postCode: [''],
      contactEmail: ['', Validators.email],
      housingStatus: [''],
      nationality: [''],
      livingGroup: [''],
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
      /** RegisterGuestRequest.referralSource. */
      referralSource: ['Self-referral'],
      /** Spec §6.2 classification — RegisterGuestRequest.referralType. */
      referralType: this.fb.nonNullable.control<ReferralType>('Primary', Validators.required),
      /**
       * RegisterGuestRequest.referralSubcategory. The server rejects a Secondary referral
       * without one, so the constructor mirrors that rule as a client-side validator.
       */
      referralSubcategory: [''],
    }),
    consent: this.fb.nonNullable.group({
      consentGiven: [false, Validators.requiredTrue],
    }),
  });

  // ---- Step 2 · Initial conversation (Desktop79) ----
  protected readonly conversationForm = this.fb.group({
    session: this.fb.nonNullable.group({
      sessionDate: [RegisterGuestComponent.todayIso(), Validators.required],
      contactType: ['Phone call', Validators.required],
    }),
    prompts: this.fb.nonNullable.group({
      mainConcern: ['', Validators.required],
      durationImpact: ['', Validators.required],
      background: [''],
      ownUnderstanding: [''],
    }),
    history: this.fb.nonNullable.group({
      previousDiagnosis: ['No'],
      diagnosisGroups: [''],
      reportedDiagnosis: [''],
      inpatientAdmission: ['No'],
      inpatientDetails: [''],
      familyHistory: ['No'],
      familyHistoryDetails: [''],
    }),
    summary: this.fb.nonNullable.control('', Validators.required),
    physical: this.fb.nonNullable.group({
      conditions: [''],
      allergies: ['No'],
      allergyDetails: [''],
      medication: [''],
    }),
    risk: this.fb.nonNullable.group({
      selfHarmHistory: ['', Validators.required],
      selfHarmComment: [''],
      riskToOthersHistory: ['', Validators.required],
      riskToOthersComment: [''],
      safeguardingHistory: ['', Validators.required],
      safeguardingComment: [''],
      escalationRequired: ['', Validators.required],
      /** Spec §4.2 mandatory Yes/No — 'Yes' raises the urgent flag server-side. */
      immediateRisk: ['', Validators.required],
      crisisNotes: [''],
      flags: this.fb.nonNullable.group({
        selfHarm: [false],
        trauma: [false],
        domesticAbuse: [false],
        psychosis: [false],
        substanceUse: [false],
        childSafeguarding: [false],
        practicalSupport: [false],
      }),
      riskNotes: [''],
    }),
    /** Spec §4.2 actions tracker — submitted as RecordInitialConversationRequest.actions[]. */
    actions: this.fb.array<ActionRowGroup>([]),
    consentConfirmed: this.fb.nonNullable.control(false, Validators.requiredTrue),
  });

  /** Typed view of the actions tracker for the template/add/remove handlers. */
  protected get actionRows(): FormArray<ActionRowGroup> {
    return this.conversationForm.controls.actions;
  }

  private newActionRow(): ActionRowGroup {
    return this.fb.nonNullable.group({
      description: ['', Validators.required],
      dueDate: ['', Validators.required],
      assignedToStaffId: [''],
    });
  }

  protected addActionRow(): void {
    this.actionRows.push(this.newActionRow());
  }

  protected removeActionRow(index: number): void {
    this.actionRows.removeAt(index);
  }

  // ---- Step 3 · DIALOG (Desktop80) ----
  protected readonly dialogForm = this.fb.group({
    scores: this.fb.group(
      Object.fromEntries(
        DIALOG_DOMAINS.map((d): [string, FormControl<number | null>] => [
          d.key,
          this.fb.control<number | null>(null, [Validators.required, Validators.min(1), Validators.max(7)]),
        ]),
      ),
    ),
    needHelp: this.fb.group(
      Object.fromEntries(
        DIALOG_DOMAINS.map((d): [string, FormControl<boolean | null>] => [d.key, this.fb.control<boolean | null>(null)]),
      ),
    ),
    additionalNotes: this.fb.nonNullable.control(''),
  });

  // ---- Step 4 · Pathway & allocation (Desktop81) ----
  // pathway is always required; assignedCmhwId and nextContactDate become required for the two
  // one-to-one pathways (the server rejects those without them) — see the constructor.
  protected readonly pathwayForm = this.fb.group({
    pathway: this.fb.control<GuestPathway | null>(null, Validators.required),
    afaSupportNeeded: this.fb.nonNullable.control(false),
    nextContactDate: this.fb.nonNullable.control(''),
    assignedCmhwId: this.fb.nonNullable.control(''),
  });

  constructor() {
    // Lock the page behind the drawer while it is open; restore on close/destroy.
    const body = this.document.body;
    const previousOverflow = body.style.overflow;
    body.style.overflow = 'hidden';
    this.destroyRef.onDestroy(() => {
      body.style.overflow = previousOverflow;
    });

    // "Escalation noted — crisis notes required" (Desktop79): the crisis-notes box becomes
    // mandatory whenever "Immediate escalation required?" is answered with a Yes option.
    const risk = this.conversationForm.controls.risk;
    risk.controls.escalationRequired.valueChanges.pipe(takeUntilDestroyed()).subscribe((value) => {
      const crisisNotes = risk.controls.crisisNotes;
      if (value.startsWith('Yes')) {
        crisisNotes.addValidators(Validators.required);
      } else {
        crisisNotes.removeValidators(Validators.required);
      }
      crisisNotes.updateValueAndValidity({ emitEvent: false });
    });

    // Spec §6.2: a Secondary referral must carry a subcategory.
    const referral = this.demographicsForm.controls.referral;
    referral.controls.referralType.valueChanges.pipe(takeUntilDestroyed()).subscribe((value) => {
      const subcategory = referral.controls.referralSubcategory;
      if (value === 'Secondary') {
        subcategory.addValidators(Validators.required);
      } else {
        subcategory.removeValidators(Validators.required);
        subcategory.setValue('', { emitEvent: false });
      }
      subcategory.updateValueAndValidity({ emitEvent: false });
    });

    // Spec §4.2: Mental Wellbeing and Clinical Support are one-to-one pathways — the
    // initial-conversation endpoint rejects them without an assigned CMHW and a next contact
    // date, so both controls become required as soon as such a pathway is picked.
    const pathway = this.pathwayForm.controls;
    pathway.pathway.valueChanges.pipe(takeUntilDestroyed()).subscribe((value) => {
      const required = !!value && ONE_TO_ONE_PATHWAYS.includes(value);
      for (const control of [pathway.assignedCmhwId, pathway.nextContactDate]) {
        if (required) {
          control.addValidators(Validators.required);
        } else {
          control.removeValidators(Validators.required);
        }
        control.updateValueAndValidity({ emitEvent: false });
      }
    });
  }

  // ---- Wizard navigation (footer: Go Back / Save Draft / primary CTA) ----

  private formForStep(step: number): AbstractControl | null {
    switch (step) {
      case 1:
        return this.demographicsForm;
      case 2:
        return this.conversationForm;
      case 3:
        return this.dialogForm;
      case 4:
        return this.pathwayForm;
      default:
        return null;
    }
  }

  protected continue(): void {
    const current = this.step();
    if (current >= 5) return;
    const form = this.formForStep(current);
    if (form) {
      form.markAllAsTouched();
      if (form.invalid) return;
    }
    // The extra fields live on step 1, so they are checked with the rest of that step.
    if (current === 1 && !this.customFieldsValid()) return;
    this.step.set((current + 1) as 1 | 2 | 3 | 4 | 5);
    this.scrollToTop();
  }

  protected goBack(): void {
    const current = this.step();
    if (current === 1) {
      this.cancel();
      return;
    }
    this.step.set((current - 1) as 1 | 2 | 3 | 4 | 5);
    this.scrollToTop();
  }

  private scrollToTop(): void {
    this.panelBody()?.nativeElement.scrollTo({ top: 0 });
  }

  protected saveDraft(): void {
    // No dedicated "save draft" endpoint exists on GuestsApiService — this simply records a
    // local timestamp so the "DRAFT SAVED" indicator (matching the source) reflects reality
    // instead of pretending a server round-trip happened.
    this.draftSavedAt.set(new Date());
  }

  protected onEscape(): void {
    if (this.submitting()) return;
    this.cancel();
  }

  protected cancel(): void {
    // Close the drawer: back to the guest list underneath, keeping its query params
    // (search/filter/pagination state) intact.
    this.router.navigate(['/guests'], { queryParamsHandling: 'preserve' });
  }

  protected goToWorkspace(): void {
    const id = this.guestId();
    if (id) this.router.navigate(['/guests', id]);
  }

  protected primaryLabel(): string {
    if (this.step() === 1) return 'Register & Continue';
    if (this.step() < 5) return 'Save & Continue';
    if (this.submitting()) return 'Submitting…';
    return this.hasFailedCall() ? 'Retry Submit' : 'Submit';
  }

  protected primaryAction(): void {
    if (this.step() < 5) {
      this.continue();
    } else {
      this.submit();
    }
  }

  // ---- Submission (REVIEW step) ----

  protected readonly submissionCalls = computed<SubmissionCall[]>(() => {
    const states = this.callStates();
    const keys: SubmissionCall['key'][] = ['register'];
    // Straight after the guest exists, before anything else is written against it.
    if (this.hasCustomFields()) keys.push('customFields');
    keys.push('conversation', 'dialog', 'demographics');
    if (this.riskAssessmentNeeded()) keys.push('risk');
    return keys.map((key) => ({ key, label: RegisterGuestComponent.CALL_LABELS[key], status: states[key] }));
  });

  protected readonly showCallStatuses = computed(
    () => this.submitting() || this.hasFailedCall() || this.guestId() !== null,
  );

  protected hasFailedCall(): boolean {
    return Object.values(this.callStates()).includes('failed');
  }

  private setCallState(key: SubmissionCall['key'], status: SubmissionCall['status']): void {
    this.callStates.update((states) => ({ ...states, [key]: status }));
  }

  /**
   * True when the custom-fields panel has no required answer outstanding (always true when the
   * admin has configured no extra fields). Turns the panel's per-field messages on when not.
   */
  private customFieldsValid(): boolean {
    const panel = this.customFields();
    if (!panel?.hasFields() || panel.isValid()) return true;
    panel.showErrors.set(true);
    return false;
  }

  protected submit(): void {
    if (this.submitting() || this.submitted()) return;

    const forms = [this.demographicsForm, this.conversationForm, this.dialogForm, this.pathwayForm];
    forms.forEach((f) => f.markAllAsTouched());
    const firstInvalid = forms.findIndex((f) => f.invalid);
    if (firstInvalid !== -1) {
      this.errorMessage.set('Some required fields are missing — please complete the highlighted step before submitting.');
      this.step.set((firstInvalid + 1) as 1 | 2 | 3 | 4 | 5);
      this.scrollToTop();
      return;
    }

    // A required extra field left empty would only fail once the guest had already been
    // created, so it is caught here alongside the wizard's own required fields.
    if (!this.customFieldsValid()) {
      this.errorMessage.set('Some required fields are missing — please complete the highlighted step before submitting.');
      this.step.set(1);
      this.scrollToTop();
      return;
    }

    this.errorMessage.set(null);
    this.submitting.set(true);

    const register$: Observable<string> = this.guestId()
      ? of(this.guestId()!)
      : defer(() => {
          this.setCallState('register', 'running');
          return this.guestsApi.register(this.buildRegisterRequest()).pipe(
            map((res) => res.id),
            tap((id) => {
              this.guestId.set(id);
              this.setCallState('register', 'done');
            }),
            catchError((err) => {
              this.setCallState('register', 'failed');
              return throwError(() => ({ key: 'register' as const, err }));
            }),
          );
        });

    register$
      .pipe(
        switchMap((id) => {
          const plan = this.buildRemainingPlan(id);
          if (plan.length === 0) return of(id);
          return from(plan).pipe(
            concatMap(({ key, call }) => {
              this.setCallState(key, 'running');
              return call.pipe(
                tap(() => this.setCallState(key, 'done')),
                catchError((err) => {
                  this.setCallState(key, 'failed');
                  return throwError(() => ({ key, err }));
                }),
              );
            }),
            last(),
            map(() => id),
          );
        }),
      )
      .subscribe({
        next: (id) => {
          this.submitting.set(false);
          this.submitted.set(true);
          // Best effort: fetch the sequential guest number for the Success overlay's
          // "G-{guestNumber}" reference; the overlay shows without it if this fails.
          this.guestsApi
            .getOverview(id)
            .pipe(
              catchError(() => of(null)),
              takeUntilDestroyed(this.destroyRef),
            )
            .subscribe((overview) => {
              if (overview) this.guestReference.set(`G-${overview.guestNumber}`);
            });
        },
        error: (failure: { key: SubmissionCall['key'] }) => {
          this.submitting.set(false);
          const label = RegisterGuestComponent.CALL_LABELS[failure?.key] ?? 'A step';
          this.errorMessage.set(
            `"${label}" could not be saved. Nothing after it was attempted — press Retry Submit to resume; steps that already saved will not be repeated.`,
          );
        },
      });
  }

  private buildRemainingPlan(id: string): { key: SubmissionCall['key']; call: Observable<unknown> }[] {
    const states = this.callStates();
    const plan: { key: SubmissionCall['key']; call: Observable<unknown> }[] = [];
    // The step-1 answers only become saveable once the guest id exists, so they are written
    // immediately after register() — and, like every other call, skipped on retry once done.
    if (this.hasCustomFields()) {
      plan.push({
        key: 'customFields',
        call: defer(() => this.customFields()?.saveFor(id) ?? of(void 0)),
      });
    }
    // The initial conversation is the gate to Active: this single call also allocates the
    // pathway/CMHW, raises the urgent flag when immediate risk was recorded, schedules the
    // next-contact follow-up and creates the actions — hence no separate allocate() or
    // scheduleFollowUp() step.
    plan.push(
      { key: 'conversation', call: defer(() => this.guestsApi.recordInitialConversation(id, this.buildConversationRequest())) },
      { key: 'dialog', call: defer(() => this.guestsApi.recordDialogAssessment(id, this.buildDialogScores())) },
      { key: 'demographics', call: defer(() => this.guestsApi.updateDemographics(id, this.buildDemographicsRequest())) },
    );
    if (this.riskAssessmentNeeded()) {
      plan.push({ key: 'risk', call: defer(() => this.guestsApi.recordRiskAssessment(id, this.buildRiskRequest())) });
    }
    return plan.filter(({ key }) => states[key] !== 'done');
  }

  // ---- Request builders (see the honest-data notes in each step component) ----

  private buildRegisterRequest(): RegisterGuestRequest {
    const { personal, contact, consent, referral } = this.demographicsForm.getRawValue();
    const assignedCmhwId = this.pathwayForm.getRawValue().assignedCmhwId;
    return {
      firstName: personal.firstName,
      lastName: personal.lastName,
      dateOfBirth: personal.dateOfBirth,
      consentGiven: consent.consentGiven,
      gender: personal.gender || null,
      contactPhone: personal.phoneNumber || null,
      contactEmail: contact.contactEmail || null,
      addressLine1: contact.address || null,
      postCode: contact.postCode || null,
      assignedCmhwId: assignedCmhwId || null,
      referralSource: referral.referralSource || null,
      // Spec §6.2 — the subcategory only applies to Secondary referrals.
      referralType: referral.referralType,
      referralSubcategory: referral.referralType === 'Secondary' ? referral.referralSubcategory || null : null,
    };
  }

  private buildDemographicsRequest(): UpdateDemographicsRequest {
    const { personal, contact, additional } = this.demographicsForm.getRawValue();
    return {
      ethnicity: personal.ethnicity || null,
      nationality: contact.nationality || null,
      preferredLanguage: additional.preferredLanguage || null,
      interpreterNeeded: additional.interpreterNeeded,
      housingStatus: contact.housingStatus || null,
      employmentStatus: contact.employmentStatus || null,
      maritalStatus: personal.maritalStatus || null,
      livingGroup: contact.livingGroup || null,
      emergencyContactName: additional.emergencyContactName || null,
      emergencyContactPhone: additional.emergencyContactPhone || null,
      emergencyContactRelationship: additional.emergencyContactRelationship || null,
      gpName: additional.gpName || null,
      gpPractice: additional.gpPractice || null,
      nhsNumber: additional.nhsNumber || null,
    };
  }

  /**
   * The gate to Active (spec §4.1-4.2). Alongside presentingIssues / notes / consentConfirmed
   * the request carries the structured fields the server acts on: immediateRisk (Yes raises
   * the urgent flag), pathway + assignedCmhwId + afaSupportNeeded (the allocation),
   * nextContactDate (the follow-up) and actions[] (the actions tracker).
   *
   * presentingIssues carries the guided conversation's "Main concern and reason for coming";
   * every designed field with no request field of its own (session details, history, physical
   * health, risk screening, DIALOG remarks) is concatenated into `notes` as labelled sections
   * rather than invented as new API fields.
   */
  private buildConversationRequest(): RecordInitialConversationRequest {
    const value = this.conversationForm.getRawValue();
    const dialog = this.dialogForm.getRawValue();
    const referral = this.demographicsForm.getRawValue().referral;
    const pathway = this.pathwayForm.getRawValue();

    const flaggedLabels = MDT_FLAGS.filter((f) => value.risk.flags[f.key]).map((f) => f.label);
    const needHelpLabels = DIALOG_DOMAINS.filter((d) => dialog.needHelp[d.key] === true).map((d) => d.area);

    const lines: (string | false)[] = [
      `Session date: ${value.session.sessionDate} · Type of contact: ${value.session.contactType}`,
      `Referral source: ${referral.referralSource}`,
      '',
      !!value.prompts.durationImpact && `Duration, daily impact, recent triggers: ${value.prompts.durationImpact}`,
      !!value.prompts.background && `Background (family, upbringing, early adversity): ${value.prompts.background}`,
      !!value.prompts.ownUnderstanding &&
        `Guest's own understanding of their distress / support hoped for: ${value.prompts.ownUnderstanding}`,
      `MDT summary: ${value.summary}`,
      '',
      'Mental health & psychiatric history:',
      `- Previous mental health diagnosis: ${value.history.previousDiagnosis}` +
        (value.history.diagnosisGroups ? ` (groups: ${value.history.diagnosisGroups})` : ''),
      !!value.history.reportedDiagnosis && `- Reported diagnosis (guest's words): ${value.history.reportedDiagnosis}`,
      `- Previous inpatient admission: ${value.history.inpatientAdmission}` +
        (value.history.inpatientDetails ? ` (${value.history.inpatientDetails})` : ''),
      `- Family history of mental health difficulties: ${value.history.familyHistory}` +
        (value.history.familyHistoryDetails ? ` (${value.history.familyHistoryDetails})` : ''),
      '',
      'Physical health:',
      !!value.physical.conditions && `- Relevant physical health conditions: ${value.physical.conditions}`,
      `- Known allergies: ${value.physical.allergies}` +
        (value.physical.allergyDetails ? ` (${value.physical.allergyDetails})` : ''),
      !!value.physical.medication && `- Current medication: ${value.physical.medication}`,
      '',
      'Risk screening:',
      `- History of self-harm or suicide: ${value.risk.selfHarmHistory}` +
        (value.risk.selfHarmComment ? ` (${value.risk.selfHarmComment})` : ''),
      `- History of risk to others: ${value.risk.riskToOthersHistory}` +
        (value.risk.riskToOthersComment ? ` (${value.risk.riskToOthersComment})` : ''),
      `- History of safeguarding concerns: ${value.risk.safeguardingHistory}` +
        (value.risk.safeguardingComment ? ` (${value.risk.safeguardingComment})` : ''),
      `- Immediate escalation required: ${value.risk.escalationRequired}`,
      `- Immediate risk: ${value.risk.immediateRisk}`,
      !!value.risk.crisisNotes && `- Crisis notes: ${value.risk.crisisNotes}`,
      flaggedLabels.length > 0 && `- Flags for MDT: ${flaggedLabels.join('; ')}`,
      !!value.risk.riskNotes && `- Risk / safeguarding notes: ${value.risk.riskNotes}`,
      '',
      needHelpLabels.length > 0 && `DIALOG — areas flagged as needing help: ${needHelpLabels.join(', ')}`,
      !!dialog.additionalNotes && `DIALOG additional notes: ${dialog.additionalNotes}`,
    ];

    const notes = lines
      .filter((line): line is string => line !== false)
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    const actions: InitialConversationActionInput[] = value.actions.map((action) => ({
      description: action.description,
      dueDate: action.dueDate,
      assignedToStaffId: action.assignedToStaffId || null,
    }));

    return {
      presentingIssues: value.prompts.mainConcern,
      notes,
      consentConfirmed: value.consentConfirmed,
      immediateRisk: value.risk.immediateRisk === 'Yes',
      pathway: pathway.pathway!,
      afaSupportNeeded: pathway.afaSupportNeeded,
      assignedCmhwId: pathway.assignedCmhwId || null,
      nextContactDate: pathway.nextContactDate || null,
      actions,
    };
  }

  private buildDialogScores(): DialogScores {
    const scores = this.dialogForm.getRawValue().scores;
    const result = {} as Record<string, number>;
    for (const domain of DIALOG_DOMAINS) {
      result[domain.key] = scores[domain.key] ?? 1;
    }
    return result as unknown as DialogScores;
  }

  /**
   * The risk-screening answers map onto the existing risk-assessment endpoint (which is what
   * escalates a guest onto the Urgent Cases queue) — only called when something was flagged.
   */
  protected riskAssessmentNeeded(): boolean {
    const risk = this.conversationForm.getRawValue().risk;
    const flags = risk.flags;
    return (
      risk.immediateRisk === 'Yes' ||
      risk.selfHarmHistory.startsWith('Yes') ||
      risk.riskToOthersHistory.startsWith('Yes') ||
      risk.safeguardingHistory.startsWith('Yes') ||
      risk.escalationRequired.startsWith('Yes') ||
      flags.selfHarm ||
      flags.trauma ||
      flags.domesticAbuse ||
      flags.psychosis ||
      flags.substanceUse ||
      flags.childSafeguarding
    );
  }

  private buildRiskRequest(): RecordRiskAssessmentRequest {
    const risk = this.conversationForm.getRawValue().risk;
    const flags = risk.flags;
    const notes = [
      risk.crisisNotes && `Crisis notes: ${risk.crisisNotes}`,
      risk.riskNotes && `Risk / safeguarding notes: ${risk.riskNotes}`,
      'Recorded during the registration initial conversation.',
    ]
      .filter(Boolean)
      .join('\n');
    return {
      suicidalIdeation: flags.selfHarm,
      selfHarm: risk.selfHarmHistory.startsWith('Yes'),
      riskToOthers: risk.riskToOthersHistory.startsWith('Yes'),
      severeDeterioration: risk.escalationRequired.startsWith('Yes') || risk.immediateRisk === 'Yes' || flags.psychosis,
      safeguardingConcern:
        risk.safeguardingHistory.startsWith('Yes') || flags.childSafeguarding || flags.domesticAbuse,
      notes,
    };
  }

  // ---- Success overlay (Desktop88) ----

  protected successMessage(): string {
    const firstName = this.demographicsForm.getRawValue().personal.firstName || 'The guest';
    return `${firstName} is now successfully registered as an ACTIVE guest in the EMHIP system.`;
  }
}

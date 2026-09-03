import { HttpErrorResponse } from '@angular/common/http';
import { Component, EventEmitter, OnInit, Output, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable, forkJoin, map, of } from 'rxjs';
import {
  CapacityToConsent,
  CaseworkActionInput,
  CaseworkNoteCategory,
  CaseworkNoteDto,
  CaseworkNoteInput,
  CaseworkRiskLevel,
  ContactType,
  CpnAssessmentInput,
  CpnInitialAssessmentDto,
  CpnRiskDomain,
  CpnSessionType,
  LookupItemDto,
  RiskRating,
  YesNoUnknown,
} from '../../core/api-models';
import { AuthService } from '../../core/auth.service';
import { Permissions } from '../../core/permissions';
import { GuestsApiService } from '../../core/guests-api.service';
import { SettingsApiService } from '../../core/settings-api.service';
import { StaffPickerComponent } from '../../shared/staff-picker.component';
import { humanize } from './guest-workspace.util';

/** One row of "Actions arising from this note"; `key` keeps @for tracking stable across removals. */
interface ActionRow {
  key: number;
  description: string;
  dueDate: string;
  assignedToStaffId: string | null;
}

/** The shared top section of the popup, above whichever body the two toggles select. */
interface HeaderForm {
  isCpnContact: boolean;
  category: CaseworkNoteCategory | null;
  sessionType: CpnSessionType | null;
  /** '' renders the design's "Select...." placeholder; the API field itself is not nullable. */
  contactMethod: ContactType | '';
  /** yyyy-MM-dd — the design shows a date-only "dd/mm/yyyy" field, not an instant. */
  occurredOn: string;
}

/** Part 2 — the SBAR block written at every follow-up contact. */
interface FollowUpForm {
  situation: string;
  background: string;
  assessment: string;
  recommendation: string;
  riskLevel: CaseworkRiskLevel;
  riskNotes: string;
  guestReportedChanges: string;
  serviceInvolvementChanges: string;
  additionalNotes: string;
  nextContactDate: string;
  mdtDiscussionRequested: boolean;
  cpnReferralRequested: boolean;
  /** "Refer this guest to the CPN" — sent to the Hub Manager's MDT queue for confirmation. */
  cpnReferralReason: string;
  cpnReferralUrgency: string;
  cpnReferralRationale: string;
  /** "Add this guest for MDT discussion" — a discussion request on the MDT queue. */
  mdtDiscussionReason: string;
  mdtDiscussionDetails: string;
}

/** Part 1 — the initial clinical assessment, one per guest. */
interface AssessmentForm {
  methodOfAssessment: string;
  othersPresent: string;
  reasonForReferral: string;
  referredBy: string;
  currentDiagnosis: string;
  diagnosisDetail: string;
  currentMedication: string;
  previousPresentations: string;
  previousInpatientAdmission: YesNoUnknown;
  previousMhaSection: YesNoUnknown;
  talkingTherapies: string;
  personalHistory: string;
  familyMentalIllness: string;
  appearanceAndBehaviour: string;
  speech: string;
  moodSubjective: string;
  moodObjective: string;
  affect: string;
  thoughtsFormAndContent: string;
  perceptions: string;
  cognition: string;
  insight: string;
  energyAndSleep: string;
  appetite: string;
  socialIsolation: string;
  substanceUse: string;
  socialCircumstances: string;
  capacityToConsent: CapacityToConsent;
  capacityNotes: string;
  overallRiskRating: RiskRating;
  clinicalFormulation: string;
  recommendedPlan: string;
  safetyPlan: string;
  followUpFrequency: string;
  nextAppointmentDate: string;
}

interface RiskDomainRow {
  domain: CpnRiskDomain;
  label: string;
  rating: RiskRating;
  notes: string;
}

/** One free-text field in the MSE grid — declared as data so the template stays a single loop. */
interface MseField {
  key: keyof AssessmentForm;
  label: string;
  placeholder: string;
  required: boolean;
}

/** yyyy-MM-dd for an ISO instant, in the browser's local timezone. */
function toDateInput(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => `${n}`.padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function today(): string {
  return toDateInput(new Date().toISOString());
}

/**
 * The Add Contact popup, built from the `contact-popup` design export (Canvas.dc.html, the four
 * GuestOverviewTab states).
 *
 * The design branches twice. "Is this a CPN contact?" splits the form in two: a non-CPN contact is
 * classified with the contact-type chips and nothing else, while a CPN contact then picks a
 * session type. That second choice picks between two genuinely different records:
 *
 * - Part 1, the initial clinical assessment, completed once at the first CPN contact. It is its own
 *   aggregate (PUT /guests/{id}/cpn-assessment) because the design states the rule outright: "A new
 *   entry cannot be created if Part 1 already exists for this guest". The server answers whether one
 *   may be started, so the card is disabled from fact rather than from a guess.
 * - Part 2, an SBAR block written at every follow-up, which is the existing casework note
 *   (POST/PUT /guests/{id}/casework-notes) with the design's risk update and risk notes added.
 *
 * Both halves share the header (CPN toggle, contact method, date, read-only "Logged by") and the
 * "Save as draft" / "Submit contact note" footer, and both save as resumable drafts.
 *
 * Honest-data notes:
 * - The design's contact-type chips are CASEWORK, ACTIVITY, Hospitality and AFA. The API also has
 *   Meeting and Daily log from spec §4.6; they are not offered here, but a resumed note already
 *   carrying one shows it as a read-only chip rather than being silently reclassified.
 * - The design's risk row offers only "YES, HIGH RISK" and "NO RISK DETECTED"; a note carrying the
 *   API's Low or Medium shows it as a read-only line rather than being downgraded.
 * - The design labels the MSE speech field "Speed"; its own placeholder ("Rate, volume, tone,
 *   coherence") is the speech domain, so it is stored and labelled as Speech.
 * - Every dropdown whose options the design shows only one sample of (method of assessment, others
 *   present, referred by, diagnosis status, follow-up frequency) is lookup-backed, so the clinical
 *   vocabulary is editable in Settings instead of frozen into the build.
 * - "Logged by" is display-only — the server records the calling staff member itself.
 */
@Component({
  selector: 'emhip-casework-note-drawer',
  standalone: true,
  imports: [FormsModule, StaffPickerComponent],
  templateUrl: './casework-note-drawer.component.html',
  styleUrl: './casework-note-drawer.component.scss',
})
export class CaseworkNoteDrawerComponent implements OnInit {
  private readonly guestsApi = inject(GuestsApiService);
  private readonly settingsApi = inject(SettingsApiService);
  private readonly auth = inject(AuthService);

  readonly guestId = input.required<string>();
  readonly guestName = input.required<string>();
  /** An existing draft to resume; null opens a blank note. */
  readonly note = input<CaseworkNoteDto | null>(null);

  /** Emits after every successful save; `true` when the record was submitted, `false` for a draft. */
  @Output() readonly saved = new EventEmitter<boolean>();
  @Output() readonly closed = new EventEmitter<void>();

  /** null when idle, otherwise which footer button is in flight. */
  readonly saving = signal<'draft' | 'submit' | null>(null);
  readonly saveError = signal<string | null>(null);
  /** Set once a draft has been saved in this session, so the footer can confirm it. */
  readonly draftSavedAt = signal<string | null>(null);
  /** Id of the casework note being edited — from a resumed draft, or from the first draft save. */
  private readonly noteId = signal<string | null>(null);

  /** True until the CPN assessment state and the lookup lists have loaded. */
  readonly loading = signal(true);

  /** False once this guest has a submitted Part 1 — the Initial assessment card is then disabled. */
  readonly canCreateAssessment = signal(true);
  /** A submitted Part 1, shown read-only when the worker opens the Initial assessment card. */
  readonly submittedAssessment = signal<CpnInitialAssessmentDto | null>(null);

  readonly loggedBy = this.auth.current().displayName || '—';
  readonly humanize = humanize;

  /**
   * Whether the "Is this a CPN contact?" toggle is offered at all. It follows the
   * guests.contacts.cpn permission — granted to the CPN role by default and assignable to any
   * other role by an admin (Roles & Permissions) — so a CMHW sees the contact-type chips only.
   * A resumed CPN draft still shows its toggle so the note is not silently reclassified.
   */
  readonly canLogCpnContact = this.auth.hasPermission(Permissions.Guests.CpnContactsLog);

  /** The four chips the design offers when the contact is not a CPN one. */
  readonly categories: { value: CaseworkNoteCategory; label: string }[] = [
    { value: 'Casework', label: 'CASEWORK' },
    { value: 'Activity', label: 'ACTIVITY' },
    { value: 'Hospitality', label: 'HOSPITALITY' },
    { value: 'Afa', label: 'AFA' },
  ];

  /** Source order: "YES, HIGH RISK" sits left of "NO RISK DETECTED" in the design. */
  readonly riskChoices: { value: CaseworkRiskLevel; label: string }[] = [
    { value: 'High', label: 'YES, HIGH RISK' },
    { value: 'NoRiskDetected', label: 'NO RISK DETECTED' },
  ];

  readonly contactTypes: ContactType[] = ['PhoneCall', 'InPerson', 'VideoCall', 'TextMessage', 'Email'];

  /** "Urgency" on the CPN referral (design): routine goes to the next MDT, urgent to the Hub Manager today. */
  readonly urgencyChoices: { value: string; label: string; hint: string }[] = [
    { value: 'Routine — discuss at next MDT', label: 'Routine', hint: 'discuss at next MDT' },
    { value: 'Urgent — Hub Manager today', label: 'Urgent', hint: 'Hub Manager today' },
  ];

  readonly yesNoUnknown: { value: YesNoUnknown; label: string }[] = [
    { value: 'No', label: 'No' },
    { value: 'Yes', label: 'Yes' },
    { value: 'Unknown', label: 'Not known' },
  ];

  readonly capacityChoices: { value: CapacityToConsent; label: string }[] = [
    { value: 'HasCapacity', label: 'Yes - has capacity' },
    { value: 'LacksCapacity', label: 'No - lacks capacity' },
    { value: 'Uncertain', label: 'Uncertain' },
  ];

  readonly riskRatings: { value: RiskRating; label: string }[] = [
    { value: 'NotApplicable', label: 'Not applicable' },
    { value: 'Low', label: 'Low' },
    { value: 'Medium', label: 'Medium' },
    { value: 'High', label: 'High' },
  ];

  /** Section 5 of Part 1, in the design's two-column reading order. */
  readonly mseFields: MseField[] = [
    { key: 'appearanceAndBehaviour', label: 'Appearance and behaviour', placeholder: 'e.g. dressed appropriately/dishevelled/agitated....', required: true },
    { key: 'speech', label: 'Speech', placeholder: 'Rate, volume, tone, coherence....', required: true },
    { key: 'moodSubjective', label: 'Mood — subjective', placeholder: 'Guest’s own description....', required: true },
    { key: 'moodObjective', label: 'Mood — objective', placeholder: 'CPN observation....', required: true },
    { key: 'affect', label: 'Affect', placeholder: 'e.g. flat, congruent, labile...', required: true },
    { key: 'thoughtsFormAndContent', label: 'Thoughts — form and content', placeholder: 'Racing thought, thought disorder, rumination...', required: true },
    { key: 'perceptions', label: 'Perceptions', placeholder: 'Hallucinations, illusions...', required: true },
    { key: 'cognition', label: 'Cognition', placeholder: 'Orientation, memory, concentration...', required: false },
    { key: 'insight', label: 'Insight', placeholder: 'Awareness of illness and need for treatment....', required: false },
    { key: 'energyAndSleep', label: 'Energy and sleep', placeholder: 'Write description......', required: false },
    { key: 'appetite', label: 'Appetite', placeholder: 'Write description......', required: false },
    { key: 'socialIsolation', label: 'Social isolation', placeholder: 'Write description......', required: false },
  ];

  /** Lookup options, keyed by category; empty until the load resolves. */
  readonly lookups = signal<Record<string, LookupItemDto[]>>({});

  header: HeaderForm = this.emptyHeader();
  followUp: FollowUpForm = this.emptyFollowUp();
  assessment: AssessmentForm = this.emptyAssessment();
  riskDomains: RiskDomainRow[] = this.emptyRiskDomains();
  actions: ActionRow[] = [];
  private nextActionKey = 1;
  /** Id of the Part 1 draft being edited, so a second save updates it. */
  private assessmentId: string | null = null;

  /**
   * True when the note carries a Low/Medium risk level the design's two chips cannot express.
   * A getter rather than a computed — `followUp` is a plain object, so there is no signal to track.
   */
  get riskOutsideChoices(): boolean {
    return this.followUp.riskLevel === 'Low' || this.followUp.riskLevel === 'Medium';
  }

  /** True when a resumed note carries a category the design's four chips dropped. */
  get categoryOutsideChoices(): boolean {
    return this.header.category === 'Meeting' || this.header.category === 'DailyLog';
  }

  readonly title = computed(() => (this.noteId() ? 'Resume contact note' : 'Add contact'));

  /**
   * "Follow-up session N" in the design. The number is assigned by the server when the note is
   * submitted — counting the CPN notes already on the record — so an unsubmitted one is headed
   * without a number rather than with a guess that later turns out wrong.
   */
  readonly sessionHeading = computed(() => {
    const n = this.note()?.sessionNumber;
    return n ? `Follow-up session ${n}` : 'Follow-up session';
  });

  readonly entryBadge = computed(() => (this.noteId() ? 'Draft' : 'New Entry'));

  /** Which body the two toggles select: the chips only, Part 1, or Part 2. */
  get body(): 'contactType' | 'sessionChoice' | 'assessment' | 'followUp' {
    if (!this.header.isCpnContact) return 'contactType';
    if (this.header.sessionType === 'InitialAssessment') return 'assessment';
    if (this.header.sessionType === 'FollowUpSession') return 'followUp';
    return 'sessionChoice';
  }

  /** A submitted Part 1 is part of the clinical record and is shown, not edited. */
  get assessmentReadOnly(): boolean {
    return this.submittedAssessment() !== null;
  }

  constructor() {
    effect(() => {
      const existing = this.note();
      this.noteId.set(existing?.id ?? null);
      this.header = existing ? this.headerFrom(existing) : this.emptyHeader();
      this.followUp = existing ? this.followUpFrom(existing) : this.emptyFollowUp();
      this.actions = (existing?.actions ?? []).map((a) => ({
        key: this.nextActionKey++,
        description: a.description,
        dueDate: toDateInput(a.dueDate),
        // The DTO carries the assignee's name, not their id — a resumed draft therefore
        // reopens with the picker cleared rather than pointing at the wrong staff member.
        assignedToStaffId: null,
      }));
      this.saveError.set(null);
      this.draftSavedAt.set(null);
    });
  }

  ngOnInit(): void {
    const categories = [
      'CpnAssessmentMethod',
      'CpnOthersPresent',
      'CpnReferralSource',
      'CpnDiagnosisStatus',
      'CpnFollowUpFrequency',
      'CpnReferralReason',
    ];

    forkJoin({
      cpn: this.guestsApi.getCpnAssessment(this.guestId()),
      lookups: forkJoin(
        Object.fromEntries(categories.map((c) => [c, this.settingsApi.getLookups(c)])) as Record<
          string,
          Observable<LookupItemDto[]>
        >,
      ),
    }).subscribe({
      next: ({ cpn, lookups }) => {
        this.lookups.set(lookups);
        this.canCreateAssessment.set(cpn.canCreate);

        if (cpn.assessment?.status === 'Submitted') {
          this.submittedAssessment.set(cpn.assessment);
          this.assessment = this.assessmentFrom(cpn.assessment);
          this.riskDomains = this.riskDomainsFrom(cpn.assessment);
        } else if (cpn.assessment) {
          // A draft Part 1 is resumed rather than started again.
          this.assessmentId = cpn.assessment.id;
          this.assessment = this.assessmentFrom(cpn.assessment);
          this.riskDomains = this.riskDomainsFrom(cpn.assessment);
        }

        this.loading.set(false);
      },
      error: () => {
        // The popup is still usable for a non-CPN contact without these, so this is not fatal:
        // the CPN cards fall back to their defaults and the dropdowns render empty.
        this.loading.set(false);
      },
    });
  }

  private emptyHeader(): HeaderForm {
    return {
      isCpnContact: false,
      category: 'Casework',
      sessionType: null,
      contactMethod: '',
      occurredOn: today(),
    };
  }

  private emptyFollowUp(): FollowUpForm {
    return {
      situation: '',
      background: '',
      assessment: '',
      recommendation: '',
      riskLevel: 'NoRiskDetected',
      riskNotes: '',
      guestReportedChanges: '',
      serviceInvolvementChanges: '',
      additionalNotes: '',
      nextContactDate: '',
      mdtDiscussionRequested: false,
      cpnReferralRequested: false,
      cpnReferralReason: '',
      cpnReferralUrgency: this.urgencyChoices[0].value,
      cpnReferralRationale: '',
      mdtDiscussionReason: '',
      mdtDiscussionDetails: '',
    };
  }

  private emptyAssessment(): AssessmentForm {
    return {
      methodOfAssessment: '',
      othersPresent: '',
      reasonForReferral: '',
      referredBy: '',
      currentDiagnosis: '',
      diagnosisDetail: '',
      currentMedication: '',
      previousPresentations: '',
      previousInpatientAdmission: 'No',
      previousMhaSection: 'No',
      talkingTherapies: '',
      personalHistory: '',
      familyMentalIllness: '',
      appearanceAndBehaviour: '',
      speech: '',
      moodSubjective: '',
      moodObjective: '',
      affect: '',
      thoughtsFormAndContent: '',
      perceptions: '',
      cognition: '',
      insight: '',
      energyAndSleep: '',
      appetite: '',
      socialIsolation: '',
      substanceUse: '',
      socialCircumstances: '',
      capacityToConsent: 'HasCapacity',
      capacityNotes: '',
      overallRiskRating: 'NotApplicable',
      clinicalFormulation: '',
      recommendedPlan: '',
      safetyPlan: '',
      followUpFrequency: '',
      nextAppointmentDate: '',
    };
  }

  /** The nine domains in the design's order, unrated until the worker touches them. */
  private emptyRiskDomains(): RiskDomainRow[] {
    const labels: [CpnRiskDomain, string][] = [
      ['SelfHarmShortTerm', 'Self-harm — short term'],
      ['SelfHarmLongTerm', 'Self-harm — long term'],
      ['SuicideShortTerm', 'Suicide — short term'],
      ['SuicideLongTerm', 'Suicide — long term'],
      ['HarmToOthers', 'Harm to others'],
      ['HarmFromOthers', 'Harm from others (incl. domestic violence)'],
      ['RiskToChildren', 'Risk to children'],
      ['RefusingServices', 'Refusing services'],
      ['SelfNeglect', 'Self-neglect'],
    ];
    return labels.map(([domain, label]) => ({ domain, label, rating: 'NotApplicable' as RiskRating, notes: '' }));
  }

  private headerFrom(dto: CaseworkNoteDto): HeaderForm {
    return {
      isCpnContact: dto.isCpnContact,
      category: dto.category,
      sessionType: dto.cpnSessionType ?? (dto.isCpnContact ? 'FollowUpSession' : null),
      contactMethod: dto.contactMethod,
      occurredOn: toDateInput(dto.occurredAt) || today(),
    };
  }

  private followUpFrom(dto: CaseworkNoteDto): FollowUpForm {
    return {
      situation: dto.situation ?? '',
      background: dto.background ?? '',
      assessment: dto.assessment ?? '',
      recommendation: dto.recommendation ?? '',
      riskLevel: dto.riskLevel,
      riskNotes: dto.riskNotes ?? '',
      guestReportedChanges: dto.guestReportedChanges ?? '',
      serviceInvolvementChanges: dto.serviceInvolvementChanges ?? '',
      additionalNotes: dto.additionalNotes ?? '',
      nextContactDate: toDateInput(dto.nextContactDate),
      mdtDiscussionRequested: dto.mdtDiscussionRequested,
      cpnReferralRequested: dto.cpnReferralRequested,
      // The referral / discussion detail is not stored on the note itself (it becomes the MDT
      // queue record on submit), so a resumed draft starts those fields empty.
      cpnReferralReason: '',
      cpnReferralUrgency: this.urgencyChoices[0].value,
      cpnReferralRationale: '',
      mdtDiscussionReason: '',
      mdtDiscussionDetails: '',
    };
  }

  private assessmentFrom(dto: CpnInitialAssessmentDto): AssessmentForm {
    return {
      methodOfAssessment: dto.methodOfAssessment ?? '',
      othersPresent: dto.othersPresent ?? '',
      reasonForReferral: dto.reasonForReferral ?? '',
      referredBy: dto.referredBy ?? '',
      currentDiagnosis: dto.currentDiagnosis ?? '',
      diagnosisDetail: dto.diagnosisDetail ?? '',
      currentMedication: dto.currentMedication ?? '',
      previousPresentations: dto.previousPresentations ?? '',
      previousInpatientAdmission: dto.previousInpatientAdmission,
      previousMhaSection: dto.previousMhaSection,
      talkingTherapies: dto.talkingTherapies ?? '',
      personalHistory: dto.personalHistory ?? '',
      familyMentalIllness: dto.familyMentalIllness ?? '',
      appearanceAndBehaviour: dto.appearanceAndBehaviour ?? '',
      speech: dto.speech ?? '',
      moodSubjective: dto.moodSubjective ?? '',
      moodObjective: dto.moodObjective ?? '',
      affect: dto.affect ?? '',
      thoughtsFormAndContent: dto.thoughtsFormAndContent ?? '',
      perceptions: dto.perceptions ?? '',
      cognition: dto.cognition ?? '',
      insight: dto.insight ?? '',
      energyAndSleep: dto.energyAndSleep ?? '',
      appetite: dto.appetite ?? '',
      socialIsolation: dto.socialIsolation ?? '',
      substanceUse: dto.substanceUse ?? '',
      socialCircumstances: dto.socialCircumstances ?? '',
      capacityToConsent: dto.capacityToConsent,
      capacityNotes: dto.capacityNotes ?? '',
      overallRiskRating: dto.overallRiskRating,
      clinicalFormulation: dto.clinicalFormulation ?? '',
      recommendedPlan: dto.recommendedPlan ?? '',
      safetyPlan: dto.safetyPlan ?? '',
      followUpFrequency: dto.followUpFrequency ?? '',
      nextAppointmentDate: toDateInput(dto.nextAppointmentDate),
    };
  }

  /** Merges saved ratings onto the full nine-row list so unrated domains still render. */
  private riskDomainsFrom(dto: CpnInitialAssessmentDto): RiskDomainRow[] {
    return this.emptyRiskDomains().map((row) => {
      const saved = dto.riskDomains.find((d) => d.domain === row.domain);
      return saved ? { ...row, rating: saved.rating, notes: saved.notes ?? '' } : row;
    });
  }

  options(category: string): LookupItemDto[] {
    return this.lookups()[category] ?? [];
  }

  /** Reads one MSE field by key so the template can drive the grid from `mseFields`. */
  mseValue(key: keyof AssessmentForm): string {
    return (this.assessment[key] as string) ?? '';
  }

  setMseValue(key: keyof AssessmentForm, value: string): void {
    (this.assessment as unknown as Record<string, string>)[key] = value;
  }

  setCpnContact(isCpn: boolean): void {
    this.header.isCpnContact = isCpn;
    // The two branches classify a contact in mutually exclusive ways, so switching clears the
    // other branch's answer rather than leaving a stale one to be saved.
    if (isCpn) {
      this.header.category = null;
    } else {
      this.header.sessionType = null;
      this.header.category ??= 'Casework';
    }
    this.saveError.set(null);
  }

  setSessionType(type: CpnSessionType): void {
    if (type === 'InitialAssessment' && !this.canCreateAssessment() && !this.assessmentReadOnly) return;
    this.header.sessionType = type;
    this.saveError.set(null);
  }

  setCategory(category: CaseworkNoteCategory): void {
    this.header.category = category;
  }

  setRisk(level: CaseworkRiskLevel): void {
    this.followUp.riskLevel = level;
  }

  toggleMdt(): void {
    this.followUp.mdtDiscussionRequested = !this.followUp.mdtDiscussionRequested;
  }

  toggleCpnReferral(): void {
    this.followUp.cpnReferralRequested = !this.followUp.cpnReferralRequested;
  }

  setUrgency(value: string): void {
    this.followUp.cpnReferralUrgency = value;
  }

  addActionRow(): void {
    this.actions = [
      ...this.actions,
      { key: this.nextActionKey++, description: '', dueDate: today(), assignedToStaffId: null },
    ];
  }

  removeActionRow(key: number): void {
    this.actions = this.actions.filter((a) => a.key !== key);
  }

  close(): void {
    if (this.saving()) return;
    this.closed.emit();
  }

  saveDraft(): void {
    this.persist(false);
  }

  submitNote(): void {
    this.persist(true);
  }

  /**
   * Shared save path. A draft only needs the fields the API cannot default (contact method and
   * date); submitting additionally enforces the fields the design marks mandatory. Which endpoint
   * the save lands on depends on the body: Part 1 is its own record, everything else is a note.
   */
  private persist(submit: boolean): void {
    if (this.saving()) return;
    if (this.assessmentReadOnly && this.body === 'assessment') return;

    const problem = this.validate(submit);
    if (problem) {
      this.saveError.set(problem);
      return;
    }

    this.saving.set(submit ? 'submit' : 'draft');
    this.saveError.set(null);

    const request$ = this.body === 'assessment' ? this.saveAssessment(submit) : this.saveNote(submit);

    request$.subscribe({
      next: (createdId) => {
        // A create hands back the new id; keeping it means the next "Save as draft" updates
        // this record rather than piling up duplicates.
        if (createdId) {
          if (this.body === 'assessment') this.assessmentId = createdId;
          else this.noteId.set(createdId);
        }
        this.saving.set(null);
        if (submit) {
          this.saved.emit(true);
        } else {
          this.draftSavedAt.set(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
          this.saved.emit(false);
        }
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(null);
        this.saveError.set(
          this.problemDetail(err) ??
            (submit ? 'Could not submit this contact note. Please try again.' : 'Could not save this draft. Please try again.'),
        );
      },
    });
  }

  /** Returns the first thing standing in the way of this save, or null when it may proceed. */
  private validate(submit: boolean): string | null {
    if (!this.header.contactMethod) return 'Choose a contact method before saving.';
    if (!this.header.occurredOn) return 'Enter the date this contact happened.';

    if (this.header.isCpnContact && !this.header.sessionType) {
      return 'Choose whether this is the initial assessment or a follow-up session.';
    }
    if (!this.header.isCpnContact && submit && !this.header.category) {
      return 'Select a contact type.';
    }

    if (this.body === 'assessment') {
      if (!submit) return null;
      const a = this.assessment;
      if (!a.methodOfAssessment) return 'Choose the method of assessment.';
      if (!a.reasonForReferral.trim()) return 'Record the reason for referral to the CPN.';
      if (!a.referredBy) return 'Record who referred the guest.';
      const missingMse = this.mseFields.find((f) => f.required && !this.mseValue(f.key).trim());
      if (missingMse) return `${missingMse.label} is required to submit the initial assessment.`;
      if (!a.clinicalFormulation.trim()) return 'A clinical formulation is required to submit the initial assessment.';
      if (!a.recommendedPlan.trim()) return 'A recommended clinical plan is required to submit the initial assessment.';
      if (!a.followUpFrequency) return 'Choose a follow-up frequency.';
      if (!a.nextAppointmentDate) return 'Enter the next appointment date.';
      return null;
    }

    // Untouched blank rows are dropped silently; a half-filled one is a mistake worth flagging.
    const partialAction = this.actions.some((a) => {
      const described = a.description.trim().length > 0;
      return (described && !a.dueDate) || (!described && !!a.assignedToStaffId);
    });
    if (partialAction) return 'Every action arising from this note needs a description and a due date.';

    if (submit && this.body === 'followUp') {
      if (!this.followUp.assessment.trim()) {
        return 'Your clinical assessment of the current presentation is required to submit a follow-up session.';
      }
      if (!this.followUp.recommendation.trim()) {
        return 'A recommendation — what needs to happen next — is required to submit a follow-up session.';
      }
    }
    if (submit && this.body === 'contactType' && !this.followUp.assessment.trim()) {
      return 'Your assessment of what is going on is required to submit a contact note.';
    }
    if (submit && this.followUp.cpnReferralRequested && !this.followUp.cpnReferralReason) {
      return 'Select the primary reason for the CPN referral.';
    }
    if (submit && this.followUp.mdtDiscussionRequested && !this.followUp.mdtDiscussionReason.trim()) {
      return 'Give the reason for requesting MDT discussion.';
    }

    return null;
  }

  /** Normalised to the created id (null on update) so both branches share one subscriber. */
  private saveNote(submit: boolean): Observable<string | null> {
    const input = this.toNoteInput();
    const id = this.noteId();
    return id
      ? this.guestsApi.updateCaseworkNote(this.guestId(), id, input, submit).pipe(map(() => null))
      : this.guestsApi.saveCaseworkNote(this.guestId(), input, submit).pipe(map((res) => res.id));
  }

  private saveAssessment(submit: boolean): Observable<string | null> {
    if (this.assessmentReadOnly) return of(null);
    return this.guestsApi.saveCpnAssessment(this.guestId(), this.toAssessmentInput(), submit).pipe(map((res) => res.id));
  }

  /** ProblemDetails bodies carry the useful message in `detail`. */
  private problemDetail(err: HttpErrorResponse): string | null {
    const body = err?.error as { detail?: unknown } | null;
    return typeof body?.detail === 'string' && body.detail.trim() ? body.detail : null;
  }

  private toNoteInput(): CaseworkNoteInput {
    const actions: CaseworkActionInput[] = this.actions
      .filter((a) => a.description.trim() && a.dueDate)
      .map((a) => ({
        description: a.description.trim(),
        dueDate: a.dueDate,
        assignedToStaffId: a.assignedToStaffId,
      }));

    return {
      category: this.header.isCpnContact ? null : this.header.category,
      contactMethod: this.header.contactMethod as ContactType,
      // Date-only field: midday local keeps the note on the chosen day in every timezone.
      occurredAt: this.occurredAtIso(),
      situation: this.trimmed(this.followUp.situation),
      background: this.trimmed(this.followUp.background),
      assessment: this.trimmed(this.followUp.assessment),
      recommendation: this.trimmed(this.followUp.recommendation),
      riskLevel: this.followUp.riskLevel,
      riskNotes: this.trimmed(this.followUp.riskNotes),
      isCpnContact: this.header.isCpnContact,
      cpnSessionType: this.header.isCpnContact ? this.header.sessionType : null,
      guestReportedChanges: this.trimmed(this.followUp.guestReportedChanges),
      serviceInvolvementChanges: this.trimmed(this.followUp.serviceInvolvementChanges),
      additionalNotes: this.trimmed(this.followUp.additionalNotes),
      nextContactDate: this.followUp.nextContactDate || null,
      mdtDiscussionRequested: this.followUp.mdtDiscussionRequested,
      cpnReferralRequested: this.followUp.cpnReferralRequested,
      actions,
      cpnReferralReason: this.followUp.cpnReferralRequested ? this.followUp.cpnReferralReason || null : null,
      cpnReferralUrgency: this.followUp.cpnReferralRequested ? this.followUp.cpnReferralUrgency || null : null,
      cpnReferralRationale: this.followUp.cpnReferralRequested ? this.trimmed(this.followUp.cpnReferralRationale) : null,
      mdtDiscussionReason: this.followUp.mdtDiscussionRequested ? this.trimmed(this.followUp.mdtDiscussionReason) : null,
      mdtDiscussionDetails: this.followUp.mdtDiscussionRequested ? this.trimmed(this.followUp.mdtDiscussionDetails) : null,
    };
  }

  private toAssessmentInput(): CpnAssessmentInput {
    const a = this.assessment;
    return {
      contactMethod: this.header.contactMethod as ContactType,
      occurredAt: this.occurredAtIso(),
      methodOfAssessment: a.methodOfAssessment || null,
      othersPresent: a.othersPresent || null,
      reasonForReferral: this.trimmed(a.reasonForReferral),
      referredBy: a.referredBy || null,
      currentDiagnosis: a.currentDiagnosis || null,
      diagnosisDetail: this.trimmed(a.diagnosisDetail),
      currentMedication: this.trimmed(a.currentMedication),
      previousPresentations: this.trimmed(a.previousPresentations),
      previousInpatientAdmission: a.previousInpatientAdmission,
      previousMhaSection: a.previousMhaSection,
      talkingTherapies: this.trimmed(a.talkingTherapies),
      personalHistory: this.trimmed(a.personalHistory),
      familyMentalIllness: this.trimmed(a.familyMentalIllness),
      appearanceAndBehaviour: this.trimmed(a.appearanceAndBehaviour),
      speech: this.trimmed(a.speech),
      moodSubjective: this.trimmed(a.moodSubjective),
      moodObjective: this.trimmed(a.moodObjective),
      affect: this.trimmed(a.affect),
      thoughtsFormAndContent: this.trimmed(a.thoughtsFormAndContent),
      perceptions: this.trimmed(a.perceptions),
      cognition: this.trimmed(a.cognition),
      insight: this.trimmed(a.insight),
      energyAndSleep: this.trimmed(a.energyAndSleep),
      appetite: this.trimmed(a.appetite),
      socialIsolation: this.trimmed(a.socialIsolation),
      substanceUse: this.trimmed(a.substanceUse),
      socialCircumstances: this.trimmed(a.socialCircumstances),
      capacityToConsent: a.capacityToConsent,
      capacityNotes: this.trimmed(a.capacityNotes),
      overallRiskRating: a.overallRiskRating,
      // Only rated domains are sent; an untouched "Not applicable" with no note says nothing.
      riskDomains: this.riskDomains
        .filter((d) => d.rating !== 'NotApplicable' || d.notes.trim())
        .map((d) => ({ domain: d.domain, rating: d.rating, notes: this.trimmed(d.notes) })),
      clinicalFormulation: this.trimmed(a.clinicalFormulation),
      recommendedPlan: this.trimmed(a.recommendedPlan),
      safetyPlan: this.trimmed(a.safetyPlan),
      followUpFrequency: a.followUpFrequency || null,
      nextAppointmentDate: a.nextAppointmentDate || null,
    };
  }

  private occurredAtIso(): string {
    return new Date(`${this.header.occurredOn}T12:00:00`).toISOString();
  }

  private trimmed(value: string): string | null {
    const text = value.trim();
    return text ? text : null;
  }
}

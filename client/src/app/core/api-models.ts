// Mirrors the DTOs in src/Emhip.Application/**/Dtos and src/Emhip.Api/Controllers/**.
// Keep field names/casing exactly in sync with the C# records (System.Text.Json's default
// camelCase output).

/** Engagement status per spec §4.7. Urgency is a separate flag, not a status. */
export type GuestStatus = 'New' | 'Active' | 'OnHold';

/** Referral classification (spec §6.2); Secondary referrals carry a subcategory. */
export type ReferralType = 'Primary' | 'Secondary';
export type ContactType = 'PhoneCall' | 'InPerson' | 'VideoCall' | 'TextMessage' | 'Email';
export type ContactOutcome = 'Successful' | 'NoAnswer' | 'LeftMessage' | 'Declined' | 'Rescheduled';
export type NoteColor = 'Yellow' | 'Green' | 'Orange' | 'Purple';
export type FollowUpStatus = 'Scheduled' | 'Completed' | 'Overdue' | 'Cancelled';
export type PathwayCategory =
  | 'HousingAdvice'
  | 'EmploymentSupport'
  | 'BenefitsFinancialSupport'
  | 'FoodEssentials'
  | 'ImmigrationLegalAdvice'
  | 'OtherPracticalAdvice';
export type PathwayStatus = 'Referred' | 'InProgress' | 'Completed' | 'Declined';
/** Register-flow "Pathway & allocation" — the guest's overall clinical pathway. */
export type GuestPathway = 'MentalWellbeing' | 'ClinicalSupport' | 'CommunityRecovery';

export interface KeysetPage<T> {
  /** Total rows matching the filters — present only on the first page (no cursor); carry it forward. */
  totalCount: number | null;
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface GuestListItemDto {
  id: string;
  /** Sequential human-friendly reference; render as "G-{guestNumber}". */
  guestNumber: number;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  status: GuestStatus;
  assignedCmhwName: string | null;
  registeredAt: string;
  lastContactAt: string | null;
  /** Latest pathway referral category (PathwayCategory name), or null if never referred. */
  pathwayCategory: string | null;
  /** True when the guest's latest risk assessment carries any flag. */
  hasRiskFlags: boolean;
  /** Temporary safety escalation — independent of status and pathway. */
  isUrgent: boolean;
  /** Due date (yyyy-MM-dd) of the next scheduled follow-up, or null. */
  nextContactDue: string | null;
  /** Clinical pathway — the only pathways: Mental Wellbeing, Clinical Support, Community Recovery. */
  pathway: GuestPathway | null;
}

/** Option for the guest list's "Assigned CMHW" filter — GET /guests/cmhws. */
export interface CmhwOptionDto {
  id: string;
  displayName: string;
}

export interface GuestNoteDto {
  id: string;
  body: string;
  color: string;
  isPinned: boolean;
  authorName: string;
  createdAt: string;
}

export interface GuestContactSummaryDto {
  id: string;
  type: string;
  outcome: string;
  occurredAt: string;
  createdByName: string;
}

/** Top-bar search autocomplete row — GET /guests/suggest?q=. */
export interface GuestSuggestionDto {
  id: string;
  guestNumber: number;
  fullName: string;
  status: GuestStatus;
}

export interface GuestOverviewDto {
  id: string;
  /** Sequential human-friendly reference; render as "G-{guestNumber}". */
  guestNumber: number;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  status: GuestStatus;
  contactPhone: string | null;
  contactEmail: string | null;
  /** Captured at registration — shown read-only in the Demographics tab's "Personal details". */
  addressLine1: string | null;
  postCode: string | null;
  assignedCmhwName: string | null;
  registeredAt: string;
  hasActiveRiskFlags: boolean;
  openFollowUpCount: number;
  pathway: GuestPathway | null;
  afaSupportNeeded: boolean;
  referralSource: string | null;
  referralType: ReferralType | null;
  referralSubcategory: string | null;
  isUrgent: boolean;
  urgentSince: string | null;
  lastActivityAt: string | null;
  pinnedNotes: GuestNoteDto[];
  recentContacts: GuestContactSummaryDto[];
}

export interface GuestDemographicsDto {
  guestId: string;
  ethnicity: string | null;
  nationality: string | null;
  preferredLanguage: string | null;
  interpreterNeeded: boolean;
  housingStatus: string | null;
  employmentStatus: string | null;
  maritalStatus?: string | null;
  livingGroup?: string | null;
  /** Reported separately from nationality; drives the demographics filters. */
  countryOfOrigin?: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  emergencyContactRelationship: string | null;
  gpName: string | null;
  gpPractice: string | null;
  nhsNumber: string | null;
}

export interface RiskAssessmentDto {
  id: string;
  version: number;
  suicidalIdeation: boolean;
  selfHarm: boolean;
  riskToOthers: boolean;
  severeDeterioration: boolean;
  safeguardingConcern: boolean;
  notes: string | null;
  assessedByName: string;
  assessedAt: string;
}

export interface GuestClinicalDto {
  guestId: string;
  history: RiskAssessmentDto[];
}

export interface PathwayReferralDto {
  id: string;
  category: string;
  detail: string | null;
  status: string;
  referredByName: string;
  referredAt: string;
}

/** One entry in the append-only pathway history (what changed, why, who authorised it). */
export interface PathwayChangeDto {
  id: string;
  fromPathway: GuestPathway | null;
  toPathway: GuestPathway;
  reason: string | null;
  assignedByName: string | null;
  /** The clinically meaningful date the change took effect (yyyy-MM-dd). */
  changedOn: string;
  recordedByName: string;
  createdAt: string;
}

export interface ChangePathwayRequest {
  pathway: GuestPathway;
  /** Required — every pathway change records why it was made. */
  reason: string;
  /** Staff member who authorised the change; falls back to assignedByName for non-portal clinicians. */
  assignedByStaffId?: string | null;
  assignedByName?: string | null;
  changedOn: string;
}

// ---- CPN initial assessment (Part 1 of the Add Contact popup) ----

export type CpnAssessmentStatus = 'Draft' | 'Submitted';
export type RiskRating = 'NotApplicable' | 'Low' | 'Medium' | 'High';
export type CapacityToConsent = 'HasCapacity' | 'LacksCapacity' | 'Uncertain';
export type YesNoUnknown = 'No' | 'Yes' | 'Unknown';

/** The nine risk domains rated in Part 1, in the order the design lists them. */
export type CpnRiskDomain =
  | 'SelfHarmShortTerm'
  | 'SelfHarmLongTerm'
  | 'SuicideShortTerm'
  | 'SuicideLongTerm'
  | 'HarmToOthers'
  | 'HarmFromOthers'
  | 'RiskToChildren'
  | 'RefusingServices'
  | 'SelfNeglect';

export interface CpnRiskDomainDto {
  domain: CpnRiskDomain;
  rating: RiskRating;
  notes?: string | null;
}

/** The Part 1 field set — shared by the save payload and the read model. */
export interface CpnAssessmentInput {
  contactMethod: ContactType;
  occurredAt: string;
  /** Lookup codes from the Cpn* lookup categories. */
  methodOfAssessment?: string | null;
  othersPresent?: string | null;
  reasonForReferral?: string | null;
  referredBy?: string | null;
  currentDiagnosis?: string | null;
  diagnosisDetail?: string | null;
  currentMedication?: string | null;
  previousPresentations?: string | null;
  previousInpatientAdmission: YesNoUnknown;
  previousMhaSection: YesNoUnknown;
  talkingTherapies?: string | null;
  personalHistory?: string | null;
  familyMentalIllness?: string | null;
  appearanceAndBehaviour?: string | null;
  /** The design labels this "Speed"; its placeholder is the MSE speech domain. */
  speech?: string | null;
  moodSubjective?: string | null;
  moodObjective?: string | null;
  affect?: string | null;
  thoughtsFormAndContent?: string | null;
  perceptions?: string | null;
  cognition?: string | null;
  insight?: string | null;
  energyAndSleep?: string | null;
  appetite?: string | null;
  socialIsolation?: string | null;
  substanceUse?: string | null;
  socialCircumstances?: string | null;
  capacityToConsent: CapacityToConsent;
  capacityNotes?: string | null;
  overallRiskRating: RiskRating;
  riskDomains: CpnRiskDomainDto[];
  clinicalFormulation?: string | null;
  recommendedPlan?: string | null;
  safetyPlan?: string | null;
  followUpFrequency?: string | null;
  nextAppointmentDate?: string | null;
}

export interface CpnInitialAssessmentDto extends CpnAssessmentInput {
  id: string;
  guestId: string;
  status: CpnAssessmentStatus;
  authorName: string;
  createdAt: string;
  submittedAt: string | null;
}

export interface GuestCpnAssessmentDto {
  assessment: CpnInitialAssessmentDto | null;
  /** False once Part 1 has been submitted — the design allows only one per guest. */
  canCreate: boolean;
}

// ---- Casework notes (the SBAR clinical note behind "Add contact") ----

export type CaseworkNoteCategory = 'Casework' | 'Activity' | 'Meeting' | 'DailyLog' | 'Hospitality' | 'Afa';
export type CaseworkNoteStatus = 'Draft' | 'Submitted';
export type CaseworkRiskLevel = 'NoRiskDetected' | 'Low' | 'Medium' | 'High';

/** Which of the two CPN forms a contact uses — the design's "CPN session type" cards. */
export type CpnSessionType = 'InitialAssessment' | 'FollowUpSession';

/** An action the worker adds while writing the note ("Actions arising from this note"). */
export interface CaseworkActionInput {
  description: string;
  dueDate: string;
  assignedToStaffId?: string | null;
}

export interface CaseworkNoteActionDto {
  id: string;
  description: string;
  dueDate: string;
  isCompleted: boolean;
  assignedToName: string | null;
}

export interface CaseworkNoteInput {
  /** Null for a CPN session: the contact-type chips only appear when the CPN toggle is off. */
  category: CaseworkNoteCategory | null;
  contactMethod: ContactType;
  occurredAt: string;
  situation?: string | null;
  background?: string | null;
  /** Required to submit; drafts may leave it empty. */
  assessment?: string | null;
  recommendation?: string | null;
  riskLevel: CaseworkRiskLevel;
  riskNotes?: string | null;
  isCpnContact: boolean;
  cpnSessionType?: CpnSessionType | null;
  guestReportedChanges?: string | null;
  serviceInvolvementChanges?: string | null;
  additionalNotes?: string | null;
  /** Required to submit unless noNextContactRequired is ticked. */
  nextContactDate?: string | null;
  /** "No next contact needed" — the explicit opt-out from the mandatory next contact date. */
  noNextContactRequired: boolean;
  mdtDiscussionRequested: boolean;
  cpnReferralRequested: boolean;
  actions: CaseworkActionInput[];
  /** "Refer this guest to the CPN" — primary reason (lookup label), urgency and rationale. */
  cpnReferralReason?: string | null;
  cpnReferralUrgency?: string | null;
  cpnReferralRationale?: string | null;
  /** "Add this guest for MDT discussion" — reason and what the team should consider. */
  mdtDiscussionReason?: string | null;
  mdtDiscussionDetails?: string | null;
  /** Activity contact: the hub activity (HubActivity lookup) and/or the free-text occasion. */
  activityType?: string | null;
  occasion?: string | null;
  /** AFA contact: the type of practical advice given (AfaAdviceType lookup). */
  adviceType?: string | null;
}

export interface CaseworkNoteDto {
  id: string;
  guestId: string;
  category: CaseworkNoteCategory | null;
  status: CaseworkNoteStatus;
  contactMethod: ContactType;
  occurredAt: string;
  situation: string | null;
  background: string | null;
  assessment: string | null;
  recommendation: string | null;
  riskLevel: CaseworkRiskLevel;
  riskNotes: string | null;
  isCpnContact: boolean;
  cpnSessionType: CpnSessionType | null;
  /** "Follow-up session N" — the note's position in the guest's CPN series. */
  sessionNumber: number | null;
  guestReportedChanges: string | null;
  serviceInvolvementChanges: string | null;
  additionalNotes: string | null;
  nextContactDate: string | null;
  noNextContactRequired: boolean;
  mdtDiscussionRequested: boolean;
  cpnReferralRequested: boolean;
  activityType: string | null;
  occasion: string | null;
  adviceType: string | null;
  authorName: string;
  createdAt: string;
  submittedAt: string | null;
  actions: CaseworkNoteActionDto[];
  /** Files attached through the Document Management module with this note's id. */
  attachments: CaseworkNoteAttachmentDto[];
}

export interface CaseworkNoteAttachmentDto {
  documentId: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  uploadedAt: string;
  uploadedByName: string;
}

export interface GuestPathwayDto {
  guestId: string;
  currentPathway: GuestPathway | null;
  afaSupportNeeded: boolean;
  /** Append-only history, newest first. */
  changes: PathwayChangeDto[];
  referrals: PathwayReferralDto[];
}

export interface FollowUpItemDto {
  id: string;
  dueDate: string;
  status: string;
  assigneeName: string;
  notes: string | null;
  completedAt: string | null;
}

export interface GuestFollowUpsDto {
  guestId: string;
  followUps: FollowUpItemDto[];
}

export interface GuestInitialConversationDto {
  guestId: string;
  presentingIssues: string | null;
  notes: string | null;
  consentConfirmed: boolean;
  /** Mandatory answer captured at the conversation (spec §4.2). */
  immediateRisk: boolean;
  nextContactDate: string | null;
  /** The pathway classified at this conversation (the guest's current allocation). */
  pathway: GuestPathway | null;
  afaSupportNeeded: boolean;
  assignedCmhwName: string | null;
  conductedByName: string;
  conductedAt: string;
}

export interface FollowUpQueueItemDto {
  id: string;
  guestId: string;
  guestName: string;
  /** Sequential human-friendly reference; render as "G-{guestNumber}". */
  guestNumber: number;
  dueDate: string;
  status: string;
  assigneeName: string;
  isOverdue: boolean;
}

export interface UrgentCaseDto {
  guestId: string;
  guestName: string;
  /** Sequential human-friendly reference; render as "G-{guestNumber}". */
  guestNumber: number;
  suicidalIdeation: boolean;
  selfHarm: boolean;
  riskToOthers: boolean;
  severeDeterioration: boolean;
  safeguardingConcern: boolean;
  assignedCmhwName: string | null;
  escalatedAt: string;
}

export interface ActiveGuestRowDto {
  guestId: string;
  name: string;
  status: string;
  lastContactAt: string | null;
  nextFollowUpDue: string | null;
}

export interface CmhwDashboardDto {
  totalActiveGuests: number;
  pendingConversationGuests: number;
  inactiveGuests: number;
  urgentGuests: number;
  activeGuests: ActiveGuestRowDto[];
  urgentBanner: UrgentCaseDto[];
  clinicalComplexity: ClinicalIndicatorDto[];
}

/** One "Clinical Complexity Indicators" tile — guests whose latest risk assessment has the flag. */
export interface ClinicalIndicatorDto {
  label: string;
  count: number;
}

export interface PathwayDistributionDto {
  category: string;
  count: number;
  percentage: number;
}

export interface MonthlyStatDto {
  year: number;
  month: number;
  newGuests: number;
  closedGuests: number;
  contacts: number;
}

export interface RecentActivityDto {
  /** Plain English, e.g. "Opened guest record" / "Viewed urgent case". */
  description: string;
  actorName: string;
  occurredAt: string;
  /** The guest the activity concerns — shown by name and linked to their record. */
  guestId: string | null;
  guestName: string | null;
  guestNumber: number | null;
}

export interface HubManagerDashboardDto {
  totalGuestsAcrossHub: number;
  totalActiveGuests: number;
  pendingConversationGuests: number;
  inactiveGuests: number;
  urgentGuests: number;
  pathwayDistribution: PathwayDistributionDto[];
  monthlyStats: MonthlyStatDto[];
  recentActivity: RecentActivityDto[];
  clinicalComplexity: ClinicalIndicatorDto[];
  demographics: GuestDemographicsBreakdownDto;
  dataQuality: DataQualityIssueTileDto[];
  /** "CPN involvement" card — live counts plus the most recently seen CPN-involved guests. */
  cpnInvolvement: CpnInvolvementDto;
  /** "Caseload per CMHW" card — the same per-worker rows as the Caseload report. */
  caseloadPerCmhw: CaseloadReportRowDto[];
}

export interface CpnInvolvementDto {
  guestsWithCpnInvolved: number;
  initialAssessmentsSubmitted: number;
  followUpSessionsLast30Days: number;
  cpnReferralsLast30Days: number;
  guests: CpnInvolvedGuestDto[];
}

export interface CpnInvolvedGuestDto {
  guestId: string;
  guestNumber: number;
  name: string;
  status: GuestStatus;
  assignedCmhwName: string | null;
  lastCpnContactAt: string | null;
  hasInitialAssessment: boolean;
  followUpSessions: number;
}

export interface PathwayCategoryTotalDto {
  category: string;
  count: number;
  percentage: number;
}

export interface PathwayReportDto {
  from: string;
  to: string;
  /** Guests currently on each of the three clinical pathways (category = GuestPathway name). */
  categoryTotals: PathwayCategoryTotalDto[];
  totalAllocated: number;
  /** Current hub-wide counts (point-in-time) — the report header KPI tiles. */
  statusCounts: GuestStatusCountsDto;
  /** Registrations per calendar month inside the range — "Guest registrations over time". */
  monthlyRegistrations: MonthlyCountDto[];
  /** Event counts inside the range — "Activity this period". */
  activity: ReportActivityDto;
  /** From recorded guest demographics — "Ethnicity breakdown". */
  ethnicityBreakdown: BreakdownSliceDto[];
}

export interface GuestStatusCountsDto {
  total: number;
  active: number;
  pendingConversation: number;
  inactive: number;
  urgent: number;
}

export interface MonthlyCountDto {
  year: number;
  month: number;
  count: number;
}

export interface ReportActivityDto {
  guestsSeen: number;
  urgentFlagsRaised: number;
  followUpEntries: number;
  contactsRecorded: number;
}

export interface BreakdownSliceDto {
  label: string;
  count: number;
  percentage: number;
}

export interface RegisterGuestRequest {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  consentGiven: boolean;
  gender?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  postCode?: string | null;
  assignedCmhwId?: string | null;
  /** Where the guest was referred from (GP referral, CMHT, Community organisation, Self-referral, …). */
  referralSource?: string | null;
  /** Primary or Secondary referral (spec §6.2). */
  referralType?: ReferralType | null;
  /** Required by the server when referralType is 'Secondary'. */
  referralSubcategory?: string | null;
}

export interface AddContactRequest {
  type: ContactType;
  outcome: ContactOutcome;
  occurredAt: string;
  notes?: string | null;
}

export interface AddNoteRequest {
  body: string;
  color: NoteColor;
  isPinned: boolean;
}

export interface ScheduleFollowUpRequest {
  dueDate: string;
  assigneeStaffId: string;
  notes?: string | null;
}

/** One action captured on the initial conversation form (spec §4.2 actions tracker). */
export interface InitialConversationActionInput {
  description: string;
  dueDate: string;
  assignedToStaffId?: string | null;
}

export interface RecordInitialConversationRequest {
  presentingIssues?: string | null;
  notes?: string | null;
  consentConfirmed: boolean;
  /** Mandatory Yes/No (spec §4.2); true raises the urgent flag automatically. */
  immediateRisk: boolean;
  /** Mandatory pathway classification. */
  pathway: GuestPathway;
  afaSupportNeeded: boolean;
  /** Required for Wellbeing Support and Additional / Clinical Support. */
  assignedCmhwId?: string | null;
  /** Required for the same one-to-one pathways. */
  nextContactDate?: string | null;
  actions?: InitialConversationActionInput[] | null;
}

export interface RecordRiskAssessmentRequest {
  suicidalIdeation: boolean;
  selfHarm: boolean;
  riskToOthers: boolean;
  severeDeterioration: boolean;
  safeguardingConcern: boolean;
  notes?: string | null;
}

export interface CreatePathwayReferralRequest {
  category: PathwayCategory;
  detail?: string | null;
}

export interface UpdateDemographicsRequest {
  ethnicity?: string | null;
  nationality?: string | null;
  preferredLanguage?: string | null;
  interpreterNeeded: boolean;
  housingStatus?: string | null;
  employmentStatus?: string | null;
  maritalStatus?: string | null;
  livingGroup?: string | null;
  /** Reported separately from nationality; drives the demographics filters. */
  countryOfOrigin?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactRelationship?: string | null;
  gpName?: string | null;
  gpPractice?: string | null;
  nhsNumber?: string | null;
}

// ---- DIALOG assessments (Guest Workspace DIALOG tab + register-flow DIALOG scale step) ----

/** The 11 DIALOG domains, each scored 1–7. */
export interface DialogScores {
  mentalHealth: number;
  physicalHealth: number;
  jobSituation: number;
  accommodation: number;
  leisureActivities: number;
  friendshipsSocialLife: number;
  relationshipWithFamily: number;
  personalSafety: number;
  practicalHelp: number;
  medication: number;
  meetingsWithMhStaff: number;
}

export interface DialogAssessmentDto extends DialogScores {
  id: string;
  version: number;
  assessedAt: string;
  assessedByName: string;
  total: number;
}

export interface GuestDialogDto {
  baseline: DialogAssessmentDto | null;
  latest: DialogAssessmentDto | null;
  history: DialogAssessmentDto[];
}

// ---- Guest actions (Guest Workspace Action tab) ----

export interface GuestActionDto {
  id: string;
  description: string;
  dueDate: string;
  assignedToStaffId: string | null;
  assignedToName: string | null;
  isCompleted: boolean;
  isOverdue: boolean;
  createdAt: string;
  completedAt: string | null;
}

export interface GuestActionRequest {
  description: string;
  dueDate: string;
  assignedToStaffId?: string | null;
  isCompleted: boolean;
}

// ---- Clinical profile (Guest Workspace Clinical Details tab) ----

export interface ClinicalProfileDto {
  guestId: string;
  previousMhDiagnosis: boolean;
  diagnosisGroups: string | null;
  presentingProblem: string | null;
  pastMhDifficulties: string | null;
  familyMhHistory: string | null;
  longTermHealthCondition: string | null;
  physicalIllness: string | null;
  currentMedications: string | null;
  mhTeamClinician: string | null;
  socialServicesCoordinator: string | null;
  cpnInvolved: boolean;
  trustInvolvement: boolean;
  smiIndicator: boolean;
  updatedAt: string | null;
}

export type UpdateClinicalProfileRequest = Omit<ClinicalProfileDto, 'guestId' | 'updatedAt'>;

// ---- DIALOG outcome-dimensions report (reports "Outcome dimensions" chart) ----

export interface DialogOutcomesReportDto {
  guestsWithBaseline: number;
  guestsWithFollowUp: number;
  dimensions: DialogDimensionDto[];
  /** Guests in the demographic cohort the figures cover — every hub guest when unfiltered. */
  cohortGuests: number;
}

/** Averages are null when no assessments exist for that cohort. */
export interface DialogDimensionDto {
  key: string;
  label: string;
  baselineAverage: number | null;
  latestAverage: number | null;
}

// ---- Urgent episodes (urgent-cases drawer: escalate to CMHT, resolve, episode record) ----

export interface UrgentEpisodeDto {
  id: string;
  guestId: string;
  guestName: string;
  guestNumber: number;
  raisedAt: string;
  escalatedToCmhtAt: string | null;
  escalatedToCmhtByName: string | null;
  cmhtTeam: string | null;
  escalationReason: string | null;
  escalationUrgency: string | null;
  escalationNotes: string | null;
  resolvedAt: string | null;
  resolvedByName: string | null;
  resolutionNote: string | null;
}

export interface EscalateToCmhtRequest {
  cmhtTeam: string;
  reason?: string | null;
  urgency?: string | null;
  notes?: string | null;
}

export interface ResolveUrgentCaseRequest {
  resolutionNote?: string | null;
  /** "Pathway re-entry decision" — applied to the guest and appended to the pathway history when it differs. */
  pathwayAfterResolution?: GuestPathway | null;
  /** yyyy-MM-dd; scheduled as a follow-up for the guest's CMHW. */
  nextContactDate?: string | null;
  /** Free text, e.g. "Yes — weekly CPN input added"; null when unchanged. */
  sessionFrequencyChange?: string | null;
  inpatientAdmission?: boolean;
}

// ---- Urgent Episode Record (design Desktop57) ----

/** One "Episode N" tab on the record screen. */
export interface UrgentEpisodeSummaryDto {
  id: string;
  episodeNumber: number;
  raisedAt: string;
  resolvedAt: string | null;
}

export interface UrgentEpisodeIntakeDto {
  riskAssessmentId: string | null;
  riskFlags: string[];
  notes: string | null;
  assessedAt: string | null;
  assessedByName: string | null;
}

export type UrgentEpisodeTimelineKind = 'flag' | 'note' | 'escalation' | 'contact' | 'followup' | 'pathway' | 'resolved';

export interface UrgentEpisodeTimelineEntryDto {
  kind: UrgentEpisodeTimelineKind;
  title: string;
  description: string | null;
  secondaryDescription: string | null;
  occurredAt: string;
  actorName: string | null;
}

export interface UrgentEpisodeAuditEntryDto {
  tone: 'red' | 'blue' | 'green' | 'grey';
  title: string;
  detail: string;
  occurredAt: string;
}

export interface UrgentEpisodeRecordDto {
  id: string;
  guestId: string;
  guestName: string;
  guestNumber: number;
  episodeNumber: number;
  episodes: UrgentEpisodeSummaryDto[];
  responseHours: number;
  raisedAt: string;
  deadlineAt: string;
  raisedByName: string | null;
  pathwayAtFlag: GuestPathway | null;
  assignedCmhwName: string | null;
  escalatedToCmhtAt: string | null;
  escalatedToCmhtByName: string | null;
  cmhtTeam: string | null;
  escalationReason: string | null;
  escalationUrgency: string | null;
  escalationNotes: string | null;
  isResolved: boolean;
  resolvedAt: string | null;
  resolvedByName: string | null;
  resolvedWithinWindow: boolean | null;
  resolutionNote: string | null;
  pathwayAfterResolution: GuestPathway | null;
  cmhwAfterResolutionName: string | null;
  nextContactDate: string | null;
  sessionFrequencyChange: string | null;
  inpatientAdmission: boolean;
  followUpsLogged: number;
  durationMinutes: number;
  recordAccessCount: number;
  intake: UrgentEpisodeIntakeDto;
  timeline: UrgentEpisodeTimelineEntryDto[];
  auditTrail: UrgentEpisodeAuditEntryDto[];
}

// ---- UK GDPR: per-guest access log ----

export interface GuestAuditEntryDto {
  id: string;
  occurredAt: string;
  actorName: string;
  action: 'Read' | 'Create' | 'Update' | 'Delete' | string;
  entityName: string;
  entityId: string;
  details: string | null;
  /** Plain-English wording from the server, e.g. "Opened guest record". */
  description: string;
}

// ---- New report tabs ----

export interface PathwayAnalyticsDto {
  unallocatedGuests: number;
  pathways: PathwayAnalyticsRowDto[];
}

export interface PathwayAnalyticsRowDto {
  pathway: GuestPathway;
  totalGuests: number;
  activeGuests: number;
  urgentGuests: number;
  inactiveGuests: number;
  afaSupportCount: number;
  avgLatestDialogTotal: number | null;
}

export interface CaseloadReportRowDto {
  staffId: string;
  displayName: string;
  assignedGuests: number;
  activeGuests: number;
  urgentGuests: number;
  overdueFollowUps: number;
  contactsLast30Days: number;
}

export interface DataQualityReportDto {
  totalGuests: number;
  issues: DataQualityIssueDto[];
}

export interface DataQualityIssueDto {
  key: string;
  label: string;
  count: number;
}

export interface ContactsBreakdownReportDto {
  from: string;
  to: string;
  totalContacts: number;
  byType: BreakdownSliceDto[];
  byOutcome: BreakdownSliceDto[];
}

export interface DialogTrendPointDto {
  year: number;
  month: number;
  averageTotal: number;
  assessments: number;
}

export interface ExportHistoryItemDto {
  id: string;
  exportedAt: string;
  exportedByName: string;
  exportType: string;
  fromDate: string;
  toDate: string;
}

// ---- "Guest Seen" dashboard card ----

export type GuestsSeenPeriod = 'Today' | 'Week' | 'Month' | 'Custom';

export interface GuestsSeenDto {
  period: GuestsSeenPeriod;
  from: string;
  to: string;
  distinctGuestsSeen: number;
  totalContacts: number;
  series: GuestsSeenPointDto[];
}

export interface GuestsSeenPointDto {
  date: string;
  guestsSeen: number;
}

// ---- Pathway allocation (register flow step 3) ----

export interface AllocateGuestRequest {
  pathway: GuestPathway;
  afaSupportNeeded: boolean;
  assignedCmhwId?: string | null;
}

// ---- Document management ----

export type DocumentStatus = 'Draft' | 'Active' | 'Archived';

export type DocumentStorageProvider = 'Local' | 'AwsS3' | 'S3Compatible' | 'AzureBlob' | 'GoogleCloudStorage';

export interface DocumentListItemDto {
  id: string;
  guestId: string | null;
  /** Set when the file was attached to a casework note. */
  caseworkNoteId: string | null;
  guestName: string | null;
  guestNumber: number | null;
  title: string;
  category: string;
  tags: string | null;
  status: DocumentStatus;
  currentVersionNumber: number;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  updatedAt: string;
  createdByName: string;
  retainUntil: string | null;
  /** Set while the document is checked out (locked for editing) by that staff member. */
  checkedOutByName: string | null;
  isDeleted: boolean;
  deletedAt: string | null;
  deletedByName: string | null;
}

export interface DocumentVersionDto {
  id: string;
  versionNumber: number;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  /** SHA-256 recorded at upload; the download response echoes it in X-Document-Sha256. */
  sha256: string;
  changeNote: string | null;
  uploadedByName: string;
  uploadedAt: string;
  storageProvider: DocumentStorageProvider;
  isCurrent: boolean;
}

export interface DocumentDetailDto {
  id: string;
  guestId: string | null;
  guestName: string | null;
  guestNumber: number | null;
  title: string;
  description: string | null;
  category: string;
  tags: string | null;
  status: DocumentStatus;
  currentVersionNumber: number;
  retainUntil: string | null;
  checkedOutByStaffId: string | null;
  checkedOutByName: string | null;
  checkedOutAt: string | null;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  deletedAt: string | null;
  deletedByName: string | null;
  deleteReason: string | null;
  versions: DocumentVersionDto[];
}

export interface DocumentStatsDto {
  totalDocuments: number;
  activeDocuments: number;
  archivedDocuments: number;
  deletedDocuments: number;
  totalVersions: number;
  totalSizeBytes: number;
  activeStorageProvider: string;
  byCategory: DocumentCategoryCountDto[];
}

export interface DocumentCategoryCountDto {
  category: string;
  count: number;
  sizeBytes: number;
}

export interface UploadDocumentRequest {
  file: File;
  title: string;
  category: string;
  guestId?: string | null;
  description?: string | null;
  tags?: string | null;
  /** yyyy-MM-dd; defaults from the retention setting when omitted. */
  retainUntil?: string | null;
  /** Attach to a draft casework note (the note's guest becomes the document's guest). */
  caseworkNoteId?: string | null;
}

export interface UpdateDocumentRequest {
  title: string;
  description?: string | null;
  category: string;
  tags?: string | null;
  status: DocumentStatus;
  retainUntil?: string | null;
}

// ---- Settings ----

export type SettingKind = 'Text' | 'Number' | 'Boolean' | 'Select' | 'Secret' | 'MultilineText';

export interface SettingOption {
  value: string;
  label: string;
}

export interface SettingFieldDto {
  key: string;
  section: string;
  label: string;
  description: string | null;
  kind: SettingKind;
  /** Null for secrets — they are never sent to the browser; use hasValue instead. */
  value: string | null;
  default: string | null;
  isSecret: boolean;
  hasValue: boolean;
  options: SettingOption[] | null;
  /** Show this field only when the field named here holds one of visibleWhenValues. */
  visibleWhenKey: string | null;
  visibleWhenValues: string[] | null;
}

export interface SettingsSectionDto {
  section: string;
  fields: SettingFieldDto[];
}

export interface StorageTestResultDto {
  success: boolean;
  message: string;
}

/** Non-secret settings the SPA reads at startup, keyed by setting key. */
export type PublicSettings = Record<string, string | null>;

// ---- Lookups ----

export interface LookupItemDto {
  id: string;
  category: string;
  code: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
  /** Built-in options can be relabelled or deactivated, never deleted. */
  isSystem: boolean;
}

export interface CreateLookupRequest {
  category: string;
  code: string;
  label: string;
  sortOrder: number;
}

export interface UpdateLookupRequest {
  label: string;
  sortOrder: number;
  isActive: boolean;
}

// ---- Email templates ----

export interface EmailTemplateDto {
  key: string;
  name: string;
  description: string;
  subject: string;
  htmlBody: string;
  textBody: string | null;
  /** Disabled templates are skipped by their trigger; the underlying action still succeeds. */
  isEnabled: boolean;
  updatedAt: string;
  /** Placeholder names usable as {{token}} in the subject and body. */
  tokens: string[];
}

export interface UpdateEmailTemplateRequest {
  subject: string;
  htmlBody: string;
  textBody?: string | null;
  isEnabled: boolean;
}

export interface EmailPreviewDto {
  subject: string;
  htmlBody: string;
  textBody: string;
}

export interface EmailTestResultDto {
  success: boolean;
  message: string;
}

// ---- Custom fields ----

/** Forms that accept admin-defined extra fields (clinical instruments are deliberately excluded). */
export type CustomFieldEntityType = 'Guest' | 'Document' | 'Contact' | 'FollowUp' | 'GuestAction';

export type CustomFieldType = 'Text' | 'MultilineText' | 'Number' | 'Date' | 'Boolean' | 'Select' | 'MultiSelect';

export interface CustomFieldDefinitionDto {
  id: string;
  entityType: CustomFieldEntityType;
  /** Stable slug; assigned on creation and never edited. */
  key: string;
  label: string;
  fieldType: CustomFieldType;
  options: string[];
  helpText: string | null;
  isRequired: boolean;
  sortOrder: number;
  isActive: boolean;
  /** Records already holding a value — a field with answers can only be deactivated, not deleted. */
  valueCount: number;
}

/** A definition plus this record's answer, ready to render one control. */
export interface CustomFieldValueDto {
  definitionId: string;
  key: string;
  label: string;
  fieldType: CustomFieldType;
  options: string[];
  helpText: string | null;
  isRequired: boolean;
  sortOrder: number;
  text: string | null;
  number: number | null;
  date: string | null;
  boolean: boolean | null;
}

/** MultiSelect selections travel newline-separated in `text`. */
export interface CustomFieldEntry {
  definitionId: string;
  text?: string | null;
  number?: number | null;
  date?: string | null;
  boolean?: boolean | null;
}

export interface CreateCustomFieldRequest {
  entityType: CustomFieldEntityType;
  label: string;
  fieldType: CustomFieldType;
  options?: string[] | null;
  helpText?: string | null;
  isRequired: boolean;
}

export interface UpdateCustomFieldRequest {
  label: string;
  fieldType: CustomFieldType;
  options?: string[] | null;
  helpText?: string | null;
  isRequired: boolean;
  sortOrder: number;
  isActive: boolean;
}

export interface DeleteCustomFieldResult {
  /** False when the field was deactivated instead because it already holds answers. */
  deleted: boolean;
  message: string;
}

// ---- Caseload allocation history (spec §4.4) ----

export interface CaseloadAssignmentDto {
  id: string;
  fromStaffName: string | null;
  toStaffName: string | null;
  reason: string | null;
  recordedByName: string;
  recordedAt: string;
}

export interface ReassignGuestRequest {
  assignedCmhwId?: string | null;
  reason?: string | null;
}

// ---- Legacy data migration (spec §7) ----

export interface ImportRowError {
  rowNumber: number;
  column: string;
  message: string;
}

export interface ImportResultDto {
  dryRun: boolean;
  rowsRead: number;
  guestsCreated: number;
  guestsUpdated: number;
  notesCreated: number;
  dialogAssessmentsCreated: number;
  errors: ImportRowError[];
  succeeded: boolean;
}

// ---- Guest Report "Additional filters" ----

/** Age bands offered by the Guest Report filter drawer; mapped to ageMin/ageMax on the query. */
export const AGE_BANDS = [
  { label: 'Under 18', ageMin: undefined, ageMax: 17 },
  { label: '18–24', ageMin: 18, ageMax: 24 },
  { label: '25–34', ageMin: 25, ageMax: 34 },
  { label: '35–44', ageMin: 35, ageMax: 44 },
  { label: '45–54', ageMin: 45, ageMax: 54 },
  { label: '55–64', ageMin: 55, ageMax: 64 },
  { label: '65 and over', ageMin: 65, ageMax: undefined },
] as const;

export type AgeBandLabel = (typeof AGE_BANDS)[number]['label'];

// ---- Care plan (guest workspace tab) ----

export type CarePlanStatus = 'Active' | 'Completed' | 'Superseded';
export type CarePlanGoalStatus = 'NotStarted' | 'InProgress' | 'Achieved' | 'Discontinued';

export interface CarePlanGoalDto {
  id: string;
  description: string;
  status: CarePlanGoalStatus;
  targetDate: string | null;
  progressNote: string | null;
  sortOrder: number;
}

export interface CarePlanDto {
  id: string;
  guestId: string;
  status: CarePlanStatus;
  summary: string | null;
  /** What the guest said they want out of the support. */
  guestVoice: string | null;
  supportArrangements: string | null;
  startedOn: string;
  reviewDueOn: string | null;
  closedOn: string | null;
  isReviewOverdue: boolean;
  createdByName: string;
  updatedAt: string;
  goals: CarePlanGoalDto[];
}

/** The active plan plus closed ones as history; `current` is null before a plan exists. */
export interface GuestCarePlansDto {
  current: CarePlanDto | null;
  history: CarePlanDto[];
}

/** Omit `id` for a new goal; goals left out of the list are removed. */
export interface CarePlanGoalInput {
  id?: string | null;
  description: string;
  status: CarePlanGoalStatus;
  targetDate?: string | null;
  progressNote?: string | null;
}

export interface SaveCarePlanRequest {
  summary?: string | null;
  guestVoice?: string | null;
  supportArrangements?: string | null;
  reviewDueOn?: string | null;
  goals: CarePlanGoalInput[];
}

// ---- Dashboard demographics + data quality cards ----

export interface DemographicSliceDto {
  label: string;
  count: number;
  percentage: number;
}

export interface GuestDemographicsBreakdownDto {
  ethnicity: DemographicSliceDto[];
  ageGroups: DemographicSliceDto[];
  gender: DemographicSliceDto[];
  countryOfOrigin: DemographicSliceDto[];
}

export interface DataQualityIssueTileDto {
  key: string;
  label: string;
  count: number;
}

// ---- Hub-wide contact history (GET /contacts) ----

/** One row of the Contact History screen — a contact logged against any guest in the hub. */
export interface ContactHistoryRowDto {
  id: string;
  guestId: string;
  guestNumber: number;
  guestName: string;
  guestStatus: GuestStatus;
  type: string;
  outcome: string;
  occurredAt: string;
  notes: string | null;
  createdByStaffId: string;
  createdByName: string;
  assignedCmhwName: string | null;
}

/** One row of the Contact History screen (Desktop 89): a guest and their contact counts by type. */
export interface ContactsByGuestRowDto {
  guestId: string;
  guestNumber: number;
  guestName: string;
  guestStatus: GuestStatus;
  pathway: GuestPathway | null;
  assignedCmhwName: string | null;
  totalContacts: number;
  caseworkCount: number;
  activityCount: number;
  hospitalityCount: number;
  afaCount: number;
  /** CPN work is counted apart from the contact types above: sessions, plus the Part 1 assessment. */
  cpnSessionCount: number;
  cpnAssessmentCount: number;
  lastContactAt: string | null;
}

/**
 * The Contact History screen's stat tiles, over the same caseload scope as the list. The CPN
 * figures feed their own section — they are never part of `afaAndHospitality`.
 */
export interface ContactHistorySummaryDto {
  totalContacts: number;
  casework: number;
  activity: number;
  afaAndHospitality: number;
  afa: number;
  hospitality: number;
  cpnSessions: number;
  cpnAssessments: number;
  /** Distinct guests with a CPN session or initial assessment in the period. */
  cpnGuests: number;
  guestsWithContacts: number;
}

// ---- MDT queue (Hub Manager) and CPN record ----

export type MdtQueueKind = 'CpnReferral' | 'InitialReview' | 'DiscussionRequest';
export type MdtQueueStatus = 'Pending' | 'Confirmed' | 'Declined' | 'Discussed';

export interface MdtQueueItemDto {
  id: string;
  guestId: string;
  guestNumber: number;
  guestName: string;
  guestStatus: GuestStatus;
  pathway: GuestPathway | null;
  assignedCmhwName: string | null;
  kind: MdtQueueKind;
  status: MdtQueueStatus;
  reason: string;
  details: string | null;
  urgency: string | null;
  requestedByName: string;
  requestedAt: string;
  reviewedByName: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  assignedCpnName: string | null;
  declineReason: string | null;
}

export interface MdtQueueDto {
  pending: MdtQueueItemDto[];
  reviewed: MdtQueueItemDto[];
}

export interface CpnSessionSummaryDto {
  noteId: string;
  occurredAt: string;
  contactMethod: string;
  sessionType: CpnSessionType | null;
  sessionNumber: number | null;
  authorName: string;
  riskLevel: string;
  assessment: string | null;
}

/** GET /guests/{id}/cpn-record — the workspace "CPN Record" tab. */
export interface GuestCpnRecordDto {
  referral: MdtQueueItemDto | null;
  cpnInvolved: boolean;
  assignedCpnName: string | null;
  hasInitialAssessment: boolean;
  firstCpnContactAt: string | null;
  sessions: CpnSessionSummaryDto[];
}

// ---- "CPN Activity" report ----

export interface CpnCaseloadRowDto {
  guestId: string;
  guestNumber: number;
  guestName: string;
  guestStatus: GuestStatus;
  pathway: GuestPathway | null;
  assignedCmhwName: string | null;
  cpnName: string | null;
  dateOfReferral: string | null;
  confirmedAt: string | null;
  cpnSessions: number;
  lastCpnContactAt: string | null;
  nextContactDue: string | null;
}

export interface CpnActivityReportDto {
  from: string;
  to: string;
  guestsSeenByCpn: number;
  activeCpnCaseload: number;
  newCpnReferrals: number;
  referralsConfirmedAtMdt: number;
  referralsDeclinedAtMdt: number;
  referralsPendingReview: number;
  avgDaysReferralToContact: number | null;
  cpnContactsInRange: number;
  caseload: CpnCaseloadRowDto[];
}

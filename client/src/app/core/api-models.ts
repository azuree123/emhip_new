// Mirrors the DTOs in src/Emhip.Application/**/Dtos and src/Emhip.Api/Controllers/**.
// Keep field names/casing exactly in sync with the C# records (System.Text.Json's default
// camelCase output).

export type GuestStatus = 'Active' | 'PendingConversation' | 'Inactive' | 'Urgent';
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
  /** Due date (yyyy-MM-dd) of the next scheduled follow-up, or null. */
  nextContactDue: string | null;
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
  assignedCmhwName: string | null;
  registeredAt: string;
  hasActiveRiskFlags: boolean;
  openFollowUpCount: number;
  pathway: GuestPathway | null;
  afaSupportNeeded: boolean;
  referralSource: string | null;
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

export interface GuestPathwayDto {
  guestId: string;
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
  description: string;
  actorName: string;
  occurredAt: string;
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
}

export interface PathwayCategoryTotalDto {
  category: string;
  count: number;
  percentage: number;
}

export interface PathwayReportDto {
  from: string;
  to: string;
  categoryTotals: PathwayCategoryTotalDto[];
  totalReferrals: number;
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

export interface RecordInitialConversationRequest {
  presentingIssues?: string | null;
  notes?: string | null;
  consentConfirmed: boolean;
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

export type GuestsSeenPeriod = 'Today' | 'Week' | 'Month';

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

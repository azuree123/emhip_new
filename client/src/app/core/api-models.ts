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

export interface KeysetPage<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface GuestListItemDto {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  status: GuestStatus;
  assignedCmhwName: string | null;
  registeredAt: string;
  lastContactAt: string | null;
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

export interface GuestOverviewDto {
  id: string;
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
  dueDate: string;
  status: string;
  assigneeName: string;
  isOverdue: boolean;
}

export interface UrgentCaseDto {
  guestId: string;
  guestName: string;
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
  pathwayDistribution: PathwayDistributionDto[];
  monthlyStats: MonthlyStatDto[];
  recentActivity: RecentActivityDto[];
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

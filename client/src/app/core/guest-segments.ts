import { CLINICAL_PATHWAY_OPTIONS } from './demographic-options';

// Mirrors Emhip.Application.Guests.GuestSegments — the named guest-list filters behind the
// dashboard and report counts (GET /guests?segment=…). Clicking a count opens /guests with the
// segment key, and the list shows the label below as the active drill-through.

export const GuestSegments = {
  Smi: 'smi',
  OnMedication: 'onMedication',
  TrustInvolvement: 'trustInvolvement',
  CpnInvolved: 'cpnInvolved',
  CpnAssessment: 'cpnAssessment',
  CpnSessions30: 'cpnSessions30',
  CpnReferrals30: 'cpnReferrals30',
  CpnAny: 'cpnAny',
  MissingPathway: 'missingPathway',
  MissingInitialConversation: 'missingInitialConversation',
  MissingDialogBaseline: 'missingDialogBaseline',
  MissingDemographics: 'missingDemographics',
  MissingCmhw: 'missingCmhw',
  MissingReferralSource: 'missingReferralSource',
  NoRecentContact: 'noRecentContact',
  AutoInactive: 'autoOnHold',
  PastRetention: 'pastRetention',
  // Reports screen KPIs; the "…InPeriod" ones take the reporting period as periodFrom / periodTo.
  AfaSupport: 'afaSupport',
  ContactInPeriod: 'contactInPeriod',
  DialogBaselineInPeriod: 'dialogBaselineInPeriod',
  DialogReassessedInPeriod: 'dialogReassessedInPeriod',
  DialogAwaitingReassessment: 'dialogAwaitingReassessment',
  CpnSeenInPeriod: 'cpnSeenInPeriod',
  CpnCaseload: 'cpnCaseload',
  CpnReferredInPeriod: 'cpnReferredInPeriod',
  CpnConfirmedInPeriod: 'cpnConfirmedInPeriod',
  CpnDeclinedInPeriod: 'cpnDeclinedInPeriod',
  CpnPendingInPeriod: 'cpnPendingInPeriod',
} as const;

export type GuestSegment = (typeof GuestSegments)[keyof typeof GuestSegments];

const SEGMENT_LABELS: Record<GuestSegment, string> = {
  smi: 'SMI recorded',
  onMedication: 'On medication',
  trustInvolvement: 'Trust involvement',
  cpnInvolved: 'CPN involved',
  cpnAssessment: 'CPN initial assessment completed',
  cpnSessions30: 'CPN sessions in the last 30 days',
  cpnReferrals30: 'Referred to CPN in the last 30 days',
  cpnAny: 'CPN involvement',
  missingPathway: 'Missing pathway classification',
  missingInitialConversation: 'Initial conversation not completed',
  missingDialogBaseline: 'Missing DIALOG baseline score',
  missingDemographics: 'No demographics recorded',
  missingCmhw: 'No CMHW assigned',
  missingReferralSource: 'No referral source recorded',
  noRecentContact: 'Active, but no contact in the last 90 days',
  autoOnHold: 'Automatically moved to Inactive',
  pastRetention: 'Due for retention review',
  afaSupport: 'AFA support needed',
  contactInPeriod: 'Contact recorded',
  dialogBaselineInPeriod: 'DIALOG baseline recorded',
  dialogReassessedInPeriod: 'DIALOG reassessment recorded',
  dialogAwaitingReassessment: 'DIALOG baseline, no reassessment yet',
  cpnSeenInPeriod: 'Seen by the CPN',
  cpnCaseload: 'On the CPN caseload',
  cpnReferredInPeriod: 'Referred to the CPN',
  cpnConfirmedInPeriod: 'CPN referral confirmed at MDT',
  cpnDeclinedInPeriod: 'CPN referral declined at MDT',
  cpnPendingInPeriod: 'CPN referral pending MDT review',
};

export function isGuestSegment(value: string | null | undefined): value is GuestSegment {
  return !!value && value in SEGMENT_LABELS;
}

export function guestSegmentLabel(segment: GuestSegment): string {
  return SEGMENT_LABELS[segment];
}

/**
 * The dashboard's Clinical complexity tiles carry only their label (from the API), so map each
 * label to the segment behind it. Unknown labels are simply not clickable.
 */
export function segmentForClinicalIndicator(label: string): GuestSegment | null {
  switch (label.trim().toLowerCase()) {
    case 'smi':
      return GuestSegments.Smi;
    case 'on medication':
      return GuestSegments.OnMedication;
    case 'trust involvement':
      return GuestSegments.TrustInvolvement;
    case 'cpn involvement':
    case 'cpn involvement today':
      return GuestSegments.CpnInvolved;
    default:
      return null;
  }
}

/** Pathway distribution label ("Clinical Support") → the clinicalPathway value. */
export function clinicalPathwayFromLabel(label: string): string | null {
  return CLINICAL_PATHWAY_OPTIONS.find((p) => p.label.toLowerCase() === label.trim().toLowerCase())?.value ?? null;
}

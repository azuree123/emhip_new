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

/** Clinical pathways (Guest.pathway) as the dashboard labels them — "Mental Wellbeing" etc. */
export const CLINICAL_PATHWAYS: { value: 'MentalWellbeing' | 'ClinicalSupport' | 'CommunityRecovery'; label: string }[] = [
  { value: 'MentalWellbeing', label: 'Mental Wellbeing' },
  { value: 'ClinicalSupport', label: 'Clinical Support' },
  { value: 'CommunityRecovery', label: 'Community Recovery' },
];

export function clinicalPathwayFromLabel(label: string): string | null {
  return CLINICAL_PATHWAYS.find((p) => p.label.toLowerCase() === label.trim().toLowerCase())?.value ?? null;
}

export function clinicalPathwayLabel(value: string): string {
  return CLINICAL_PATHWAYS.find((p) => p.value === value)?.label ?? value;
}

import { GuestPathway } from './api-models';

/**
 * Fixed option lists shared by the registration form and the workspace Demographics tab, so a
 * value chosen at reception and one chosen later by the CMHW come from the same vocabulary.
 * Lookup-backed categories (ethnicity, gender, country of origin, marital status, living
 * group) come from Settings → Lookups; these are the fallbacks and the non-lookup lists.
 */
export const GENDER_OPTIONS = ['Male', 'Female', 'Non-binary', 'Prefer not to say', 'Other'];

export const ETHNICITY_OPTIONS = [
  'Black African',
  'Black Caribbean',
  'Black British',
  'White British',
  'White Irish',
  'White Other',
  'Asian Indian',
  'Asian Pakistani',
  'Asian Bangladeshi',
  'Asian Chinese',
  'Asian Other',
  'Mixed White & Black Caribbean',
  'Mixed White & Black African',
  'Mixed Other',
  'Arab',
  'Other',
  'Prefer not to say',
];

export const HOUSING_STATUS_OPTIONS = [
  'Private Rented',
  'Social Housing',
  'Owner Occupier',
  'Temporary Accommodation',
  'Homeless / No Fixed Abode',
  'Living with Family/Friends',
  'Other',
];

export const EMPLOYMENT_STATUS_OPTIONS = [
  'Employed Full-time',
  'Employed part-time',
  'Self-employed',
  'Unemployed',
  'Student',
  'Retired',
  'Unable to Work',
];

/**
 * The three clinical pathways — the only pathways in EMHIP — by the names the service uses
 * everywhere. Mirrors Emhip.Application.Guests.GuestPathwayLabels on the server.
 */
export const CLINICAL_PATHWAY_OPTIONS: { value: GuestPathway; label: string }[] = [
  { value: 'MentalWellbeing', label: 'Mental Wellbeing' },
  { value: 'ClinicalSupport', label: 'Clinical Support' },
  { value: 'CommunityRecovery', label: 'Community Recovery' },
];

export function clinicalPathwayLabel(pathway: string | null | undefined): string {
  if (!pathway) return '—';
  return CLINICAL_PATHWAY_OPTIONS.find((o) => o.value === pathway)?.label ?? pathway;
}

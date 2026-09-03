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

/** Practical-support referral categories (PathwayCategory) with their display labels. */
export const PATHWAY_CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: 'HousingAdvice', label: 'Housing Advice' },
  { value: 'EmploymentSupport', label: 'Employment Support' },
  { value: 'BenefitsFinancialSupport', label: 'Benefits & Financial Support' },
  { value: 'FoodEssentials', label: 'Food Essentials' },
  { value: 'ImmigrationLegalAdvice', label: 'Immigration & Legal Advice' },
  { value: 'OtherPracticalAdvice', label: 'Other Practical Advice' },
];

/** "HousingAdvice" → "Housing Advice", using the curated label when there is one. */
export function pathwayCategoryLabel(category: string | null | undefined): string {
  if (!category) return '—';
  const curated = PATHWAY_CATEGORY_OPTIONS.find((o) => o.value === category);
  return curated ? curated.label : category.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
}

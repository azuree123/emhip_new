import { GuestStatus } from '../../core/api-models';

/**
 * Display metadata (label + chart color) for each PathwayCategory enum value.
 * The three brand colors (maroon/coral/gold) are lifted verbatim from the
 * "Pathway distribution" card in the source Figma export (Desktop72, around
 * lines 74000-74400 of project/screens/Components.bundle.js); the remaining
 * three extend the same palette with the secondary-*-700 tones defined in
 * project/screens/fig-tokens.css, since the source mockup only drew three
 * sample rows but our real data has six pathway categories.
 */
export const CATEGORY_META: Record<string, { label: string; color: string }> = {
  HousingAdvice: { label: 'Housing Advice', color: 'rgb(148, 28, 60)' },
  EmploymentSupport: { label: 'Employment Support', color: 'rgb(235, 60, 44)' },
  BenefitsFinancialSupport: { label: 'Benefits & Financial Support', color: 'rgb(201, 167, 35)' },
  FoodEssentials: { label: 'Food & Essentials', color: 'rgb(15, 118, 110)' },
  ImmigrationLegalAdvice: { label: 'Immigration & Legal Advice', color: 'rgb(29, 78, 216)' },
  OtherPracticalAdvice: { label: 'Other Practical Advice', color: 'rgb(109, 40, 217)' },
};

export function pathwayCategoryLabel(category: string | null): string {
  if (!category) return '—';
  return CATEGORY_META[category]?.label ?? category;
}

/** Status pill label + modifier class, colors per the design's pill family (Desktop66). */
export const STATUS_META: Record<GuestStatus, { label: string; pillClass: string }> = {
  Active: { label: 'Active', pillClass: 'status-pill--active' },
  PendingConversation: { label: 'Pending conversation', pillClass: 'status-pill--pending' },
  Inactive: { label: 'Inactive', pillClass: 'status-pill--inactive' },
  Urgent: { label: 'Urgent', pillClass: 'status-pill--urgent' },
};

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** "08 May" style short day used in the design's table rows (Desktop66/68/69). */
export function shortDay(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

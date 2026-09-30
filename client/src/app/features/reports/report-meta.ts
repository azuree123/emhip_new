import { GuestPathway, GuestStatus } from '../../core/api-models';
import { DemographicFilterValue } from '../../shared/demographic-filters.component';

/**
 * Display metadata (label + chart color) for the three clinical pathways — the only
 * pathways. Colors are the "Pathway distribution" card's coral / gold / maroon from the
 * source Figma export (Desktop72), the same order the Hub Manager dashboard uses.
 */
export const PATHWAY_META: Record<GuestPathway, { label: string; color: string }> = {
  MentalWellbeing: { label: 'Mental Wellbeing', color: 'rgb(235, 60, 44)' },
  ClinicalSupport: { label: 'Clinical Support', color: 'rgb(201, 167, 35)' },
  CommunityRecovery: { label: 'Community Recovery', color: 'rgb(148, 28, 60)' },
};

export function pathwayLabel(pathway: string | null): string {
  if (!pathway) return '—';
  return PATHWAY_META[pathway as GuestPathway]?.label ?? pathway;
}

/**
 * Engagement-status pill label + modifier class (spec §4.7), colors per the design's
 * pill family (Desktop66). Urgency is a separate flag (GuestListItemDto.isUrgent), not
 * a status — it renders as its own `status-pill--urgent` badge beside these pills.
 * The OnHold status is displayed as "Inactive" (customer terminology); the enum value
 * and API contract are unchanged.
 */
export const STATUS_META: Record<GuestStatus, { label: string; pillClass: string }> = {
  New: { label: 'New', pillClass: 'status-pill--new' },
  Active: { label: 'Active', pillClass: 'status-pill--active' },
  OnHold: { label: 'Inactive', pillClass: 'status-pill--onhold' },
};

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * The worksheets in the Excel workbook returned by ReportsApiService.exportWorkbook, in order —
 * kept in step with ExcelWorkbookBuilder. Demographics and referral sources are on every export.
 */
export const WORKBOOK_SHEETS = [
  'Summary',
  'Demographics',
  'Referral sources',
  'Pathways',
  'Caseload',
  'DIALOG outcomes',
  'Data quality',
];

/**
 * "Black African · 18–24 · Female · Somalia" — the active demographic cohort as one line, in
 * the drawer's field order; "All guests" when nothing is filtered. The server labels the Excel
 * DIALOG outcomes sheet the same way (ReportCohortFilter.Describe).
 */
export function cohortLabel(value: DemographicFilterValue): string {
  const parts = [value.ethnicity, value.ageBand, value.gender, value.countryOfOrigin].filter((p) => !!p);
  return parts.length ? parts.join(' · ') : 'All guests';
}

/** Saves an export Blob under `filename` — shared by the header actions and the export dialog. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

/** "08 May" style short day used in the design's table rows (Desktop66/68/69). */
export function shortDay(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

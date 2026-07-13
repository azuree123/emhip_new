import { GuestStatus } from '../../core/api-models';

/** Display label + chip colors for a GuestStatus, matching the status-pill styling in
 *  GuestOverviewTab (project/screens/Components.bundle.js) — green/gold/grey/red pills. */
export interface StatusChip {
  label: string;
  bg: string;
  fg: string;
}

const STATUS_CHIPS: Record<GuestStatus, StatusChip> = {
  Active: { label: 'Active', bg: '#eafdee', fg: '#147129' },
  PendingConversation: { label: 'Pending conversation', bg: '#fff9e4', fg: '#9d852d' },
  Inactive: { label: 'Inactive', bg: '#f0f0f0', fg: '#646464' },
  Urgent: { label: 'Urgent', bg: '#ffeaec', fg: '#e12628' },
};

export function statusChip(status: GuestStatus | string): StatusChip {
  return STATUS_CHIPS[status as GuestStatus] ?? { label: status, bg: '#f0f0f0', fg: '#646464' };
}

/** Initials for the avatar circle, e.g. "Amara Asante" -> "AA". */
export function initials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function daysSince(value: string | null | undefined): number | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const diffMs = Date.now() - date.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

/** Human label for the enum-ish string fields the API sends (e.g. "PhoneCall" -> "Phone call"). */
export function humanize(value: string | null | undefined): string {
  if (!value) return '—';
  return value.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase());
}

const OUTCOME_CHIPS: Record<string, StatusChip> = {
  Successful: { label: 'Successful', bg: '#eafdee', fg: '#147129' },
  NoAnswer: { label: 'No answer', bg: '#f0f0f0', fg: '#646464' },
  LeftMessage: { label: 'Left message', bg: '#fff9e4', fg: '#9d852d' },
  Declined: { label: 'Declined', bg: '#ffeaec', fg: '#e12628' },
  Rescheduled: { label: 'Rescheduled', bg: '#fff9e4', fg: '#9d852d' },
};

export function outcomeChip(outcome: string): StatusChip {
  return OUTCOME_CHIPS[outcome] ?? { label: humanize(outcome), bg: '#f0f0f0', fg: '#646464' };
}

const NOTE_COLOR_DOTS: Record<string, string> = {
  Yellow: '#e6c229',
  Green: '#3fa34d',
  Orange: '#e08a2b',
  Purple: '#8a5fd6',
};

export function noteColorDot(color: string): string {
  return NOTE_COLOR_DOTS[color] ?? '#bcb7b7';
}

const FOLLOWUP_STATUS_CHIPS: Record<string, StatusChip> = {
  Scheduled: { label: 'Scheduled', bg: '#fff9e4', fg: '#9d852d' },
  Completed: { label: 'Completed', bg: '#eafdee', fg: '#147129' },
  Overdue: { label: 'Overdue', bg: '#ffeaec', fg: '#e12628' },
  Cancelled: { label: 'Cancelled', bg: '#f0f0f0', fg: '#646464' },
};

export function followUpStatusChip(status: string): StatusChip {
  return FOLLOWUP_STATUS_CHIPS[status] ?? { label: humanize(status), bg: '#f0f0f0', fg: '#646464' };
}

const PATHWAY_STATUS_CHIPS: Record<string, StatusChip> = {
  Referred: { label: 'Referred', bg: '#fff9e4', fg: '#9d852d' },
  InProgress: { label: 'In progress', bg: '#eafdee', fg: '#147129' },
  Completed: { label: 'Completed', bg: '#f0f0f0', fg: '#646464' },
  Declined: { label: 'Declined', bg: '#ffeaec', fg: '#e12628' },
};

export function pathwayStatusChip(status: string): StatusChip {
  return PATHWAY_STATUS_CHIPS[status] ?? { label: humanize(status), bg: '#f0f0f0', fg: '#646464' };
}

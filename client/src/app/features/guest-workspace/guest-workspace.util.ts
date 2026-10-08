import { CaseworkNoteCategory, GuestPathway, GuestStatus } from '../../core/api-models';

/** Display label + chip colors for a GuestStatus, matching the status-pill styling in
 *  GuestOverviewTab (project/screens/Components.bundle.js) — green/gold/grey/red pills. */
export interface StatusChip {
  label: string;
  bg: string;
  fg: string;
}

/** Engagement status only (spec §4.7). Urgency is a separate flag with its own badge — it is
 *  deliberately absent here so an urgent guest still shows how engaged they are. "On hold" is
 *  set automatically once a guest has had no activity for three months. */
const STATUS_CHIPS: Record<GuestStatus, StatusChip> = {
  New: { label: 'New', bg: '#fff9e4', fg: '#9d852d' },
  Active: { label: 'Active', bg: '#eafdee', fg: '#147129' },
  OnHold: { label: 'Inactive', bg: '#f0f0f0', fg: '#646464' },
};

export function statusChip(status: GuestStatus | string): StatusChip {
  return STATUS_CHIPS[status as GuestStatus] ?? { label: humanize(status), bg: '#f0f0f0', fg: '#646464' };
}

/** Red "Urgent" badge shown *beside* the status pill while GuestOverviewDto.isUrgent is true. */
export function urgentChip(since: string | null | undefined): StatusChip {
  const from = since ? formatDate(since) : null;
  return { label: from && from !== '—' ? `Urgent since ${from}` : 'Urgent', bg: '#ffeaec', fg: '#e12628' };
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

/** Display labels for the guest's pathway — the service's names for its three pathways, the
 *  same on every screen (the header chip, Overview, Pathway History, lists and reports). */
const GUEST_PATHWAY_LABELS: Record<GuestPathway, string> = {
  MentalWellbeing: 'Mental Wellbeing',
  ClinicalSupport: 'Clinical Support',
  CommunityRecovery: 'Community Recovery',
};

export function guestPathwayLabel(pathway: GuestPathway | string | null | undefined): string | null {
  if (!pathway) return null;
  return GUEST_PATHWAY_LABELS[pathway as GuestPathway] ?? humanize(pathway);
}

/** Gold pill used for the pathway chip beside the status chip in the identity header. */
export function guestPathwayChip(pathway: GuestPathway | string | null | undefined): StatusChip | null {
  const label = guestPathwayLabel(pathway);
  return label ? { label, bg: '#fff9e4', fg: '#9d852d' } : null;
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

/**
 * The contact type a worker chose on Add Contact, as a chip — the same colours as the count chips
 * on the Contact History screen. The type leads wherever a contact is listed; the method (phone
 * call, in person, …) is secondary detail. Contacts with no type recorded (imports, Scheduled
 * contacts → Record contact) read "Contact".
 */
const CONTACT_TYPE_CHIPS: Record<CaseworkNoteCategory, StatusChip> = {
  Casework: { label: 'Casework', bg: 'rgb(231, 238, 255)', fg: 'rgb(52, 91, 177)' },
  Activity: { label: 'Activity', bg: 'rgb(234, 253, 238)', fg: 'rgb(20, 113, 41)' },
  Hospitality: { label: 'Hospitality', bg: 'rgb(255, 237, 213)', fg: 'rgb(194, 65, 12)' },
  Afa: { label: 'AFA', bg: 'rgb(255, 249, 228)', fg: 'rgb(157, 133, 45)' },
  Meeting: { label: 'Meeting', bg: '#f0f0f0', fg: '#646464' },
  DailyLog: { label: 'Daily Log', bg: '#f0f0f0', fg: '#646464' },
};
const CPN_CONTACT_CHIP: StatusChip = { label: 'CPN contact', bg: 'rgb(255, 240, 241)', fg: 'rgb(148, 28, 60)' };
const UNTYPED_CONTACT_CHIP: StatusChip = { label: 'Contact', bg: '#f0f0f0', fg: '#646464' };

export function contactTypeChip(contact: { category: CaseworkNoteCategory | null; isCpnContact: boolean }): StatusChip {
  if (contact.isCpnContact) return CPN_CONTACT_CHIP;
  return contact.category ? (CONTACT_TYPE_CHIPS[contact.category] ?? UNTYPED_CONTACT_CHIP) : UNTYPED_CONTACT_CHIP;
}

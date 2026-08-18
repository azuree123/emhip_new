// Formatting/helpers shared by the Document Management screen and its drawers.
// Kept out of the components so the register table, the upload drawer and the detail
// drawer all render sizes/dates/status pills identically.

import { DocumentStatus } from '../../core/api-models';

/** The three DocumentStatus values, in the order they're offered in the dropdowns. */
export const DOCUMENT_STATUSES: DocumentStatus[] = ['Draft', 'Active', 'Archived'];

/** Human labels for DocumentStorageProvider — the stats chip shows the active one. */
const PROVIDER_LABELS: Record<string, string> = {
  Local: 'Local disk',
  AwsS3: 'Amazon S3',
  S3Compatible: 'S3-compatible',
  AzureBlob: 'Azure Blob',
  GoogleCloudStorage: 'Google Cloud Storage',
};

/** "Local" → "Local disk"; unknown values fall back to the raw enum name. */
export function providerLabel(provider: string | null | undefined): string {
  if (!provider) {
    return '—';
  }
  return PROVIDER_LABELS[provider] ?? provider;
}

/**
 * Byte counts as the file manager shows them (1 KB = 1024 B), one decimal place from MB
 * upwards. Used for row sizes, version sizes and the "storage used" KPI tile.
 */
export function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || Number.isNaN(bytes)) {
    return '—';
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  // KB stays whole (a 3-digit "412 KB" reads better than "412.4 KB"); MB and up keep one decimal.
  const rounded = unit === 0 ? Math.round(value).toString() : value.toFixed(1);
  return `${rounded} ${units[unit]}`;
}

/** "17 Aug 2026" — matches the guest data sheet's date column. */
export function formatDate(value: string | null | undefined): string {
  const date = parseDate(value);
  return date ? date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
}

/** "17 Aug 2026, 14:32" — used where the exact moment matters (versions, check-out, deletion). */
export function formatDateTime(value: string | null | undefined): string {
  const date = parseDate(value);
  if (!date) {
    return '—';
  }
  const day = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const time = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return `${day}, ${time}`;
}

/** yyyy-MM-dd for <input type="date"> and the API's retainUntil field. */
export function toIsoDate(value: string | null | undefined): string {
  const date = parseDate(value);
  return date ? date.toISOString().slice(0, 10) : '';
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Lowercase extension without the dot ("report.PDF" → "pdf"); empty when there isn't one. */
export function fileExtension(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  return dot > 0 && dot < fileName.length - 1 ? fileName.slice(dot + 1).toLowerCase() : '';
}

/** "a, b , ,c" → ['a','b','c'] — the API stores tags as one comma-separated string. */
export function splitTags(tags: string | null | undefined): string[] {
  return (tags ?? '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

/**
 * Saves a downloaded Blob under `fileName`. Downloads go through HttpClient (so the JWT is
 * attached), which means the browser never sees a navigable URL — we mint a temporary object
 * URL, click it, and revoke it straight away.
 */
export function saveBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

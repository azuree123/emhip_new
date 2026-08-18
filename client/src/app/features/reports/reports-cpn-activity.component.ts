import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { BreakdownSliceDto, ContactsBreakdownReportDto } from '../../core/api-models';
import { ReportsApiService } from '../../core/reports-api.service';

interface BreakdownRow extends BreakdownSliceDto {
  prettyLabel: string;
  /** Bar length relative to the largest slice (largest slice fills the track). */
  barPct: number;
}

/** "PhoneCall" → "Phone call" for backend enum-name labels; leaves prose alone. */
function prettify(label: string): string {
  if (!/^[A-Z][a-zA-Z]+$/.test(label)) return label;
  const spaced = label.replace(/([a-z])([A-Z])/g, '$1 $2');
  return spaced.charAt(0) + spaced.slice(1).toLowerCase();
}

function toRows(slices: BreakdownSliceDto[]): BreakdownRow[] {
  const sorted = [...slices].sort((a, b) => b.count - a.count);
  const max = sorted[0]?.count ?? 0;
  return sorted.map((s) => ({
    ...s,
    prettyLabel: prettify(s.label),
    barPct: max > 0 ? (s.count / max) * 100 : 0,
  }));
}

/**
 * "CPN Activity" tab — Desktop86 (project/screens/Components.bundle.js lines
 * 54563-57764). Backed by the real contacts-breakdown endpoint, which covers
 * ALL recorded contacts (the API has no CPN-specific tracking), so the cards
 * are captioned "all recorded contacts". The source's CPN referral pipeline
 * (CPN sessions, MDT confirmations, referral→contact lead time) has no data
 * source and is omitted.
 */
@Component({
  selector: 'app-reports-cpn-activity',
  standalone: true,
  templateUrl: './reports-cpn-activity.component.html',
  styleUrl: './reports-cpn-activity.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportsCpnActivityComponent {
  private readonly reportsApi = inject(ReportsApiService);

  readonly from = input.required<string>();
  readonly to = input.required<string>();

  readonly data = signal<ContactsBreakdownReportDto | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly typeRows = computed<BreakdownRow[]>(() => toRows(this.data()?.byType ?? []));
  readonly outcomeRows = computed<BreakdownRow[]>(() => toRows(this.data()?.byOutcome ?? []));
  readonly totalContacts = computed<number | null>(() => this.data()?.totalContacts ?? null);

  /** "Jan – May 2025" style caption for the applied range. */
  readonly rangeLabel = computed<string>(() => {
    const f = new Date(`${this.from()}T00:00:00`);
    const t = new Date(`${this.to()}T00:00:00`);
    const month = (d: Date) => d.toLocaleDateString('en-GB', { month: 'short' });
    return f.getFullYear() === t.getFullYear()
      ? `${month(f)} – ${month(t)} ${t.getFullYear()}`
      : `${month(f)} ${f.getFullYear()} – ${month(t)} ${t.getFullYear()}`;
  });

  constructor() {
    // Reload whenever the shell's applied From/To range changes.
    effect(() => {
      const from = this.from();
      const to = this.to();
      this.load(from, to);
    });
  }

  private load(from: string, to: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.reportsApi.getContactsBreakdown(from, to).subscribe({
      next: (data) => {
        this.data.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.data.set(null);
        this.error.set(err?.message ?? 'Unable to load contact activity.');
        this.loading.set(false);
      },
    });
  }
}

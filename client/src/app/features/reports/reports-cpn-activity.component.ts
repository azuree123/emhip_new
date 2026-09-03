import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CpnActivityReportDto, CpnCaseloadRowDto, GuestStatus } from '../../core/api-models';
import { ReportsApiService } from '../../core/reports-api.service';
import { guestPathwayLabel } from '../guest-workspace/guest-workspace.util';
import { STATUS_META, shortDay } from './report-meta';

/**
 * "CPN Activity" tab — design Desktop 86 ("CPN Activity - Reports Tab"): the KPI tiles (Guests
 * seen by CPN · Active CPN caseload · New CPN referrals · Referrals confirmed at MDT), the CPN
 * referral pipeline (requested → confirmed / declined / pending, and the average days from a
 * confirmed referral to the first CPN contact) and the "Guests currently on CPN caseload" table.
 *
 * Backed by GET /reports/cpn-activity, which reads the MDT queue's CPN referrals, the clinical
 * profile's CPN flag and the CPN-tagged casework notes. Referrals are internal (the design's
 * note) and are not counted in the external referral-source report.
 */
@Component({
  selector: 'app-reports-cpn-activity',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './reports-cpn-activity.component.html',
  styleUrl: './reports-cpn-activity.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportsCpnActivityComponent {
  private readonly reportsApi = inject(ReportsApiService);

  readonly from = input.required<string>();
  readonly to = input.required<string>();

  readonly data = signal<CpnActivityReportDto | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  /** "Jan – May 2025" style caption for the applied range. */
  readonly rangeLabel = computed<string>(() => {
    const f = new Date(`${this.from()}T00:00:00`);
    const t = new Date(`${this.to()}T00:00:00`);
    const fmt = (d: Date) => d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
    const a = fmt(f);
    const b = fmt(t);
    return a === b ? a : `${a} – ${b}`;
  });

  /** Pipeline bars, scaled to the largest stage so the widest bar fills its track. */
  readonly pipeline = computed(() => {
    const d = this.data();
    if (!d) return [];
    const stages = [
      { key: 'requested', label: 'New referrals requested', count: d.newCpnReferrals, tone: 'maroon' },
      { key: 'confirmed', label: 'Confirmed at MDT', count: d.referralsConfirmedAtMdt, tone: 'green' },
      { key: 'declined', label: 'Declined at MDT', count: d.referralsDeclinedAtMdt, tone: 'red' },
      { key: 'pending', label: 'Pending review', count: d.referralsPendingReview, tone: 'gold' },
    ];
    const max = Math.max(1, ...stages.map((s) => s.count));
    return stages.map((s) => ({ ...s, pct: Math.round((s.count / max) * 100) }));
  });

  readonly caseload = computed<CpnCaseloadRowDto[]>(() => this.data()?.caseload ?? []);

  constructor() {
    effect(() => {
      const from = this.from();
      const to = this.to();
      this.load(from, to);
    });
  }

  private load(from: string, to: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.reportsApi.getCpnActivity(from, to).subscribe({
      next: (data) => {
        this.data.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.data.set(null);
        this.error.set(err?.message ?? 'Unable to load CPN activity.');
        this.loading.set(false);
      },
    });
  }

  initials(row: CpnCaseloadRowDto): string {
    const parts = row.guestName.trim().split(/\s+/);
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
  }

  pathwayLabel(row: CpnCaseloadRowDto): string {
    return guestPathwayLabel(row.pathway) ?? '—';
  }

  statusLabel(status: GuestStatus): string {
    return STATUS_META[status]?.label ?? status;
  }

  statusClass(status: GuestStatus): string {
    return STATUS_META[status]?.pillClass ?? 'status-pill--onhold';
  }

  day(value: string | null): string {
    return shortDay(value);
  }

  avgDaysLabel(): string {
    const v = this.data()?.avgDaysReferralToContact;
    return v === null || v === undefined ? '—' : `${v} days`;
  }
}

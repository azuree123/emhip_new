import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { CaseloadReportRowDto } from '../../core/api-models';
import { AuthService } from '../../core/auth.service';
import { Permissions } from '../../core/permissions';
import { ReportPeriod, ReportsApiService } from '../../core/reports-api.service';
import { formatPeriod } from './report-meta';

interface CaseloadRow extends CaseloadReportRowDto {
  initials: string;
  /** Assigned caseload relative to the busiest worker (the design's "Load" bar). */
  loadPct: number;
}

/**
 * "Caseload Reports" tab — Desktop67 (project/screens/Components.bundle.js
 * lines 99305-101566): KPI tiles + "Caseload per CMHW" table with load bars.
 * The source's "Unassigned guests / Require allocation" tile has no field in
 * the caseload DTO, so the fourth tile reports the real overdue-contacts
 * total instead. Each row's "View" opens the Guest Report tab filtered to that
 * CMHW (the design's Desktop69 drill-down, served by the real guest list).
 *
 * A caseload is who is assigned now, so the assigned / active / urgent columns and the first
 * three tiles are current; overdue contacts (due in the period) and contacts recorded follow the
 * reporting period. The assigned / active / urgent counts open that worker's guests in the guest
 * list, as on the dashboard's caseload table; the contact counts have no guest list to open.
 */
@Component({
  selector: 'app-reports-caseload',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './reports-caseload.component.html',
  styleUrl: './reports-caseload.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportsCaseloadComponent {
  private readonly reportsApi = inject(ReportsApiService);

  /** The Reports screen's applied reporting period (yyyy-MM-dd). */
  readonly from = input.required<string>();
  readonly to = input.required<string>();
  readonly periodLabel = computed(() => formatPeriod(this.from(), this.to()));

  /** Counts link to the guest list only for roles that can open it. */
  protected readonly canViewGuests = inject(AuthService).hasPermission(Permissions.Guests.View);

  /** Emits the staffId whose guests should open in the Guest Report tab. */
  readonly viewGuests = output<string>();

  readonly data = signal<CaseloadReportRowDto[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly rows = computed<CaseloadRow[]>(() => {
    const rows = [...this.data()].sort((a, b) => b.assignedGuests - a.assignedGuests);
    const max = rows[0]?.assignedGuests ?? 0;
    return rows.map((r) => ({
      ...r,
      initials: r.displayName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join(''),
      loadPct: max > 0 ? Math.round((r.assignedGuests / max) * 100) : 0,
    }));
  });

  readonly totalStaff = computed<number>(() => this.data().length);

  readonly avgCaseload = computed<string>(() => {
    const rows = this.data();
    if (rows.length === 0) return '—';
    const avg = rows.reduce((sum, r) => sum + r.assignedGuests, 0) / rows.length;
    return avg.toFixed(1);
  });

  readonly highestCaseload = computed<number>(() =>
    this.data().reduce((max, r) => Math.max(max, r.assignedGuests), 0),
  );

  readonly overdueFollowUps = computed<number>(() =>
    this.data().reduce((sum, r) => sum + r.overdueFollowUps, 0),
  );

  constructor() {
    // Reload whenever a new period is applied; the cleanup drops a still-running older request.
    effect((onCleanup) => {
      const period: ReportPeriod = { from: this.from(), to: this.to() };
      const sub = untracked(() => this.load(period));
      onCleanup(() => sub.unsubscribe());
    });
  }

  private load(period: ReportPeriod): Subscription {
    this.loading.set(true);
    this.error.set(null);
    return this.reportsApi.getCaseload(period).subscribe({
      next: (rows) => {
        this.data.set(rows);
        this.loading.set(false);
      },
      error: (err) => {
        this.data.set([]);
        this.error.set(err?.message ?? 'Unable to load caseload data.');
        this.loading.set(false);
      },
    });
  }
}

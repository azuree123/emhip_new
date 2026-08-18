import { ChangeDetectionStrategy, Component, OnInit, computed, inject, output, signal } from '@angular/core';
import { CaseloadReportRowDto } from '../../core/api-models';
import { ReportsApiService } from '../../core/reports-api.service';

interface CaseloadRow extends CaseloadReportRowDto {
  initials: string;
  /** Assigned caseload relative to the busiest worker (the design's "Load" bar). */
  loadPct: number;
}

/**
 * "Caseload Reports" tab — Desktop67 (project/screens/Components.bundle.js
 * lines 99305-101566): KPI tiles + "Caseload per CMHW" table with load bars.
 * The source's "Unassigned guests / Require allocation" tile has no field in
 * the caseload DTO, so the fourth tile reports the real overdue-follow-ups
 * total instead. Each row's "View" opens the Guest Report tab filtered to that
 * CMHW (the design's Desktop69 drill-down, served by the real guest list).
 */
@Component({
  selector: 'app-reports-caseload',
  standalone: true,
  templateUrl: './reports-caseload.component.html',
  styleUrl: './reports-caseload.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportsCaseloadComponent implements OnInit {
  private readonly reportsApi = inject(ReportsApiService);

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

  ngOnInit(): void {
    this.loading.set(true);
    this.error.set(null);
    this.reportsApi.getCaseload().subscribe({
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

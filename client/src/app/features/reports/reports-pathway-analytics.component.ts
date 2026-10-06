import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { GuestPathway, PathwayAnalyticsDto, PathwayAnalyticsRowDto } from '../../core/api-models';
import { AuthService } from '../../core/auth.service';
import { GuestSegments } from '../../core/guest-segments';
import { Permissions } from '../../core/permissions';
import { GuestDrill, registeredDrill } from './report-drill';
import { PATHWAY_META as SHARED_PATHWAY_META, formatPeriod } from './report-meta';
import { ReportPeriod, ReportsApiService } from '../../core/reports-api.service';

/**
 * Labels/colors for the three clinical pathways — the service's names (Mental Wellbeing,
 * Clinical Support, Community Recovery), shared with every other report tab. The source
 * (Desktop45/72) used draft names; the customer confirmed these three.
 */
const PATHWAY_META: Record<GuestPathway, { label: string; color: string }> = SHARED_PATHWAY_META;

interface PathwayRow extends PathwayAnalyticsRowDto {
  label: string;
  color: string;
  avgDialog: string;
  /** Guest-list drill-throughs for the row's counts (null = not clickable). */
  links: Record<'total' | 'active' | 'urgent' | 'inactive' | 'afa', GuestDrill | null>;
}

/**
 * "Pathway Analytics" tab — Desktop45 (project/screens/Components.bundle.js
 * lines 95267-97179): per-pathway caseload table with Avg DIALOG " /77" scores.
 * The source's "Improvement +18%" column has no backing data (no historical
 * pathway snapshots) and its per-row "View" drill-down (Desktop68) is omitted —
 * the guest list can't be filtered by clinical pathway, only referral category.
 *
 * Every figure covers the guests registered in the reporting period (by the pathway they are on
 * now); the DIALOG average is each guest's latest assessment recorded in the period. Each count
 * opens the guest list filtered to those guests.
 */
@Component({
  selector: 'app-reports-pathway-analytics',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './reports-pathway-analytics.component.html',
  styleUrl: './reports-pathway-analytics.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportsPathwayAnalyticsComponent {
  private readonly reportsApi = inject(ReportsApiService);

  /** The Reports screen's applied reporting period (yyyy-MM-dd). */
  readonly from = input.required<string>();
  readonly to = input.required<string>();
  readonly periodLabel = computed(() => formatPeriod(this.from(), this.to()));

  private readonly canViewGuests = inject(AuthService).hasPermission(Permissions.Guests.View);

  /** Guests registered in the period, narrowed by `extra` — or null when the count isn't clickable. */
  private link(count: number, extra: GuestDrill): GuestDrill | null {
    return this.canViewGuests && count > 0 ? registeredDrill(this.from(), this.to(), extra) : null;
  }

  readonly data = signal<PathwayAnalyticsDto | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly rows = computed<PathwayRow[]>(() =>
    (this.data()?.pathways ?? []).map((p) => ({
      ...p,
      label: PATHWAY_META[p.pathway]?.label ?? p.pathway,
      color: PATHWAY_META[p.pathway]?.color ?? 'rgb(114, 114, 114)',
      avgDialog: p.avgLatestDialogTotal !== null ? `${p.avgLatestDialogTotal.toFixed(1)}/77` : '—',
      links: {
        total: this.link(p.totalGuests, { clinicalPathway: p.pathway }),
        active: this.link(p.activeGuests, { clinicalPathway: p.pathway, status: 'Active' }),
        urgent: this.link(p.urgentGuests, { clinicalPathway: p.pathway, urgent: true }),
        inactive: this.link(p.inactiveGuests, { clinicalPathway: p.pathway, status: 'OnHold' }),
        afa: this.link(p.afaSupportCount, { clinicalPathway: p.pathway, segment: GuestSegments.AfaSupport }),
      },
    })),
  );

  readonly unallocated = computed<number | null>(() => this.data()?.unallocatedGuests ?? null);
  readonly unallocatedLink = computed(() =>
    this.link(this.unallocated() ?? 0, { segment: GuestSegments.MissingPathway }),
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
    return this.reportsApi.getPathwayAnalytics(period).subscribe({
      next: (data) => {
        this.data.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.data.set(null);
        this.error.set(err?.message ?? 'Unable to load pathway analytics.');
        this.loading.set(false);
      },
    });
  }
}

import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { GuestPathway, PathwayAnalyticsDto, PathwayAnalyticsRowDto } from '../../core/api-models';
import { ReportsApiService } from '../../core/reports-api.service';

/**
 * Labels/colors for the three clinical pathways, matching the "Pathway
 * distribution" card rows in the source (Desktop45/72: Wellbeing Support,
 * Additional / Clinical, Community & Recovery in coral/gold/maroon).
 */
const PATHWAY_META: Record<GuestPathway, { label: string; color: string }> = {
  MentalWellbeing: { label: 'Wellbeing Support', color: 'rgb(235, 60, 44)' },
  ClinicalSupport: { label: 'Additional / Clinical', color: 'rgb(201, 167, 35)' },
  CommunityRecovery: { label: 'Community & Recovery', color: 'rgb(148, 28, 60)' },
};

interface PathwayRow extends PathwayAnalyticsRowDto {
  label: string;
  color: string;
  avgDialog: string;
}

/**
 * "Pathway Analytics" tab — Desktop45 (project/screens/Components.bundle.js
 * lines 95267-97179): per-pathway caseload table with Avg DIALOG " /77" scores.
 * The source's "Improvement +18%" column has no backing data (no historical
 * pathway snapshots) and its per-row "View" drill-down (Desktop68) is omitted —
 * the guest list can't be filtered by clinical pathway, only referral category.
 */
@Component({
  selector: 'app-reports-pathway-analytics',
  standalone: true,
  templateUrl: './reports-pathway-analytics.component.html',
  styleUrl: './reports-pathway-analytics.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportsPathwayAnalyticsComponent implements OnInit {
  private readonly reportsApi = inject(ReportsApiService);

  readonly data = signal<PathwayAnalyticsDto | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly rows = computed<PathwayRow[]>(() =>
    (this.data()?.pathways ?? []).map((p) => ({
      ...p,
      label: PATHWAY_META[p.pathway]?.label ?? p.pathway,
      color: PATHWAY_META[p.pathway]?.color ?? 'rgb(114, 114, 114)',
      avgDialog: p.avgLatestDialogTotal !== null ? `${p.avgLatestDialogTotal.toFixed(1)}/77` : '—',
    })),
  );

  readonly unallocated = computed<number | null>(() => this.data()?.unallocatedGuests ?? null);

  ngOnInit(): void {
    this.loading.set(true);
    this.error.set(null);
    this.reportsApi.getPathwayAnalytics().subscribe({
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

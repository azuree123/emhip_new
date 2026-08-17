import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { DashboardsApiService } from '../../core/dashboards-api.service';
import { CmhwDashboardDto } from '../../core/api-models';

/**
 * CMHW home dashboard — ported from the `Dashboard` function (node 356:1140,
 * project/screens/Components.bundle.js lines 6-4401). Sidebar/header are rendered by the
 * shared shell; this component is the content area only.
 *
 * The source hardcodes sample deltas ("+8 vs last month") the backend doesn't compute yet
 * (no historical-trend endpoint) — those are omitted rather than fabricated. Everything else
 * (counts, active-guest rows, urgent banner) is real data from GET /dashboards/cmhw.
 */
@Component({
  selector: 'app-dashboard-cmhw',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './dashboard-cmhw.component.html',
  styleUrl: './dashboard-cmhw.component.scss',
})
export class DashboardCmhwComponent {
  private readonly dashboardsApi = inject(DashboardsApiService);
  private readonly router = inject(Router);

  protected readonly data = signal<CmhwDashboardDto | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  /** Client-side filter behind the design's in-card "Search guest…" field. */
  protected readonly guestFilter = signal('');
  protected readonly filteredGuests = computed(() => {
    const d = this.data();
    if (!d) return [];
    const q = this.guestFilter().trim().toLowerCase();
    if (!q) return d.activeGuests;
    return d.activeGuests.filter(
      (g) => g.name.toLowerCase().includes(q) || g.guestId.toLowerCase().includes(q) || g.status.toLowerCase().includes(q),
    );
  });

  constructor() {
    this.dashboardsApi
      .getCmhwDashboard()
      .pipe(
        catchError(() => {
          this.error.set('Unable to load the dashboard right now.');
          return of(null);
        }),
      )
      .subscribe((result) => {
        this.loading.set(false);
        this.data.set(result);
      });
  }

  protected initials(name: string): string {
    const parts = name.trim().split(/\s+/);
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
  }

  protected formatDate(value: string | null): string {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  }

  protected openGuest(guestId: string): void {
    this.router.navigate(['/guests', guestId]);
  }

  protected goToUrgentCases(): void {
    this.router.navigate(['/urgent-cases']);
  }

  /** KPI drill-down — opens the guest list pre-filtered to the card's status. */
  protected drillToStatus(status: string): void {
    this.router.navigate(['/guests'], { queryParams: { status } });
  }
}

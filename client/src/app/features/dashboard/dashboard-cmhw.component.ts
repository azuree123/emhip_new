import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
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
  templateUrl: './dashboard-cmhw.component.html',
  styleUrl: './dashboard-cmhw.component.scss',
})
export class DashboardCmhwComponent {
  private readonly dashboardsApi = inject(DashboardsApiService);
  private readonly router = inject(Router);

  protected readonly data = signal<CmhwDashboardDto | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

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
}

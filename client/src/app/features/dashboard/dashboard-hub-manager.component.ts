import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { DashboardsApiService } from '../../core/dashboards-api.service';
import { HubManagerDashboardDto, MonthlyStatDto, PathwayDistributionDto } from '../../core/api-models';

/** Same category palette used by the Reports screen — kept in sync manually since each screen is a standalone component. */
const CATEGORY_META: Record<string, { label: string; color: string }> = {
  HousingAdvice: { label: 'Housing Advice', color: 'rgb(148, 28, 60)' },
  EmploymentSupport: { label: 'Employment Support', color: 'rgb(235, 60, 44)' },
  BenefitsFinancialSupport: { label: 'Benefits & Financial Support', color: 'rgb(201, 167, 35)' },
  FoodEssentials: { label: 'Food & Essentials', color: 'rgb(15, 118, 110)' },
  ImmigrationLegalAdvice: { label: 'Immigration & Legal Advice', color: 'rgb(29, 78, 216)' },
  OtherPracticalAdvice: { label: 'Other Practical Advice', color: 'rgb(109, 40, 217)' },
};

interface PathwayRow extends PathwayDistributionDto {
  label: string;
  color: string;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Hub Manager "Service Overview" dashboard — ported from the `Dashboard2` function
 * (node 356:1438, project/screens/Components.bundle.js lines 4402-8021). Sidebar/header are
 * rendered by the shared shell; this component is the content area only.
 */
/** Timeline icons from the design's "Recent activity" card, picked by event description. */
const ACTIVITY_ICONS: { match: RegExp; viewBox: string; width: number; height: number; path: string }[] = [
  {
    // Guest registered — people icon
    match: /register|new guest/i,
    viewBox: '0 0 20.001 17',
    width: 20,
    height: 17,
    path: 'M 3.5 4 C 3.5 2.619 4.619 1.5 6 1.5 C 7.381 1.5 8.5 2.619 8.5 4 C 8.5 5.381 7.381 6.5 6 6.5 C 4.619 6.5 3.5 5.381 3.5 4 Z M 6 0 C 3.791 0 2 1.791 2 4 C 2 6.209 3.791 8 6 8 C 8.209 8 10 6.209 10 4 C 10 1.791 8.209 0 6 0 Z M 13.5 5 C 13.5 4.172 14.172 3.5 15 3.5 C 15.828 3.5 16.5 4.172 16.5 5 C 16.5 5.828 15.828 6.5 15 6.5 C 14.172 6.5 13.5 5.828 13.5 5 Z M 15 2 C 13.343 2 12 3.343 12 5 C 12 6.657 13.343 8 15 8 C 16.657 8 18 6.657 18 5 C 18 3.343 16.657 2 15 2 Z M 12.248 15.038 C 12.951 15.323 13.852 15.5 15.001 15.5 C 17.283 15.5 18.587 14.803 19.298 13.942 C 19.643 13.524 19.819 13.103 19.908 12.779 C 19.952 12.618 19.975 12.48 19.987 12.377 C 19.994 12.325 19.997 12.282 19.999 12.249 C 20 12.232 20 12.218 20.001 12.206 L 20.001 12.19 L 20.001 12.184 L 20.001 12.181 L 20.001 12.179 C 20.001 10.975 19.026 10 17.822 10 L 12.18 10 C 12.152 10 12.125 10 12.098 10.002 C 12.492 10.413 12.779 10.927 12.914 11.5 L 17.822 11.5 C 18.194 11.5 18.496 11.799 18.501 12.169 C 18.501 12.175 18.5 12.185 18.498 12.201 C 18.493 12.239 18.483 12.302 18.462 12.381 C 18.418 12.54 18.328 12.761 18.142 12.986 C 17.79 13.412 16.969 14 15.001 14 C 14.021 14 13.325 13.854 12.83 13.655 C 12.723 14.055 12.545 14.538 12.248 15.038 Z M 2.25 10 C 1.007 10 0 11.007 0 12.25 L 0 12.501 L 0 12.502 L 0 12.505 L 0 12.511 L 0 12.528 C 0.001 12.541 0.001 12.557 0.002 12.577 C 0.004 12.617 0.007 12.67 0.014 12.736 C 0.027 12.866 0.052 13.045 0.102 13.256 C 0.2 13.678 0.397 14.24 0.792 14.805 C 1.611 15.975 3.172 17 6 17 C 8.828 17 10.389 15.975 11.208 14.805 C 11.604 14.24 11.8 13.678 11.898 13.256 C 11.948 13.045 11.973 12.866 11.986 12.736 C 11.993 12.67 11.996 12.617 11.998 12.577 C 11.999 12.557 11.999 12.541 12 12.528 L 12 12.511 L 12 12.505 L 12 12.502 L 12 12.25 C 12 11.007 10.993 10 9.75 10 L 2.25 10 Z M 1.5 12.507 L 1.5 12.495 L 1.5 12.25 C 1.5 11.836 1.836 11.5 2.25 11.5 L 9.75 11.5 C 10.164 11.5 10.5 11.836 10.5 12.25 L 10.5 12.495 L 10.5 12.507 C 10.499 12.522 10.497 12.549 10.493 12.587 C 10.486 12.661 10.47 12.775 10.438 12.916 C 10.372 13.197 10.24 13.572 9.979 13.945 C 9.486 14.65 8.422 15.5 6 15.5 C 3.578 15.5 2.514 14.65 2.021 13.945 C 1.76 13.572 1.628 13.197 1.562 12.916 C 1.53 12.775 1.514 12.661 1.507 12.587 C 1.503 12.549 1.501 12.522 1.5 12.507 Z',
  },
  {
    // Conversation / DIALOG completed — chat bubbles icon
    match: /dialog|conversation|completed/i,
    viewBox: '0 0 20.063 18.004',
    width: 20,
    height: 18,
    path: 'M 7.562 0 C 3.419 0 0.062 3.358 0.062 7.5 C 0.062 8.633 0.313 9.709 0.764 10.673 C 0.51 11.671 0.226 12.784 0.04 13.515 C -0.193 14.428 0.629 15.259 1.544 15.039 C 2.294 14.859 3.447 14.582 4.474 14.337 C 5.417 14.763 6.462 15 7.562 15 C 11.704 15 15.062 11.642 15.062 7.5 C 15.062 3.358 11.704 0 7.562 0 Z M 1.562 7.5 C 1.562 4.186 4.248 1.5 7.562 1.5 C 10.875 1.5 13.562 4.186 13.562 7.5 C 13.562 10.814 10.875 13.5 7.562 13.5 C 6.601 13.5 5.695 13.275 4.892 12.875 L 4.648 12.754 L 4.384 12.817 C 3.461 13.036 2.395 13.292 1.596 13.484 C 1.795 12.705 2.058 11.672 2.286 10.776 L 2.356 10.5 L 2.226 10.247 C 1.801 9.425 1.562 8.491 1.562 7.5 Z M 12.562 18 C 10.592 18 8.8 17.241 7.462 16 C 7.495 16 7.528 16 7.562 16 C 8.28 16 8.977 15.911 9.643 15.743 C 10.507 16.225 11.502 16.5 12.562 16.5 C 13.522 16.5 14.428 16.275 15.232 15.875 L 15.475 15.754 L 15.74 15.817 C 16.661 16.036 17.705 16.263 18.479 16.426 C 18.304 15.676 18.065 14.671 17.837 13.776 L 17.767 13.5 L 17.897 13.247 C 18.322 12.425 18.562 11.491 18.562 10.5 C 18.562 8.385 17.468 6.526 15.815 5.458 C 15.636 4.734 15.365 4.048 15.015 3.411 C 17.952 4.427 20.062 7.217 20.062 10.5 C 20.062 11.633 19.81 12.709 19.359 13.674 C 19.612 14.682 19.868 15.774 20.03 16.477 C 20.235 17.362 19.455 18.163 18.563 17.977 C 17.836 17.825 16.693 17.581 15.649 17.337 C 14.707 17.763 13.661 18 12.562 18 Z',
  },
  {
    // Urgent escalation — clock icon
    match: /urgent|escalat/i,
    viewBox: '0 0 20 20',
    width: 20,
    height: 20,
    path: 'M 1.5 10 C 1.5 5.306 5.306 1.5 10 1.5 C 14.694 1.5 18.5 5.306 18.5 10 C 18.5 14.694 14.694 18.5 10 18.5 C 5.306 18.5 1.5 14.694 1.5 10 Z M 10 0 C 4.477 0 0 4.477 0 10 C 0 15.523 4.477 20 10 20 C 15.523 20 20 15.523 20 10 C 20 4.477 15.523 0 10 0 Z M 9.993 4.648 C 9.944 4.282 9.63 4 9.25 4 C 8.836 4 8.5 4.336 8.5 4.75 L 8.5 10.75 L 8.507 10.852 C 8.556 11.218 8.87 11.5 9.25 11.5 L 13.25 11.5 L 13.352 11.493 C 13.718 11.444 14 11.13 14 10.75 C 14 10.336 13.664 10 13.25 10 L 10 10 L 10 4.75 L 9.993 4.648 Z',
  },
];

/** Fallback timeline icon (design's "Follow-up added" / "Guest reassigned" glyph). */
const ACTIVITY_ICON_DEFAULT = {
  viewBox: '0 0 17 20',
  width: 17,
  height: 20,
  path: 'M 7 3.5 C 7 5.263 5.696 6.722 4 6.965 L 4 9.5 L 10.25 9.5 C 11.493 9.5 12.5 8.493 12.5 7.25 L 12.5 6.855 C 11.054 6.425 10 5.086 10 3.5 C 10 1.567 11.567 0 13.5 0 C 15.433 0 17 1.567 17 3.5 C 17 5.263 15.696 6.722 14 6.965 L 14 7.25 C 14 9.321 12.321 11 10.25 11 L 4 11 L 4 13.035 C 5.696 13.278 7 14.737 7 16.5 C 7 18.433 5.433 20 3.5 20 C 1.567 20 0 18.433 0 16.5 C 0 14.915 1.054 13.575 2.5 13.145 L 2.5 6.855 C 1.054 6.425 0 5.086 0 3.5 C 0 1.567 1.567 0 3.5 0 C 5.433 0 7 1.567 7 3.5 Z M 3.5 5.5 C 4.605 5.5 5.5 4.605 5.5 3.5 C 5.5 2.395 4.605 1.5 3.5 1.5 C 2.395 1.5 1.5 2.395 1.5 3.5 C 1.5 4.605 2.395 5.5 3.5 5.5 Z M 13.5 5.5 C 14.605 5.5 15.5 4.605 15.5 3.5 C 15.5 2.395 14.605 1.5 13.5 1.5 C 12.395 1.5 11.5 2.395 11.5 3.5 C 11.5 4.605 12.395 5.5 13.5 5.5 Z M 5.5 16.5 C 5.5 15.395 4.605 14.5 3.5 14.5 C 2.395 14.5 1.5 15.395 1.5 16.5 C 1.5 17.605 2.395 18.5 3.5 18.5 C 4.605 18.5 5.5 17.605 5.5 16.5 Z',
};

@Component({
  selector: 'app-dashboard-hub-manager',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './dashboard-hub-manager.component.html',
  styleUrl: './dashboard-hub-manager.component.scss',
})
export class DashboardHubManagerComponent {
  private readonly dashboardsApi = inject(DashboardsApiService);
  private readonly router = inject(Router);

  protected readonly data = signal<HubManagerDashboardDto | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  constructor() {
    this.dashboardsApi
      .getHubManagerDashboard()
      .pipe(
        catchError(() => {
          this.error.set('Unable to load the service overview right now.');
          return of(null);
        }),
      )
      .subscribe((result) => {
        this.loading.set(false);
        this.data.set(result);
      });
  }

  protected pathwayRows(dto: HubManagerDashboardDto): PathwayRow[] {
    return [...dto.pathwayDistribution]
      .sort((a, b) => b.percentage - a.percentage)
      .map((p) => ({ ...p, label: CATEGORY_META[p.category]?.label ?? p.category, color: CATEGORY_META[p.category]?.color ?? 'rgb(114,114,114)' }));
  }

  protected monthLabel(year: number, month: number): string {
    return `${MONTH_NAMES[month - 1] ?? month} ${year}`;
  }

  /** Most recent entry in monthlyStats — feeds the design's "Guest Seen … this month" card. */
  protected latestMonth(dto: HubManagerDashboardDto): MonthlyStatDto | null {
    if (dto.monthlyStats.length === 0) return null;
    return [...dto.monthlyStats].sort((a, b) => b.year - a.year || b.month - a.month)[0];
  }

  protected activityIcon(description: string): { viewBox: string; width: number; height: number; path: string } {
    return ACTIVITY_ICONS.find((i) => i.match.test(description)) ?? ACTIVITY_ICON_DEFAULT;
  }

  protected formatDateTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  /** KPI drill-down — opens the guest list pre-filtered to the card's status. */
  protected drillToStatus(status: string): void {
    this.router.navigate(['/guests'], { queryParams: { status } });
  }

  protected goToUrgentCases(): void {
    this.router.navigate(['/urgent-cases']);
  }
}

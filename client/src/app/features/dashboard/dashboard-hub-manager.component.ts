import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { catchError, of } from 'rxjs';
import { DashboardsApiService } from '../../core/dashboards-api.service';
import { HubManagerDashboardDto, PathwayDistributionDto } from '../../core/api-models';

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
@Component({
  selector: 'app-dashboard-hub-manager',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard-hub-manager.component.html',
  styleUrl: './dashboard-hub-manager.component.scss',
})
export class DashboardHubManagerComponent {
  private readonly dashboardsApi = inject(DashboardsApiService);

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

  protected formatDateTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }
}

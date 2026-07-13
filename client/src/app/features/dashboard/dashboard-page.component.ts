import { Component, inject } from '@angular/core';
import { AuthService } from '../../core/auth.service';
import { DashboardCmhwComponent } from './dashboard-cmhw.component';
import { DashboardHubManagerComponent } from './dashboard-hub-manager.component';

/**
 * Per ARCHITECTURE.md: "Current user + role (CMHW vs Hub Manager) drives which dashboard is
 * home." This wrapper picks between the CMHW dashboard (Dashboard, node 356:1140) and the Hub
 * Manager "Service Overview" (Dashboard2, node 356:1438) based on the signed-in role.
 */
@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [DashboardCmhwComponent, DashboardHubManagerComponent],
  template: `
    @if (auth.current().role === 'HubManager') {
      <app-dashboard-hub-manager />
    } @else {
      <app-dashboard-cmhw />
    }
  `,
})
export class DashboardPageComponent {
  protected readonly auth = inject(AuthService);
}

import { Component, inject } from '@angular/core';
import { AuthService } from '../../core/auth.service';
import { Permissions } from '../../core/permissions';
import { DashboardCmhwComponent } from './dashboard-cmhw.component';
import { DashboardHubManagerComponent } from './dashboard-hub-manager.component';

/**
 * Per ARCHITECTURE.md: "Current user + role (CMHW vs Hub Manager) drives which dashboard is
 * home." This wrapper picks between the CMHW dashboard (GuestDataSheet, node 1033:5531) and the
 * Hub Manager dashboard (GuestDataSheet2, node 1034:7909) based on the signed-in user's granted
 * permissions rather than a hardcoded role name, since roles/permissions are now admin-editable.
 */
@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [DashboardCmhwComponent, DashboardHubManagerComponent],
  template: `
    @if (auth.hasPermission(hubManagerPermission)) {
      <app-dashboard-hub-manager />
    } @else {
      <app-dashboard-cmhw />
    }
  `,
})
export class DashboardPageComponent {
  protected readonly auth = inject(AuthService);
  protected readonly hubManagerPermission = Permissions.Dashboard.ViewHubManager;
}

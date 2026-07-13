import { Injectable, signal } from '@angular/core';

export type StaffRole = 'Cmhw' | 'HubManager';

export interface CurrentUser {
  staffId: string;
  hubId: string;
  displayName: string;
  role: StaffRole;
}

/**
 * Dev-mode session state, mirroring Emhip.Api's DevCurrentUser (X-Dev-* headers). The default
 * staff/hub ids match DevCurrentUser.DefaultStaffId/DefaultHubId exactly so requests line up
 * with API defaults even before any UI role-switcher interaction.
 * Swap for a real auth flow (OIDC/Entra ID) without touching the rest of the app — everything
 * else only depends on the `current()` signal below.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly state = signal<CurrentUser>({
    staffId: '11111111-1111-1111-1111-111111111111',
    hubId: '22222222-2222-2222-2222-222222222222',
    displayName: 'Demo CMHW',
    role: 'Cmhw',
  });

  readonly current = this.state.asReadonly();

  setRole(role: StaffRole, displayName: string): void {
    this.state.update((s) => ({ ...s, role, displayName }));
  }
}

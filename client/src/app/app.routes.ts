import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';
import { permissionGuard } from './core/permission.guard';
import { Permissions } from './core/permissions';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./features/auth/login.component').then((m) => m.LoginComponent) },
  {
    path: 'forgot-password',
    loadComponent: () => import('./features/auth/forgot-password.component').then((m) => m.ForgotPasswordComponent),
  },
  {
    path: 'reset-password',
    loadComponent: () => import('./features/auth/reset-password.component').then((m) => m.ResetPasswordComponent),
  },
  {
    path: '',
    loadComponent: () => import('./shell/app-shell.component').then((m) => m.AppShellComponent),
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard-page.component').then((m) => m.DashboardPageComponent),
      },
      {
        path: 'guests',
        loadComponent: () => import('./features/guest-data-sheet/guest-data-sheet.component').then((m) => m.GuestDataSheetComponent),
        data: { permission: Permissions.Guests.View },
        canActivate: [permissionGuard],
      },
      {
        path: 'guests/new',
        loadComponent: () => import('./features/register-guest/register-guest.component').then((m) => m.RegisterGuestComponent),
        data: { permission: Permissions.Guests.Register },
        canActivate: [permissionGuard],
      },
      {
        path: 'guests/:guestId',
        loadComponent: () => import('./features/guest-workspace/guest-workspace.component').then((m) => m.GuestWorkspaceComponent),
        data: { permission: Permissions.Guests.View },
        canActivate: [permissionGuard],
      },
      {
        path: 'followups',
        loadComponent: () => import('./features/follow-ups/follow-ups.component').then((m) => m.FollowUpsComponent),
        data: { permission: Permissions.FollowUps.View },
        canActivate: [permissionGuard],
      },
      {
        path: 'urgent-cases',
        loadComponent: () => import('./features/urgent-cases/urgent-cases.component').then((m) => m.UrgentCasesComponent),
        data: { permission: Permissions.UrgentCases.View },
        canActivate: [permissionGuard],
      },
      {
        path: 'reports',
        loadComponent: () => import('./features/reports/reports.component').then((m) => m.ReportsComponent),
        data: { permission: Permissions.Reports.View },
        canActivate: [permissionGuard],
      },
      {
        path: 'hub-workers',
        loadComponent: () => import('./features/admin/hub-workers.component').then((m) => m.HubWorkersComponent),
        data: { permission: Permissions.Admin.ManageUsers },
        canActivate: [permissionGuard],
      },
      {
        path: 'hub-workers/roles',
        loadComponent: () => import('./features/admin/role-management.component').then((m) => m.RoleManagementComponent),
        data: { permission: Permissions.Admin.ManageRoles },
        canActivate: [permissionGuard],
      },
      { path: '**', redirectTo: 'dashboard' },
    ],
  },
  { path: '**', redirectTo: 'login' },
];

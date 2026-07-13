import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/dashboard-page.component').then((m) => m.DashboardPageComponent),
  },
  {
    path: 'guests',
    loadComponent: () => import('./features/guest-data-sheet/guest-data-sheet.component').then((m) => m.GuestDataSheetComponent),
  },
  {
    path: 'guests/new',
    loadComponent: () => import('./features/register-guest/register-guest.component').then((m) => m.RegisterGuestComponent),
  },
  {
    path: 'guests/:guestId',
    loadComponent: () => import('./features/guest-workspace/guest-workspace.component').then((m) => m.GuestWorkspaceComponent),
  },
  {
    path: 'followups',
    loadComponent: () => import('./features/follow-ups/follow-ups.component').then((m) => m.FollowUpsComponent),
  },
  {
    path: 'urgent-cases',
    loadComponent: () => import('./features/urgent-cases/urgent-cases.component').then((m) => m.UrgentCasesComponent),
  },
  {
    path: 'reports',
    loadComponent: () => import('./features/reports/reports.component').then((m) => m.ReportsComponent),
  },
  { path: 'hub-workers', redirectTo: 'dashboard' },
  { path: '**', redirectTo: 'dashboard' },
];

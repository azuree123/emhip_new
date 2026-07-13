// Mirrors Emhip.Domain.Authorization.Permissions exactly — these are the literal claim values
// carried on the JWT (see AuthService.hasPermission), used for route guards and nav filtering.

export const Permissions = {
  Dashboard: {
    ViewCmhw: 'dashboard.cmhw.view',
    ViewHubManager: 'dashboard.hubmanager.view',
  },
  Guests: {
    View: 'guests.view',
    Register: 'guests.register',
    Edit: 'guests.edit',
    DemographicsView: 'guests.demographics.view',
    DemographicsEdit: 'guests.demographics.edit',
    ClinicalView: 'guests.clinical.view',
    ClinicalEdit: 'guests.clinical.edit',
    PathwayView: 'guests.pathway.view',
    PathwayEdit: 'guests.pathway.edit',
    NotesView: 'guests.notes.view',
    NotesAdd: 'guests.notes.add',
    ContactsAdd: 'guests.contacts.add',
  },
  FollowUps: {
    View: 'followups.view',
    Manage: 'followups.manage',
  },
  UrgentCases: {
    View: 'urgentcases.view',
  },
  Reports: {
    View: 'reports.view',
    Export: 'reports.export',
  },
  Admin: {
    ManageUsers: 'admin.manageusers',
    ManageRoles: 'admin.manageroles',
  },
} as const;

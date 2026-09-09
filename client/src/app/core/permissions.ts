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
    /** May log a contact as a CPN contact — the popup's "Is this a CPN contact?" toggle and Part 1. */
    CpnContactsLog: 'guests.contacts.cpn',
    /** Per-guest access log (who viewed/changed the record). */
    AuditView: 'guests.audit.view',
    /** Subject-access export of the full record — logged server-side. */
    Export: 'guests.export',
    /** Irreversible anonymisation of a guest record. */
    Erase: 'guests.erase',
  },
  FollowUps: {
    View: 'followups.view',
    Manage: 'followups.manage',
  },
  UrgentCases: {
    View: 'urgentcases.view',
  },
  Mdt: {
    /** The Hub Manager's MDT queue: confirm CPN referrals, decline, mark discussed. */
    Manage: 'mdt.manage',
  },
  Reports: {
    View: 'reports.view',
    Export: 'reports.export',
  },
  Documents: {
    View: 'documents.view',
    Upload: 'documents.upload',
    Edit: 'documents.edit',
    Delete: 'documents.delete',
    Restore: 'documents.restore',
    Purge: 'documents.purge',
  },
  Settings: {
    View: 'settings.view',
    Manage: 'settings.manage',
    ManageLookups: 'settings.lookups.manage',
  },
  Admin: {
    ManageUsers: 'admin.manageusers',
    ManageRoles: 'admin.manageroles',
  },
} as const;

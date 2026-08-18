namespace Emhip.Domain.Authorization;

/// <summary>
/// The full catalog of granular permissions. Stored as claims on ApplicationRole
/// (ClaimType = PermissionClaimType) and flattened onto each user's JWT at login — see
/// Emhip.Api.Auth.TokenService. Enforced via a per-permission authorization policy
/// registered in Program.cs (`AddPolicy(permission, ...)`), applied to controllers with
/// `[Authorize(Policy = Permissions.Guests.View)]`.
/// </summary>
public static class Permissions
{
    public const string ClaimType = "permission";

    public static class Dashboard
    {
        public const string ViewCmhw = "dashboard.cmhw.view";
        public const string ViewHubManager = "dashboard.hubmanager.view";
    }

    public static class Guests
    {
        public const string View = "guests.view";
        public const string Register = "guests.register";
        public const string Edit = "guests.edit";
        public const string DemographicsView = "guests.demographics.view";
        public const string DemographicsEdit = "guests.demographics.edit";
        public const string ClinicalView = "guests.clinical.view";
        public const string ClinicalEdit = "guests.clinical.edit";
        public const string PathwayView = "guests.pathway.view";
        public const string PathwayEdit = "guests.pathway.edit";
        public const string NotesView = "guests.notes.view";
        public const string NotesAdd = "guests.notes.add";
        public const string ContactsAdd = "guests.contacts.add";
    }

    public static class FollowUps
    {
        public const string View = "followups.view";
        public const string Manage = "followups.manage";
    }

    public static class UrgentCases
    {
        public const string View = "urgentcases.view";
    }

    public static class Reports
    {
        public const string View = "reports.view";
        public const string Export = "reports.export";
    }

    public static class Documents
    {
        public const string View = "documents.view";
        public const string Upload = "documents.upload";
        public const string Edit = "documents.edit";
        public const string Delete = "documents.delete";
        public const string Restore = "documents.restore";
        /// <summary>Permanent deletion including the stored file — deliberately separate from soft delete.</summary>
        public const string Purge = "documents.purge";
    }

    public static class Settings
    {
        public const string View = "settings.view";
        public const string Manage = "settings.manage";
        public const string ManageLookups = "settings.lookups.manage";
    }

    public static class Admin
    {
        public const string ManageUsers = "admin.manageusers";
        public const string ManageRoles = "admin.manageroles";
    }

    /// <summary>Every permission in the catalog — used to register authorization policies and to render the admin role-editor UI.</summary>
    public static readonly IReadOnlyList<string> All =
    [
        Dashboard.ViewCmhw, Dashboard.ViewHubManager,
        Guests.View, Guests.Register, Guests.Edit, Guests.DemographicsView, Guests.DemographicsEdit,
        Guests.ClinicalView, Guests.ClinicalEdit, Guests.PathwayView, Guests.PathwayEdit,
        Guests.NotesView, Guests.NotesAdd, Guests.ContactsAdd,
        FollowUps.View, FollowUps.Manage,
        UrgentCases.View,
        Reports.View, Reports.Export,
        Documents.View, Documents.Upload, Documents.Edit, Documents.Delete, Documents.Restore, Documents.Purge,
        Settings.View, Settings.Manage, Settings.ManageLookups,
        Admin.ManageUsers, Admin.ManageRoles,
    ];

    /// <summary>Grouped view of <see cref="All"/> for the admin role-editor UI (group label -> permission names).</summary>
    public static readonly IReadOnlyDictionary<string, string[]> Groups = new Dictionary<string, string[]>
    {
        ["Dashboard"] = [Dashboard.ViewCmhw, Dashboard.ViewHubManager],
        ["Guests"] =
        [
            Guests.View, Guests.Register, Guests.Edit, Guests.DemographicsView, Guests.DemographicsEdit,
            Guests.ClinicalView, Guests.ClinicalEdit, Guests.PathwayView, Guests.PathwayEdit,
            Guests.NotesView, Guests.NotesAdd, Guests.ContactsAdd,
        ],
        ["Follow-ups"] = [FollowUps.View, FollowUps.Manage],
        ["Urgent Cases"] = [UrgentCases.View],
        ["Reports"] = [Reports.View, Reports.Export],
        ["Documents"] = [Documents.View, Documents.Upload, Documents.Edit, Documents.Delete, Documents.Restore, Documents.Purge],
        ["Settings"] = [Settings.View, Settings.Manage, Settings.ManageLookups],
        ["Administration"] = [Admin.ManageUsers, Admin.ManageRoles],
    };
}

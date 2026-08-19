using Emhip.Application.Abstractions;
using Emhip.Application.Contacts;
using Emhip.Application.Guests.Actions;
using Emhip.Application.Guests.Caseload;
using Emhip.Application.Guests.Casework;
using Emhip.Application.Guests.Clinical;
using Emhip.Application.Guests.Commands;
using Emhip.Application.Guests.Dialog;
using Emhip.Application.Guests.Pathways;
using Emhip.Application.Guests.Dtos;
using Emhip.Application.Guests.Queries;
using Emhip.Application.Notes;
using Emhip.Domain.Authorization;
using Emhip.Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Emhip.Api.Controllers;

/// <summary>Maps 1:1 to the Guest List, Guest Workspace and registration screens — see ARCHITECTURE.md "API surface".</summary>
[ApiController]
[Route("guests")]
[Authorize]
public sealed class GuestsController(IMediator mediator, ICurrentUser currentUser) : ControllerBase
{
    /// <summary>Guest Data Sheet — keyset-paginated, never offset. Pass the `cursor` from the previous response to fetch the next page.</summary>
    [HttpGet]
    [Authorize(Policy = Permissions.Guests.View)]
    public async Task<IActionResult> GetGuestList(
        [FromQuery] string? q, [FromQuery] GuestStatus? status, [FromQuery] string? cursor, [FromQuery] int pageSize = 50,
        [FromQuery] PathwayCategory? pathway = null, [FromQuery] bool? risk = null, [FromQuery] Guid? cmhw = null,
        [FromQuery] int? lastActivityDays = null, [FromQuery] bool? urgent = null,
        [FromQuery] string? ethnicity = null, [FromQuery] string? gender = null, [FromQuery] string? countryOfOrigin = null,
        [FromQuery] int? ageMin = null, [FromQuery] int? ageMax = null, CancellationToken cancellationToken = default)
    {
        var result = await mediator.Send(
            new GetGuestListQuery(currentUser.HubId, q, status, cursor, Math.Clamp(pageSize, 1, 200), pathway, risk, cmhw, lastActivityDays, urgent, ethnicity, gender, countryOfOrigin, ageMin, ageMax),
            cancellationToken);
        return Ok(result);
    }

    /// <summary>Top-bar search autocomplete — name or "G-1001" reference matches within the caller's hub.</summary>
    [HttpGet("suggest")]
    [Authorize(Policy = Permissions.Guests.View)]
    public async Task<IActionResult> Suggest([FromQuery] string q, [FromQuery] int limit = 8, CancellationToken cancellationToken = default)
    {
        var result = await mediator.Send(new GetGuestSuggestionsQuery(currentUser.HubId, q ?? string.Empty, limit), cancellationToken);
        return Ok(result);
    }

    /// <summary>Options for the guest list's "Assigned CMHW" filter — active staff in the caller's hub.</summary>
    [HttpGet("cmhws")]
    [Authorize(Policy = Permissions.Guests.View)]
    public async Task<IActionResult> GetCmhws(CancellationToken cancellationToken)
    {
        var result = await mediator.Send(new GetHubCmhwsQuery(currentUser.HubId), cancellationToken);
        return Ok(result);
    }

    /// <summary>Register New Guest.</summary>
    [HttpPost]
    [Authorize(Policy = Permissions.Guests.Register)]
    public async Task<IActionResult> Register([FromBody] RegisterGuestCommand command, CancellationToken cancellationToken)
    {
        var id = await mediator.Send(command, cancellationToken);
        return CreatedAtAction(nameof(GetOverview), new { guestId = id }, new { id });
    }

    [HttpGet("{guestId:guid}/overview")]
    [Authorize(Policy = Permissions.Guests.View)]
    public async Task<ActionResult<GuestOverviewDto>> GetOverview(Guid guestId, CancellationToken cancellationToken)
    {
        var result = await mediator.Send(new GetGuestOverviewQuery(guestId), cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpGet("{guestId:guid}/demographics")]
    [Authorize(Policy = Permissions.Guests.DemographicsView)]
    public async Task<ActionResult<GuestDemographicsDto>> GetDemographics(Guid guestId, CancellationToken cancellationToken)
    {
        var result = await mediator.Send(new GetGuestDemographicsQuery(guestId), cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPut("{guestId:guid}/demographics")]
    [Authorize(Policy = Permissions.Guests.DemographicsEdit)]
    public async Task<IActionResult> UpdateDemographics(Guid guestId, [FromBody] UpdateDemographicsRequest request, CancellationToken cancellationToken)
    {
        await mediator.Send(request.ToCommand(guestId), cancellationToken);
        return NoContent();
    }

    [HttpGet("{guestId:guid}/clinical")]
    [Authorize(Policy = Permissions.Guests.ClinicalView)]
    public async Task<ActionResult<GuestClinicalDto>> GetClinical(Guid guestId, CancellationToken cancellationToken)
    {
        var result = await mediator.Send(new GetGuestClinicalQuery(guestId), cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }

    /// <summary>Records a new (versioned, append-only) risk assessment. Any flag escalates the guest onto the Urgent Cases queue.</summary>
    [HttpPost("{guestId:guid}/risk-assessments")]
    [Authorize(Policy = Permissions.Guests.ClinicalEdit)]
    public async Task<IActionResult> RecordRiskAssessment(Guid guestId, [FromBody] RecordRiskAssessmentRequest request, CancellationToken cancellationToken)
    {
        var id = await mediator.Send(request.ToCommand(guestId), cancellationToken);
        return CreatedAtAction(nameof(GetClinical), new { guestId }, new { id });
    }

    [HttpGet("{guestId:guid}/pathway")]
    [Authorize(Policy = Permissions.Guests.PathwayView)]
    public async Task<ActionResult<GuestPathwayDto>> GetPathway(Guid guestId, CancellationToken cancellationToken)
    {
        var result = await mediator.Send(new GetGuestPathwayQuery(guestId), cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost("{guestId:guid}/pathway")]
    [Authorize(Policy = Permissions.Guests.PathwayEdit)]
    public async Task<IActionResult> CreatePathwayReferral(Guid guestId, [FromBody] CreatePathwayReferralRequest request, CancellationToken cancellationToken)
    {
        var id = await mediator.Send(new CreatePathwayReferralCommand(guestId, request.Category, request.Detail), cancellationToken);
        return CreatedAtAction(nameof(GetPathway), new { guestId }, new { id });
    }

    [HttpGet("{guestId:guid}/followups")]
    [Authorize(Policy = Permissions.FollowUps.View)]
    public async Task<ActionResult<GuestFollowUpsDto>> GetFollowUps(Guid guestId, CancellationToken cancellationToken)
    {
        var result = await mediator.Send(new GetGuestFollowUpsQuery(guestId), cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost("{guestId:guid}/followups")]
    [Authorize(Policy = Permissions.FollowUps.Manage)]
    public async Task<IActionResult> ScheduleFollowUp(Guid guestId, [FromBody] ScheduleFollowUpRequest request, CancellationToken cancellationToken)
    {
        var id = await mediator.Send(new ScheduleFollowUpCommand(guestId, request.DueDate, request.AssigneeStaffId, request.Notes), cancellationToken);
        return CreatedAtAction(nameof(GetFollowUps), new { guestId }, new { id });
    }

    [HttpGet("{guestId:guid}/initial-conversation")]
    [Authorize(Policy = Permissions.Guests.View)]
    public async Task<ActionResult<GuestInitialConversationDto>> GetInitialConversation(Guid guestId, CancellationToken cancellationToken)
    {
        var result = await mediator.Send(new GetGuestInitialConversationQuery(guestId), cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost("{guestId:guid}/initial-conversation")]
    [Authorize(Policy = Permissions.Guests.Register)]
    public async Task<IActionResult> RecordInitialConversation(Guid guestId, [FromBody] RecordInitialConversationRequest request, CancellationToken cancellationToken)
    {
        var command = new RecordInitialConversationCommand(
            guestId, request.PresentingIssues, request.Notes, request.ConsentConfirmed,
            request.ImmediateRisk, request.Pathway, request.AfaSupportNeeded,
            request.AssignedCmhwId, request.NextContactDate, request.Actions);
        var id = await mediator.Send(command, cancellationToken);
        return CreatedAtAction(nameof(GetInitialConversation), new { guestId }, new { id });
    }

    /// <summary>Add Contact — used by both the Guest Workspace Follow-up tab and the Global Follow-up screen's add-entry flow.</summary>
    [HttpPost("{guestId:guid}/contacts")]
    [Authorize(Policy = Permissions.Guests.ContactsAdd)]
    public async Task<IActionResult> AddContact(Guid guestId, [FromBody] AddContactRequest request, CancellationToken cancellationToken)
    {
        var command = new AddContactCommand(guestId, request.Type, request.Outcome, request.OccurredAt, request.Notes);
        var id = await mediator.Send(command, cancellationToken);
        return CreatedAtAction(nameof(GetOverview), new { guestId }, new { id });
    }

    /// <summary>Guest Workspace DIALOG tab — baseline, latest and full history of the 11-domain scale.</summary>
    [HttpGet("{guestId:guid}/dialog")]
    [Authorize(Policy = Permissions.Guests.ClinicalView)]
    public async Task<ActionResult<GuestDialogDto>> GetDialog(Guid guestId, CancellationToken cancellationToken)
    {
        var result = await mediator.Send(new GetGuestDialogQuery(guestId), cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }

    /// <summary>Records the next DIALOG assessment version (version 1 = baseline, captured at registration).</summary>
    [HttpPost("{guestId:guid}/dialog-assessments")]
    [Authorize(Policy = Permissions.Guests.ClinicalEdit)]
    public async Task<IActionResult> RecordDialogAssessment(Guid guestId, [FromBody] RecordDialogAssessmentRequest request, CancellationToken cancellationToken)
    {
        var id = await mediator.Send(request.ToCommand(guestId), cancellationToken);
        return CreatedAtAction(nameof(GetDialog), new { guestId }, new { id });
    }

    /// <summary>Guest Workspace Action tab.</summary>
    [HttpGet("{guestId:guid}/actions")]
    [Authorize(Policy = Permissions.Guests.View)]
    public async Task<ActionResult<IReadOnlyList<GuestActionDto>>> GetActions(Guid guestId, CancellationToken cancellationToken)
    {
        var result = await mediator.Send(new GetGuestActionsQuery(guestId), cancellationToken);
        return Ok(result);
    }

    [HttpPost("{guestId:guid}/actions")]
    [Authorize(Policy = Permissions.Guests.Edit)]
    public async Task<IActionResult> AddAction(Guid guestId, [FromBody] GuestActionRequest request, CancellationToken cancellationToken)
    {
        var id = await mediator.Send(new AddGuestActionCommand(guestId, request.Description, request.DueDate, request.AssignedToStaffId), cancellationToken);
        return CreatedAtAction(nameof(GetActions), new { guestId }, new { id });
    }

    [HttpPut("{guestId:guid}/actions/{actionId:guid}")]
    [Authorize(Policy = Permissions.Guests.Edit)]
    public async Task<IActionResult> UpdateAction(Guid guestId, Guid actionId, [FromBody] GuestActionRequest request, CancellationToken cancellationToken)
    {
        await mediator.Send(new UpdateGuestActionCommand(guestId, actionId, request.Description, request.DueDate, request.AssignedToStaffId, request.IsCompleted), cancellationToken);
        return NoContent();
    }

    [HttpDelete("{guestId:guid}/actions/{actionId:guid}")]
    [Authorize(Policy = Permissions.Guests.Edit)]
    public async Task<IActionResult> DeleteAction(Guid guestId, Guid actionId, CancellationToken cancellationToken)
    {
        await mediator.Send(new DeleteGuestActionCommand(guestId, actionId), cancellationToken);
        return NoContent();
    }

    /// <summary>Guest Workspace Clinical Details tab (MH history, physical health, care team, SMI).</summary>
    [HttpGet("{guestId:guid}/clinical-profile")]
    [Authorize(Policy = Permissions.Guests.ClinicalView)]
    public async Task<ActionResult<ClinicalProfileDto>> GetClinicalProfile(Guid guestId, CancellationToken cancellationToken)
    {
        var result = await mediator.Send(new GetClinicalProfileQuery(guestId), cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPut("{guestId:guid}/clinical-profile")]
    [Authorize(Policy = Permissions.Guests.ClinicalEdit)]
    public async Task<IActionResult> UpdateClinicalProfile(Guid guestId, [FromBody] UpdateClinicalProfileRequest request, CancellationToken cancellationToken)
    {
        await mediator.Send(request.ToCommand(guestId), cancellationToken);
        return NoContent();
    }

    /// <summary>Register flow "Pathway &amp; allocation" step — sets pathway, AFA flag and (optionally) the assigned CMHW.</summary>
    [HttpPost("{guestId:guid}/allocation")]
    [Authorize(Policy = Permissions.Guests.Edit)]
    public async Task<IActionResult> Allocate(Guid guestId, [FromBody] AllocateGuestRequest request, CancellationToken cancellationToken)
    {
        await mediator.Send(new AllocateGuestCommand(guestId, request.Pathway, request.AfaSupportNeeded, request.AssignedCmhwId), cancellationToken);
        return NoContent();
    }

    /// <summary>All quick notes for the guest, pinned first — the workspace Notes tab.</summary>
    [HttpGet("{guestId:guid}/notes")]
    [Authorize(Policy = Permissions.Guests.NotesView)]
    public async Task<IActionResult> GetNotes(Guid guestId, CancellationToken cancellationToken) =>
        Ok(await mediator.Send(new GetGuestNotesQuery(guestId), cancellationToken));

    [HttpPost("{guestId:guid}/notes")]
    [Authorize(Policy = Permissions.Guests.NotesAdd)]
    public async Task<IActionResult> AddNote(Guid guestId, [FromBody] AddNoteRequest request, CancellationToken cancellationToken)
    {
        var command = new AddNoteCommand(guestId, request.Body, request.Color, request.IsPinned);
        var id = await mediator.Send(command, cancellationToken);
        return CreatedAtAction(nameof(GetNotes), new { guestId }, new { id });
    }

    /// <summary>Pins or unpins a note — pinned notes surface on the guest overview.</summary>
    [HttpPut("{guestId:guid}/notes/{noteId:guid}/pin")]
    [Authorize(Policy = Permissions.Guests.NotesAdd)]
    public async Task<IActionResult> SetNotePinned(Guid guestId, Guid noteId, [FromBody] SetNotePinnedRequest request, CancellationToken cancellationToken)
    {
        await mediator.Send(new SetNotePinnedCommand(guestId, noteId, request.IsPinned), cancellationToken);
        return NoContent();
    }

    /// <summary>Casework notes (SBAR clinical records) for the guest, newest first.</summary>
    [HttpGet("{guestId:guid}/casework-notes")]
    [Authorize(Policy = Permissions.Guests.NotesView)]
    public async Task<IActionResult> GetCaseworkNotes(Guid guestId, CancellationToken cancellationToken) =>
        Ok(await mediator.Send(new GetCaseworkNotesQuery(guestId), cancellationToken));

    /// <summary>
    /// Saves a casework note. `submit=false` keeps it as a draft; submitting writes the linked
    /// contact, any actions arising, and the next-contact follow-up.
    /// </summary>
    [HttpPost("{guestId:guid}/casework-notes")]
    [Authorize(Policy = Permissions.Guests.NotesAdd)]
    public async Task<IActionResult> SaveCaseworkNote(
        Guid guestId, [FromBody] CaseworkNoteInput input, [FromQuery] bool submit = false, CancellationToken cancellationToken = default)
    {
        var id = await mediator.Send(new SaveCaseworkNoteCommand(guestId, null, input, submit), cancellationToken);
        return CreatedAtAction(nameof(GetCaseworkNotes), new { guestId }, new { id });
    }

    [HttpPut("{guestId:guid}/casework-notes/{noteId:guid}")]
    [Authorize(Policy = Permissions.Guests.NotesAdd)]
    public async Task<IActionResult> UpdateCaseworkNote(
        Guid guestId, Guid noteId, [FromBody] CaseworkNoteInput input, [FromQuery] bool submit = false, CancellationToken cancellationToken = default)
    {
        await mediator.Send(new SaveCaseworkNoteCommand(guestId, noteId, input, submit), cancellationToken);
        return NoContent();
    }

    /// <summary>Discards a draft. Submitted notes are part of the clinical record and cannot be deleted.</summary>
    [HttpDelete("{guestId:guid}/casework-notes/{noteId:guid}")]
    [Authorize(Policy = Permissions.Guests.NotesAdd)]
    public async Task<IActionResult> DeleteCaseworkNote(Guid guestId, Guid noteId, CancellationToken cancellationToken)
    {
        await mediator.Send(new DeleteCaseworkNoteCommand(guestId, noteId), cancellationToken);
        return NoContent();
    }

    /// <summary>Reassigns the guest's CMHW and logs it (spec §4.4).</summary>
    [HttpPost("{guestId:guid}/reassign")]
    [Authorize(Policy = Permissions.Guests.Edit)]
    public async Task<IActionResult> Reassign(Guid guestId, [FromBody] ReassignGuestRequest request, CancellationToken cancellationToken)
    {
        await mediator.Send(new ReassignGuestCommand(guestId, request.AssignedCmhwId, request.Reason), cancellationToken);
        return NoContent();
    }

    /// <summary>Append-only allocation history for the guest.</summary>
    [HttpGet("{guestId:guid}/caseload-history")]
    [Authorize(Policy = Permissions.Guests.View)]
    public async Task<IActionResult> GetCaseloadHistory(Guid guestId, CancellationToken cancellationToken) =>
        Ok(await mediator.Send(new GetCaseloadHistoryQuery(guestId), cancellationToken));

    /// <summary>"Change Pathway" — moves the guest and appends the pathway-history entry.</summary>
    [HttpPost("{guestId:guid}/pathway-changes")]
    [Authorize(Policy = Permissions.Guests.PathwayEdit)]
    public async Task<IActionResult> ChangePathway(Guid guestId, [FromBody] ChangePathwayRequest request, CancellationToken cancellationToken)
    {
        var id = await mediator.Send(
            new ChangeGuestPathwayCommand(guestId, request.Pathway, request.Reason, request.AssignedByStaffId, request.AssignedByName, request.ChangedOn),
            cancellationToken);
        return CreatedAtAction(nameof(GetPathway), new { guestId }, new { id });
    }

    public sealed record UpdateDemographicsRequest(
        string? Ethnicity, string? Nationality, string? PreferredLanguage, bool InterpreterNeeded,
        string? HousingStatus, string? EmploymentStatus, string? MaritalStatus, string? LivingGroup, string? CountryOfOrigin,
        string? EmergencyContactName, string? EmergencyContactPhone, string? EmergencyContactRelationship,
        string? GpName, string? GpPractice, string? NhsNumber)
    {
        public UpdateDemographicsCommand ToCommand(Guid guestId) => new(
            guestId, Ethnicity, Nationality, PreferredLanguage, InterpreterNeeded, HousingStatus, EmploymentStatus,
            MaritalStatus, LivingGroup, CountryOfOrigin,
            EmergencyContactName, EmergencyContactPhone, EmergencyContactRelationship, GpName, GpPractice, NhsNumber);
    }

    public sealed record RecordRiskAssessmentRequest(
        bool SuicidalIdeation, bool SelfHarm, bool RiskToOthers, bool SevereDeterioration, bool SafeguardingConcern, string? Notes)
    {
        public RecordRiskAssessmentCommand ToCommand(Guid guestId) => new(
            guestId, SuicidalIdeation, SelfHarm, RiskToOthers, SevereDeterioration, SafeguardingConcern, Notes);
    }

    public sealed record CreatePathwayReferralRequest(PathwayCategory Category, string? Detail);

    public sealed record ScheduleFollowUpRequest(DateOnly DueDate, Guid AssigneeStaffId, string? Notes);

    /// <summary>Spec §4.2 — pathway, immediate risk and (for one-to-one pathways) CMHW and next contact are mandatory.</summary>
    public sealed record RecordInitialConversationRequest(
        string? PresentingIssues,
        string? Notes,
        bool ConsentConfirmed,
        bool ImmediateRisk,
        GuestPathway Pathway,
        bool AfaSupportNeeded,
        Guid? AssignedCmhwId,
        DateOnly? NextContactDate,
        IReadOnlyList<InitialConversationActionInput>? Actions);

    public sealed record AddContactRequest(ContactType Type, ContactOutcome Outcome, DateTimeOffset OccurredAt, string? Notes);

    public sealed record AddNoteRequest(string Body, NoteColor Color, bool IsPinned);

    public sealed record RecordDialogAssessmentRequest(
        int MentalHealth, int PhysicalHealth, int JobSituation, int Accommodation,
        int LeisureActivities, int FriendshipsSocialLife, int RelationshipWithFamily,
        int PersonalSafety, int PracticalHelp, int Medication, int MeetingsWithMhStaff)
    {
        public RecordDialogAssessmentCommand ToCommand(Guid guestId) => new(
            guestId, MentalHealth, PhysicalHealth, JobSituation, Accommodation,
            LeisureActivities, FriendshipsSocialLife, RelationshipWithFamily,
            PersonalSafety, PracticalHelp, Medication, MeetingsWithMhStaff);
    }

    public sealed record GuestActionRequest(string Description, DateOnly DueDate, Guid? AssignedToStaffId, bool IsCompleted);

    public sealed record UpdateClinicalProfileRequest(
        bool PreviousMhDiagnosis, string? DiagnosisGroups, string? PresentingProblem,
        string? PastMhDifficulties, string? FamilyMhHistory,
        string? LongTermHealthCondition, string? PhysicalIllness, string? CurrentMedications,
        string? MhTeamClinician, string? SocialServicesCoordinator, bool CpnInvolved, bool TrustInvolvement,
        bool SmiIndicator)
    {
        public UpdateClinicalProfileCommand ToCommand(Guid guestId) => new(
            guestId, PreviousMhDiagnosis, DiagnosisGroups, PresentingProblem,
            PastMhDifficulties, FamilyMhHistory,
            LongTermHealthCondition, PhysicalIllness, CurrentMedications,
            MhTeamClinician, SocialServicesCoordinator, CpnInvolved, TrustInvolvement, SmiIndicator);
    }

    public sealed record AllocateGuestRequest(GuestPathway Pathway, bool AfaSupportNeeded, Guid? AssignedCmhwId);

    public sealed record SetNotePinnedRequest(bool IsPinned);

    public sealed record ReassignGuestRequest(Guid? AssignedCmhwId, string? Reason);

    public sealed record ChangePathwayRequest(
        GuestPathway Pathway, string? Reason, Guid? AssignedByStaffId, string? AssignedByName, DateOnly ChangedOn);
}

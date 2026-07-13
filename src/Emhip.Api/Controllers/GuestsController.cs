using Emhip.Application.Abstractions;
using Emhip.Application.Contacts;
using Emhip.Application.Guests.Commands;
using Emhip.Application.Guests.Dtos;
using Emhip.Application.Guests.Queries;
using Emhip.Application.Notes;
using Emhip.Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace Emhip.Api.Controllers;

/// <summary>Maps 1:1 to the Guest List, Guest Workspace and registration screens — see ARCHITECTURE.md "API surface".</summary>
[ApiController]
[Route("guests")]
public sealed class GuestsController(IMediator mediator, ICurrentUser currentUser) : ControllerBase
{
    /// <summary>Guest Data Sheet — keyset-paginated, never offset. Pass the `cursor` from the previous response to fetch the next page.</summary>
    [HttpGet]
    public async Task<IActionResult> GetGuestList(
        [FromQuery] string? q, [FromQuery] GuestStatus? status, [FromQuery] string? cursor, [FromQuery] int pageSize = 50, CancellationToken cancellationToken = default)
    {
        var result = await mediator.Send(new GetGuestListQuery(currentUser.HubId, q, status, cursor, Math.Clamp(pageSize, 1, 200)), cancellationToken);
        return Ok(result);
    }

    /// <summary>Register New Guest.</summary>
    [HttpPost]
    public async Task<IActionResult> Register([FromBody] RegisterGuestCommand command, CancellationToken cancellationToken)
    {
        var id = await mediator.Send(command, cancellationToken);
        return CreatedAtAction(nameof(GetOverview), new { guestId = id }, new { id });
    }

    [HttpGet("{guestId:guid}/overview")]
    public async Task<ActionResult<GuestOverviewDto>> GetOverview(Guid guestId, CancellationToken cancellationToken)
    {
        var result = await mediator.Send(new GetGuestOverviewQuery(guestId), cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpGet("{guestId:guid}/demographics")]
    public async Task<ActionResult<GuestDemographicsDto>> GetDemographics(Guid guestId, CancellationToken cancellationToken)
    {
        var result = await mediator.Send(new GetGuestDemographicsQuery(guestId), cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPut("{guestId:guid}/demographics")]
    public async Task<IActionResult> UpdateDemographics(Guid guestId, [FromBody] UpdateDemographicsRequest request, CancellationToken cancellationToken)
    {
        await mediator.Send(request.ToCommand(guestId), cancellationToken);
        return NoContent();
    }

    [HttpGet("{guestId:guid}/clinical")]
    public async Task<ActionResult<GuestClinicalDto>> GetClinical(Guid guestId, CancellationToken cancellationToken)
    {
        var result = await mediator.Send(new GetGuestClinicalQuery(guestId), cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }

    /// <summary>Records a new (versioned, append-only) risk assessment. Any flag escalates the guest onto the Urgent Cases queue.</summary>
    [HttpPost("{guestId:guid}/risk-assessments")]
    public async Task<IActionResult> RecordRiskAssessment(Guid guestId, [FromBody] RecordRiskAssessmentRequest request, CancellationToken cancellationToken)
    {
        var id = await mediator.Send(request.ToCommand(guestId), cancellationToken);
        return CreatedAtAction(nameof(GetClinical), new { guestId }, new { id });
    }

    [HttpGet("{guestId:guid}/pathway")]
    public async Task<ActionResult<GuestPathwayDto>> GetPathway(Guid guestId, CancellationToken cancellationToken)
    {
        var result = await mediator.Send(new GetGuestPathwayQuery(guestId), cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost("{guestId:guid}/pathway")]
    public async Task<IActionResult> CreatePathwayReferral(Guid guestId, [FromBody] CreatePathwayReferralRequest request, CancellationToken cancellationToken)
    {
        var id = await mediator.Send(new CreatePathwayReferralCommand(guestId, request.Category, request.Detail), cancellationToken);
        return CreatedAtAction(nameof(GetPathway), new { guestId }, new { id });
    }

    [HttpGet("{guestId:guid}/followups")]
    public async Task<ActionResult<GuestFollowUpsDto>> GetFollowUps(Guid guestId, CancellationToken cancellationToken)
    {
        var result = await mediator.Send(new GetGuestFollowUpsQuery(guestId), cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost("{guestId:guid}/followups")]
    public async Task<IActionResult> ScheduleFollowUp(Guid guestId, [FromBody] ScheduleFollowUpRequest request, CancellationToken cancellationToken)
    {
        var id = await mediator.Send(new ScheduleFollowUpCommand(guestId, request.DueDate, request.AssigneeStaffId, request.Notes), cancellationToken);
        return CreatedAtAction(nameof(GetFollowUps), new { guestId }, new { id });
    }

    [HttpGet("{guestId:guid}/initial-conversation")]
    public async Task<ActionResult<GuestInitialConversationDto>> GetInitialConversation(Guid guestId, CancellationToken cancellationToken)
    {
        var result = await mediator.Send(new GetGuestInitialConversationQuery(guestId), cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost("{guestId:guid}/initial-conversation")]
    public async Task<IActionResult> RecordInitialConversation(Guid guestId, [FromBody] RecordInitialConversationRequest request, CancellationToken cancellationToken)
    {
        var command = new RecordInitialConversationCommand(guestId, request.PresentingIssues, request.Notes, request.ConsentConfirmed);
        var id = await mediator.Send(command, cancellationToken);
        return CreatedAtAction(nameof(GetInitialConversation), new { guestId }, new { id });
    }

    /// <summary>Add Contact — used by both the Guest Workspace Follow-up tab and the Global Follow-up screen's add-entry flow.</summary>
    [HttpPost("{guestId:guid}/contacts")]
    public async Task<IActionResult> AddContact(Guid guestId, [FromBody] AddContactRequest request, CancellationToken cancellationToken)
    {
        var command = new AddContactCommand(guestId, request.Type, request.Outcome, request.OccurredAt, request.Notes);
        var id = await mediator.Send(command, cancellationToken);
        return CreatedAtAction(nameof(GetOverview), new { guestId }, new { id });
    }

    [HttpPost("{guestId:guid}/notes")]
    public async Task<IActionResult> AddNote(Guid guestId, [FromBody] AddNoteRequest request, CancellationToken cancellationToken)
    {
        var command = new AddNoteCommand(guestId, request.Body, request.Color, request.IsPinned);
        var id = await mediator.Send(command, cancellationToken);
        return CreatedAtAction(nameof(GetOverview), new { guestId }, new { id });
    }

    public sealed record UpdateDemographicsRequest(
        string? Ethnicity, string? Nationality, string? PreferredLanguage, bool InterpreterNeeded,
        string? HousingStatus, string? EmploymentStatus,
        string? EmergencyContactName, string? EmergencyContactPhone, string? EmergencyContactRelationship,
        string? GpName, string? GpPractice, string? NhsNumber)
    {
        public UpdateDemographicsCommand ToCommand(Guid guestId) => new(
            guestId, Ethnicity, Nationality, PreferredLanguage, InterpreterNeeded, HousingStatus, EmploymentStatus,
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

    public sealed record RecordInitialConversationRequest(string? PresentingIssues, string? Notes, bool ConsentConfirmed);

    public sealed record AddContactRequest(ContactType Type, ContactOutcome Outcome, DateTimeOffset OccurredAt, string? Notes);

    public sealed record AddNoteRequest(string Body, NoteColor Color, bool IsPinned);
}

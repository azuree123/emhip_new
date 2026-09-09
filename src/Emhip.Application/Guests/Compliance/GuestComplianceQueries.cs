using Emhip.Application.Abstractions;
using Emhip.Application.Documents;
using Emhip.Application.Guests.Casework;
using Emhip.Application.Guests.Dtos;
using Emhip.Application.UrgentCases;
using Emhip.Domain.Entities;
using Emhip.Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Emhip.Application.Guests.Compliance;

/// <summary>One line of a guest's access log: who did what to the record, and when.</summary>
public sealed record GuestAuditEntryDto(
    Guid Id, DateTimeOffset OccurredAt, string ActorName, string Action, string EntityName, string EntityId, string? Details);

/// <summary>
/// Per-guest access log (UK GDPR Art. 5(2) accountability, Art. 15 "recipients"): every read,
/// create, update, delete, export and anonymisation recorded against the record, newest first.
/// </summary>
public sealed record GetGuestAccessLogQuery(Guid HubId, Guid GuestId, int Limit) : IRequest<IReadOnlyList<GuestAuditEntryDto>>;

public sealed class GetGuestAccessLogQueryHandler(IGuestReadService reads) : IRequestHandler<GetGuestAccessLogQuery, IReadOnlyList<GuestAuditEntryDto>>
{
    public Task<IReadOnlyList<GuestAuditEntryDto>> Handle(GetGuestAccessLogQuery request, CancellationToken cancellationToken) =>
        reads.GetAccessLogAsync(request.HubId, request.GuestId, Math.Clamp(request.Limit, 1, 1000), cancellationToken);
}

/// <summary>
/// The subject-access bundle (UK GDPR Art. 15): every section of the record the service holds
/// about the guest, plus the log of who has accessed it. Sections the hub does not use are null.
/// </summary>
public sealed record GuestRecordExportDto(
    DateTimeOffset ExportedAt,
    string ExportedByName,
    string Basis,
    GuestOverviewDto Overview,
    GuestDemographicsDto? Demographics,
    GuestClinicalDto? Clinical,
    GuestPathwayDto? Pathway,
    GuestFollowUpsDto? FollowUps,
    GuestInitialConversationDto? InitialConversation,
    Dialog.GuestDialogDto? Dialog,
    IReadOnlyList<CaseworkNoteDto> CaseworkNotes,
    CarePlans.GuestCarePlansDto CarePlans,
    IReadOnlyList<GuestContactSummaryDto> Contacts,
    IReadOnlyList<Caseload.CaseloadAssignmentDto> CaseloadHistory,
    IReadOnlyList<GuestNoteDto> QuickNotes,
    IReadOnlyList<Actions.GuestActionDto> Actions,
    IReadOnlyList<DocumentListItemDto> Documents,
    IReadOnlyList<UrgentEpisodeSummaryDto> UrgentEpisodes,
    IReadOnlyList<GuestAuditEntryDto> AccessLog);

public sealed record ExportGuestRecordQuery(Guid HubId, Guid GuestId) : IRequest<GuestRecordExportDto?>;

public sealed class ExportGuestRecordQueryHandler(
    IAppDbContext db, IGuestReadService guests, IDocumentReadService documents, IUrgentCaseReadService episodes,
    ICurrentUser currentUser, IAuditTrail audit)
    : IRequestHandler<ExportGuestRecordQuery, GuestRecordExportDto?>
{
    public async Task<GuestRecordExportDto?> Handle(ExportGuestRecordQuery request, CancellationToken cancellationToken)
    {
        var inHub = await db.Guests.AsNoTracking().AnyAsync(g => g.Id == request.GuestId && g.HubId == request.HubId, cancellationToken);
        if (!inHub) return null;

        var overview = await guests.GetOverviewAsync(request.GuestId, cancellationToken);
        if (overview is null) return null;

        var contacts = await guests.GetContactHistoryAsync(request.GuestId, null, 100, cancellationToken);
        var docs = await documents.GetListAsync(request.HubId, null, request.GuestId, null, null, null, false, false, null, 200, cancellationToken);

        var export = new GuestRecordExportDto(
            DateTimeOffset.UtcNow,
            currentUser.DisplayName,
            "Subject access request (UK GDPR Article 15) — full copy of the personal data held about the guest.",
            overview,
            await guests.GetDemographicsAsync(request.GuestId, cancellationToken),
            await guests.GetClinicalAsync(request.GuestId, cancellationToken),
            await guests.GetPathwayAsync(request.GuestId, cancellationToken),
            await guests.GetFollowUpsAsync(request.GuestId, cancellationToken),
            await guests.GetInitialConversationAsync(request.GuestId, cancellationToken),
            await guests.GetDialogAsync(request.GuestId, cancellationToken),
            await guests.GetCaseworkNotesAsync(request.GuestId, cancellationToken),
            await guests.GetCarePlansAsync(request.GuestId, cancellationToken),
            contacts.Items,
            await guests.GetCaseloadHistoryAsync(request.GuestId, cancellationToken),
            await guests.GetNotesAsync(request.GuestId, cancellationToken),
            await guests.GetActionsAsync(request.GuestId, cancellationToken),
            docs.Items,
            await episodes.GetEpisodesForGuestAsync(request.HubId, request.GuestId, cancellationToken),
            await guests.GetAccessLogAsync(request.HubId, request.GuestId, 500, cancellationToken));

        // The export itself is a disclosure — logged twice: on the guest's access log and in the
        // hub's export history alongside the service reports.
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        db.ExportRecords.Add(new ExportRecord(request.HubId, currentUser.StaffId, "SubjectAccess", today, today));
        await db.SaveChangesAsync(cancellationToken);
        await audit.RecordAsync(request.GuestId, AuditAction.Read, "Guest", request.GuestId.ToString(), "Subject access export downloaded", cancellationToken);

        return export;
    }
}

/// <summary>
/// UK GDPR right to erasure (Art. 17) / end of the retention period: irreversibly strips the
/// identifying fields from the guest record, retires their documents to the recycle bin and
/// hides the record. The pseudonymous clinical history stays for the statutory retention period
/// and service reporting. The reason is kept on the audit log, not on the record.
/// </summary>
public sealed record AnonymiseGuestCommand(Guid GuestId, string Reason) : IRequest;

public sealed class AnonymiseGuestCommandValidator : AbstractValidator<AnonymiseGuestCommand>
{
    public AnonymiseGuestCommandValidator()
    {
        RuleFor(x => x.GuestId).NotEmpty();
        RuleFor(x => x.Reason).NotEmpty().MinimumLength(10).MaximumLength(1000)
            .WithMessage("Record why the guest is being anonymised (at least 10 characters) — it is kept on the audit log.");
    }
}

public sealed class AnonymiseGuestCommandHandler(IAppDbContext db, IGuestAnonymiser anonymiser, ICurrentUser currentUser, IAuditTrail audit)
    : IRequestHandler<AnonymiseGuestCommand>
{
    public async Task Handle(AnonymiseGuestCommand request, CancellationToken cancellationToken)
    {
        var guest = await db.Guests.FirstOrDefaultAsync(g => g.Id == request.GuestId && g.HubId == currentUser.HubId, cancellationToken)
            ?? throw new KeyNotFoundException($"Guest {request.GuestId} not found.");

        if (guest.IsUrgent)
            throw new InvalidOperationException("Resolve the guest's open urgent episode before anonymising the record.");

        guest.Anonymise();

        var demographics = await db.GuestDemographics.FirstOrDefaultAsync(d => d.GuestId == guest.Id, cancellationToken);
        demographics?.Anonymise();

        var documents = await db.Documents.Where(d => d.GuestId == guest.Id && !d.IsDeleted).ToListAsync(cancellationToken);
        foreach (var document in documents)
        {
            document.SoftDelete(currentUser.StaffId, "Guest record anonymised");
        }

        await db.SaveChangesAsync(cancellationToken);

        // Denormalised copies of the name (urgent-case queue projection) live outside the aggregate.
        await anonymiser.ScrubProjectionsAsync(guest.Id, cancellationToken);

        await audit.RecordAsync(guest.Id, AuditAction.Update, "Guest", guest.Id.ToString(), $"Record anonymised — {request.Reason}", cancellationToken);
    }
}

using Emhip.Application.Abstractions;
using Emhip.Domain.Entities;
using Emhip.Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Emhip.Application.Guests.Casework;

/// <summary>One action the worker added while writing the note ("Actions arising from this note").</summary>
public sealed record CaseworkActionInput(string Description, DateOnly DueDate, Guid? AssignedToStaffId);

public sealed record CaseworkNoteDto(
    Guid Id,
    Guid GuestId,
    CaseworkNoteCategory? Category,
    CaseworkNoteStatus Status,
    ContactType ContactMethod,
    DateTimeOffset OccurredAt,
    string? Situation,
    string? Background,
    string? Assessment,
    string? Recommendation,
    CaseworkRiskLevel RiskLevel,
    string? RiskNotes,
    bool IsCpnContact,
    CpnSessionType? CpnSessionType,
    int? SessionNumber,
    string? GuestReportedChanges,
    string? ServiceInvolvementChanges,
    string? AdditionalNotes,
    DateOnly? NextContactDate,
    bool NoNextContactRequired,
    bool MdtDiscussionRequested,
    bool CpnReferralRequested,
    string? ActivityType,
    string? Occasion,
    string? AdviceType,
    string AuthorName,
    DateTimeOffset CreatedAt,
    DateTimeOffset? SubmittedAt,
    IReadOnlyList<CaseworkNoteActionDto> Actions,
    IReadOnlyList<CaseworkNoteAttachmentDto> Attachments);

public sealed record CaseworkNoteActionDto(Guid Id, string Description, DateOnly DueDate, bool IsCompleted, string? AssignedToName);

/// <summary>A document attached to the note (uploaded through the Document Management module with the note's id).</summary>
public sealed record CaseworkNoteAttachmentDto(
    Guid DocumentId, string FileName, string ContentType, long SizeBytes, DateTimeOffset UploadedAt, string UploadedByName);

/// <summary>The fields shared by "save draft" and "submit".</summary>
public sealed record CaseworkNoteInput(
    CaseworkNoteCategory? Category,
    ContactType ContactMethod,
    DateTimeOffset OccurredAt,
    string? Situation,
    string? Background,
    string? Assessment,
    string? Recommendation,
    CaseworkRiskLevel RiskLevel,
    string? RiskNotes,
    bool IsCpnContact,
    CpnSessionType? CpnSessionType,
    string? GuestReportedChanges,
    string? ServiceInvolvementChanges,
    string? AdditionalNotes,
    DateOnly? NextContactDate,
    bool MdtDiscussionRequested,
    bool CpnReferralRequested,
    IReadOnlyList<CaseworkActionInput> Actions,
    // "Refer this guest to the CPN" (design): primary reason, urgency and a brief rationale that
    // becomes the permanent referral record. "Add this guest for MDT discussion": reason + detail.
    string? CpnReferralReason = null,
    string? CpnReferralUrgency = null,
    string? CpnReferralRationale = null,
    string? MdtDiscussionReason = null,
    string? MdtDiscussionDetails = null,
    // "No next contact needed" — the explicit opt-out from the mandatory next contact date.
    bool NoNextContactRequired = false,
    // Short-form contact types: Activity (activity + occasion) and AFA (type of advice given).
    string? ActivityType = null,
    string? Occasion = null,
    string? AdviceType = null);

public sealed record SaveCaseworkNoteCommand(Guid GuestId, Guid? NoteId, CaseworkNoteInput Input, bool Submit) : IRequest<Guid>;

public sealed class SaveCaseworkNoteCommandValidator : AbstractValidator<SaveCaseworkNoteCommand>
{
    public SaveCaseworkNoteCommandValidator()
    {
        RuleFor(x => x.GuestId).NotEmpty();
        RuleFor(x => x.Input.CpnReferralReason).NotEmpty()
            .When(x => x.Submit && x.Input.CpnReferralRequested)
            .WithMessage("Select the primary reason for the CPN referral.");
        RuleFor(x => x.Input.MdtDiscussionReason).NotEmpty()
            .When(x => x.Submit && x.Input.MdtDiscussionRequested)
            .WithMessage("Give the reason for requesting MDT discussion.");
        RuleFor(x => x.Input.CpnReferralRationale).MaximumLength(4000);
        RuleFor(x => x.Input.MdtDiscussionDetails).MaximumLength(4000);
        RuleFor(x => x.Input.Situation).MaximumLength(4000);
        RuleFor(x => x.Input.Background).MaximumLength(4000);
        RuleFor(x => x.Input.Assessment).MaximumLength(4000);
        RuleFor(x => x.Input.Recommendation).MaximumLength(4000);
        RuleFor(x => x.Input.GuestReportedChanges).MaximumLength(2000);
        RuleFor(x => x.Input.ServiceInvolvementChanges).MaximumLength(2000);
        RuleFor(x => x.Input.AdditionalNotes).MaximumLength(4000);
        RuleFor(x => x.Input.RiskNotes).MaximumLength(2000);
        RuleFor(x => x.Input.ActivityType).MaximumLength(200);
        RuleFor(x => x.Input.Occasion).MaximumLength(500);
        RuleFor(x => x.Input.AdviceType).MaximumLength(200);

        // The design gates the contact-type chips behind "Is this a CPN contact? = No", so a
        // non-CPN note must carry one and a CPN note must not.
        RuleFor(x => x.Input.Category).NotNull()
            .When(x => x.Submit && !x.Input.IsCpnContact)
            .WithMessage("Select a contact type.");
        RuleFor(x => x.Input.CpnSessionType).NotNull()
            .When(x => x.Submit && x.Input.IsCpnContact)
            .WithMessage("Select a CPN session type.");

        // Every submitted clinical contact books the next one, unless the worker explicitly opts
        // out. The short forms (Activity, Hospitality, AFA) carry no next contact date at all.
        RuleFor(x => x.Input.NextContactDate).NotNull()
            .When(x => x.Submit && IsClinical(x) && !x.Input.NoNextContactRequired)
            .WithMessage("Enter the next contact date, or tick \"No next contact needed\".");

        // Drafts are deliberately unvalidated beyond lengths — the point of a draft is that it
        // can be incomplete. The assessment requirement is enforced on submit by the aggregate.
        RuleFor(x => x.Input.Assessment).NotEmpty()
            .When(x => x.Submit && IsClinical(x))
            .WithMessage("An assessment is required to submit a casework note.");

        // "Activity *": a listed hub activity, or the free-text occasion when it is not listed.
        RuleFor(x => x.Input.ActivityType)
            .Must((x, activity) => !string.IsNullOrWhiteSpace(activity) || !string.IsNullOrWhiteSpace(x.Input.Occasion))
            .When(x => x.Submit && !x.Input.IsCpnContact && x.Input.Category == CaseworkNoteCategory.Activity)
            .WithMessage("Select the hub activity the guest attended, or describe the occasion if it is not listed.");

        RuleForEach(x => x.Input.Actions).ChildRules(action =>
            action.RuleFor(a => a.Description).NotEmpty().MaximumLength(500));
    }

    private static bool IsClinical(SaveCaseworkNoteCommand x) =>
        CaseworkNote.IsClinicalNote(x.Input.IsCpnContact, x.Input.Category);
}

/// <summary>
/// Saves a draft or submits a finished note. Submission is the point where the note becomes part
/// of the clinical record: it writes the linked Contact so the activity log shows it, creates any
/// actions the worker added, and schedules the next contact when one was set.
/// </summary>
public sealed class SaveCaseworkNoteCommandHandler(IAppDbContext db, ICurrentUser currentUser) : IRequestHandler<SaveCaseworkNoteCommand, Guid>
{
    public async Task<Guid> Handle(SaveCaseworkNoteCommand request, CancellationToken cancellationToken)
    {
        var guestExists = await db.Guests.AsNoTracking().AnyAsync(g => g.Id == request.GuestId, cancellationToken);
        if (!guestExists) throw new KeyNotFoundException($"Guest {request.GuestId} not found.");

        var input = request.Input;
        CaseworkNote note;

        if (request.NoteId is not null)
        {
            note = await db.CaseworkNotes.FirstOrDefaultAsync(n => n.Id == request.NoteId && n.GuestId == request.GuestId, cancellationToken)
                ?? throw new KeyNotFoundException($"Casework note {request.NoteId} not found.");
        }
        else
        {
            note = new CaseworkNote(request.GuestId, currentUser.StaffId, input.Category, input.ContactMethod, input.OccurredAt);
            db.CaseworkNotes.Add(note);
        }

        note.Update(
            input.Category, input.ContactMethod, input.OccurredAt,
            input.Situation, input.Background, input.Assessment, input.Recommendation,
            input.RiskLevel, input.GuestReportedChanges, input.ServiceInvolvementChanges,
            input.AdditionalNotes, input.NextContactDate, input.MdtDiscussionRequested, input.CpnReferralRequested,
            input.IsCpnContact, input.CpnSessionType, input.RiskNotes, input.NoNextContactRequired,
            input.ActivityType, input.Occasion, input.AdviceType);

        if (request.Submit)
        {
            // "Follow-up session N" counts the CPN notes already on the record, so the number the
            // reader sees in the history is the one stamped here.
            if (input.IsCpnContact)
            {
                var priorSessions = await db.CaseworkNotes.AsNoTracking().CountAsync(
                    n => n.GuestId == request.GuestId && n.IsCpnContact
                         && n.Status == CaseworkNoteStatus.Submitted && n.Id != note.Id,
                    cancellationToken);
                note.SetSessionNumber(priorSessions + 1);
            }

            var contact = new Contact(
                request.GuestId, input.ContactMethod, ContactOutcome.Successful, input.OccurredAt,
                currentUser.StaffId, BuildContactSummary(input));

            db.Contacts.Add(contact);
            note.Submit(contact.Id);

            // A submitted note is a contact, so it is activity too: it stamps the last activity
            // date and brings an Inactive guest back to Active (spec §4.6 / §4.7), exactly as
            // AddContactCommand does for a logged contact.
            var guest = await db.Guests.FirstOrDefaultAsync(g => g.Id == request.GuestId, cancellationToken);
            guest?.RecordActivity(input.OccurredAt);

            foreach (var action in input.Actions)
            {
                db.GuestActions.Add(new GuestAction(
                    request.GuestId, action.Description, action.DueDate, action.AssignedToStaffId ?? currentUser.StaffId));
            }

            if (note.NextContactDate is { } nextContact)
            {
                db.FollowUps.Add(new FollowUp(
                    request.GuestId, nextContact, currentUser.StaffId,
                    $"Next contact agreed in casework note of {input.OccurredAt:dd MMM yyyy}."));
            }

            // The two toggles land on the Hub Manager's MDT queue. A CPN referral does not bypass
            // the MDT: the CPN is only allocated once the manager confirms it there.
            if (input.CpnReferralRequested)
            {
                await Mdt.MdtQueueRaiser.RaiseAsync(
                    db, request.GuestId, MdtQueueKind.CpnReferral, currentUser.StaffId,
                    input.CpnReferralReason ?? "CPN referral requested from casework note",
                    input.CpnReferralRationale, input.CpnReferralUrgency, note.Id, cancellationToken);
            }
            if (input.MdtDiscussionRequested)
            {
                await Mdt.MdtQueueRaiser.RaiseAsync(
                    db, request.GuestId, MdtQueueKind.DiscussionRequest, currentUser.StaffId,
                    input.MdtDiscussionReason ?? "MDT discussion requested from casework note",
                    input.MdtDiscussionDetails, null, note.Id, cancellationToken);
            }
        }

        await db.SaveChangesAsync(cancellationToken);
        return note.Id;
    }

    /// <summary>The contact's note field carries a readable digest of the SBAR record.</summary>
    private static string BuildContactSummary(CaseworkNoteInput input)
    {
        var parts = new List<string>
        {
            input.IsCpnContact ? "CPN contact session" : input.Category switch
            {
                CaseworkNoteCategory.Activity => "Activity contact",
                CaseworkNoteCategory.Hospitality => "Hospitality contact",
                CaseworkNoteCategory.Afa => "AFA contact",
                _ => $"{input.Category} note",
            },
        };
        if (!string.IsNullOrWhiteSpace(input.ActivityType)) parts.Add($"Activity: {input.ActivityType}");
        if (!string.IsNullOrWhiteSpace(input.Occasion)) parts.Add($"Occasion: {input.Occasion}");
        if (!string.IsNullOrWhiteSpace(input.AdviceType)) parts.Add($"Advice given: {input.AdviceType}");
        if (!string.IsNullOrWhiteSpace(input.Assessment)) parts.Add($"Assessment: {input.Assessment}");
        if (!string.IsNullOrWhiteSpace(input.Recommendation)) parts.Add($"Recommendation: {input.Recommendation}");
        if (input.RiskLevel != CaseworkRiskLevel.NoRiskDetected) parts.Add($"Risk: {input.RiskLevel}");

        var summary = string.Join(" — ", parts);
        return summary.Length > 1900 ? summary[..1900] + "…" : summary;
    }
}

public sealed record DeleteCaseworkNoteCommand(Guid GuestId, Guid NoteId) : IRequest;

/// <summary>Discards a draft. Submitted notes are part of the clinical record and cannot be removed.</summary>
public sealed class DeleteCaseworkNoteCommandHandler(IAppDbContext db) : IRequestHandler<DeleteCaseworkNoteCommand>
{
    public async Task Handle(DeleteCaseworkNoteCommand request, CancellationToken cancellationToken)
    {
        var note = await db.CaseworkNotes.FirstOrDefaultAsync(n => n.Id == request.NoteId && n.GuestId == request.GuestId, cancellationToken)
            ?? throw new KeyNotFoundException($"Casework note {request.NoteId} not found.");

        if (note.IsSubmitted)
        {
            throw new InvalidOperationException("A submitted casework note is part of the clinical record and cannot be deleted.");
        }

        db.CaseworkNotes.Remove(note);
        await db.SaveChangesAsync(cancellationToken);
    }
}

public sealed record GetCaseworkNotesQuery(Guid GuestId) : IRequest<IReadOnlyList<CaseworkNoteDto>>;

public sealed class GetCaseworkNotesQueryHandler(IGuestReadService reads) : IRequestHandler<GetCaseworkNotesQuery, IReadOnlyList<CaseworkNoteDto>>
{
    public Task<IReadOnlyList<CaseworkNoteDto>> Handle(GetCaseworkNotesQuery request, CancellationToken cancellationToken) =>
        reads.GetCaseworkNotesAsync(request.GuestId, cancellationToken);
}

/// <summary>
/// Removes an attachment from a draft note. The document is soft-deleted (recoverable from the
/// recycle bin by a manager); once the note is submitted its attachments are part of the record
/// and can only be retired through the Documents register with the delete permission.
/// </summary>
public sealed record RemoveCaseworkNoteAttachmentCommand(Guid GuestId, Guid NoteId, Guid DocumentId) : IRequest;

public sealed class RemoveCaseworkNoteAttachmentCommandHandler(IAppDbContext db, ICurrentUser currentUser)
    : IRequestHandler<RemoveCaseworkNoteAttachmentCommand>
{
    public async Task Handle(RemoveCaseworkNoteAttachmentCommand request, CancellationToken cancellationToken)
    {
        var note = await db.CaseworkNotes.AsNoTracking()
            .FirstOrDefaultAsync(n => n.Id == request.NoteId && n.GuestId == request.GuestId, cancellationToken)
            ?? throw new KeyNotFoundException($"Casework note {request.NoteId} not found.");

        if (note.Status != CaseworkNoteStatus.Draft)
            throw new InvalidOperationException("Attachments on a submitted note are part of the clinical record and cannot be removed here.");
        if (note.AuthorStaffId != currentUser.StaffId)
            throw new InvalidOperationException("Only the note's author can remove its attachments.");

        var document = await db.Documents
            .FirstOrDefaultAsync(d => d.Id == request.DocumentId && d.CaseworkNoteId == request.NoteId && !d.IsDeleted, cancellationToken)
            ?? throw new KeyNotFoundException($"Attachment {request.DocumentId} not found on this note.");

        document.SoftDelete(currentUser.StaffId, "Removed from draft casework note");
        await db.SaveChangesAsync(cancellationToken);
    }
}

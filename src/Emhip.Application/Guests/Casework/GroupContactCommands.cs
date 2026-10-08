using Emhip.Application.Abstractions;
using Emhip.Domain.Entities;
using Emhip.Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Emhip.Application.Guests.Casework;

/// <summary>One guest at a group activity or hospitality session, with their own risk check.</summary>
public sealed record GroupContactAttendee(Guid GuestId, bool HighRisk = false);

/// <summary>
/// Logs one Activity or Hospitality contact for several guests at once (customer feedback, Oct
/// 2026: a session can have ten guests, and opening ten profiles to log it is not workable).
/// <see cref="Category"/> must be Activity or Hospitality — the two short forms that happen at the
/// hub, in person, with no clinical note. Activity's risk check is per guest; everything else
/// (date, activity, occasion, notes) is shared.
/// </summary>
public sealed record LogGroupContactCommand(
    CaseworkNoteCategory Category,
    DateTimeOffset OccurredAt,
    IReadOnlyList<GroupContactAttendee> Attendees,
    string? ActivityType,
    string? Occasion,
    string? Notes) : IRequest<GroupContactResult>;

/// <summary>The notes written, one per guest, in the order the attendees were sent.</summary>
public sealed record GroupContactResult(int Logged, IReadOnlyList<Guid> NoteIds);

public sealed class LogGroupContactCommandValidator : AbstractValidator<LogGroupContactCommand>
{
    /// <summary>A generous ceiling for one session — it bounds the size of a single save.</summary>
    public const int MaxAttendees = 60;

    public LogGroupContactCommandValidator()
    {
        RuleFor(x => x.Category)
            .Must(c => c is CaseworkNoteCategory.Activity or CaseworkNoteCategory.Hospitality)
            .WithMessage("Only Activity and Hospitality contacts can be logged for a group.");
        RuleFor(x => x.OccurredAt).LessThanOrEqualTo(_ => DateTimeOffset.UtcNow.AddMinutes(5))
            .WithMessage("The contact date cannot be in the future.");
        RuleFor(x => x.Attendees).NotEmpty().WithMessage("Add the guests who attended.");
        RuleFor(x => x.Attendees.Count).LessThanOrEqualTo(MaxAttendees)
            .WithMessage($"A group contact can include up to {MaxAttendees} guests.");
        RuleFor(x => x.Attendees)
            .Must(a => a.Select(g => g.GuestId).Distinct().Count() == a.Count)
            .WithMessage("Each guest can only be added once.");
        RuleForEach(x => x.Attendees).ChildRules(a => a.RuleFor(g => g.GuestId).NotEmpty());
        RuleFor(x => x.ActivityType).MaximumLength(200);
        RuleFor(x => x.Occasion).MaximumLength(500);
        RuleFor(x => x.Notes).MaximumLength(4000);
        RuleFor(x => x.ActivityType)
            .Must((x, activity) => !string.IsNullOrWhiteSpace(activity) || !string.IsNullOrWhiteSpace(x.Occasion))
            .When(x => x.Category == CaseworkNoteCategory.Activity)
            .WithMessage("Select the hub activity, or describe the occasion if it is not listed.");
    }
}

/// <summary>
/// Writes, for every attendee, exactly what a single Activity / Hospitality contact writes: a
/// submitted note, its linked Contact, and the activity stamp that brings an Inactive guest back to
/// Active. One save, so the group is logged for everyone or for no one. Attendees must be guests of
/// the caller's hub.
/// </summary>
public sealed class LogGroupContactCommandHandler(IAppDbContext db, ICurrentUser currentUser)
    : IRequestHandler<LogGroupContactCommand, GroupContactResult>
{
    public async Task<GroupContactResult> Handle(LogGroupContactCommand request, CancellationToken cancellationToken)
    {
        var ids = request.Attendees.Select(a => a.GuestId).ToList();
        var guests = await db.Guests
            .Where(g => ids.Contains(g.Id) && g.HubId == currentUser.HubId && !g.IsDeleted)
            .ToDictionaryAsync(g => g.Id, cancellationToken);
        if (guests.Count != ids.Count)
        {
            throw new KeyNotFoundException("One or more of the selected guests could not be found.");
        }

        var isActivity = request.Category == CaseworkNoteCategory.Activity;
        var noteIds = new List<Guid>(ids.Count);
        foreach (var attendee in request.Attendees)
        {
            var input = new CaseworkNoteInput(
                request.Category, ContactType.InPerson, request.OccurredAt,
                Situation: null, Background: null, Assessment: null, Recommendation: null,
                // Hospitality has no risk check (design); Activity's is the attendee's own.
                RiskLevel: isActivity && attendee.HighRisk ? CaseworkRiskLevel.High : CaseworkRiskLevel.NoRiskDetected,
                RiskNotes: null, IsCpnContact: false, CpnSessionType: null,
                GuestReportedChanges: null, ServiceInvolvementChanges: null,
                AdditionalNotes: string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim(),
                NextContactDate: null, MdtDiscussionRequested: false, CpnReferralRequested: false, Actions: [],
                ActivityType: isActivity && !string.IsNullOrWhiteSpace(request.ActivityType) ? request.ActivityType.Trim() : null,
                Occasion: isActivity && !string.IsNullOrWhiteSpace(request.Occasion) ? request.Occasion.Trim() : null);

            var note = new CaseworkNote(attendee.GuestId, currentUser.StaffId, input.Category, input.ContactMethod, input.OccurredAt);
            note.Update(
                input.Category, input.ContactMethod, input.OccurredAt,
                null, null, null, null, input.RiskLevel, null, null, input.AdditionalNotes, null, false, false,
                activityType: input.ActivityType, occasion: input.Occasion);
            db.CaseworkNotes.Add(note);

            var summary = SaveCaseworkNoteCommandHandler.BuildContactSummary(input);
            var contact = new Contact(
                attendee.GuestId, input.ContactMethod, ContactOutcome.Successful, input.OccurredAt, currentUser.StaffId,
                $"{summary} — logged for a group of {ids.Count}");
            db.Contacts.Add(contact);
            note.Submit(contact.Id);

            guests[attendee.GuestId].RecordActivity(input.OccurredAt);
            noteIds.Add(note.Id);
        }

        await db.SaveChangesAsync(cancellationToken);
        return new GroupContactResult(noteIds.Count, noteIds);
    }
}

using Emhip.Application.Abstractions;
using Emhip.Domain.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Emhip.Application.Guests.Dialog;

/// <summary>Records the next DIALOG assessment version for a guest (version 1 = baseline).</summary>
public sealed record RecordDialogAssessmentCommand(
    Guid GuestId,
    int MentalHealth, int PhysicalHealth, int JobSituation, int Accommodation,
    int LeisureActivities, int FriendshipsSocialLife, int RelationshipWithFamily,
    int PersonalSafety, int PracticalHelp, int Medication, int MeetingsWithMhStaff) : IRequest<Guid>;

public sealed class RecordDialogAssessmentCommandValidator : AbstractValidator<RecordDialogAssessmentCommand>
{
    public RecordDialogAssessmentCommandValidator()
    {
        RuleFor(x => x.GuestId).NotEmpty();
        foreach (var score in new (string Name, Func<RecordDialogAssessmentCommand, int> Get)[]
        {
            ("MentalHealth", x => x.MentalHealth), ("PhysicalHealth", x => x.PhysicalHealth),
            ("JobSituation", x => x.JobSituation), ("Accommodation", x => x.Accommodation),
            ("LeisureActivities", x => x.LeisureActivities), ("FriendshipsSocialLife", x => x.FriendshipsSocialLife),
            ("RelationshipWithFamily", x => x.RelationshipWithFamily), ("PersonalSafety", x => x.PersonalSafety),
            ("PracticalHelp", x => x.PracticalHelp), ("Medication", x => x.Medication),
            ("MeetingsWithMhStaff", x => x.MeetingsWithMhStaff),
        })
        {
            RuleFor(x => score.Get(x)).InclusiveBetween(1, 7).OverridePropertyName(score.Name)
                .WithMessage($"{score.Name} must be a DIALOG score between 1 and 7.");
        }
    }
}

public sealed class RecordDialogAssessmentCommandHandler(IAppDbContext db, ICurrentUser currentUser)
    : IRequestHandler<RecordDialogAssessmentCommand, Guid>
{
    public async Task<Guid> Handle(RecordDialogAssessmentCommand request, CancellationToken cancellationToken)
    {
        var lastVersion = await db.DialogAssessments
            .Where(d => d.GuestId == request.GuestId)
            .MaxAsync(d => (int?)d.Version, cancellationToken) ?? 0;

        var assessment = new DialogAssessment(
            request.GuestId, lastVersion + 1, currentUser.StaffId,
            request.MentalHealth, request.PhysicalHealth, request.JobSituation, request.Accommodation,
            request.LeisureActivities, request.FriendshipsSocialLife, request.RelationshipWithFamily,
            request.PersonalSafety, request.PracticalHelp, request.Medication, request.MeetingsWithMhStaff);

        db.DialogAssessments.Add(assessment);
        await db.SaveChangesAsync(cancellationToken);
        return assessment.Id;
    }
}

public sealed record DialogAssessmentDto(
    Guid Id, int Version, DateTimeOffset AssessedAt, string AssessedByName,
    int MentalHealth, int PhysicalHealth, int JobSituation, int Accommodation,
    int LeisureActivities, int FriendshipsSocialLife, int RelationshipWithFamily,
    int PersonalSafety, int PracticalHelp, int Medication, int MeetingsWithMhStaff,
    int Total);

/// <summary>Workspace DIALOG tab: baseline (version 1), latest, and the full score history.</summary>
public sealed record GuestDialogDto(
    DialogAssessmentDto? Baseline,
    DialogAssessmentDto? Latest,
    IReadOnlyList<DialogAssessmentDto> History);

public sealed record GetGuestDialogQuery(Guid GuestId) : IRequest<GuestDialogDto?>;

public sealed class GetGuestDialogQueryHandler(IGuestReadService reads) : IRequestHandler<GetGuestDialogQuery, GuestDialogDto?>
{
    public Task<GuestDialogDto?> Handle(GetGuestDialogQuery request, CancellationToken cancellationToken) =>
        reads.GetDialogAsync(request.GuestId, cancellationToken);
}

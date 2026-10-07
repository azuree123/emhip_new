using System.Text;
using Emhip.Application.Abstractions;
using Emhip.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Emhip.Application.Guests.CarePlans;

/// <summary>Display text for the care plan's enum answers — the client mirrors these in the Care Plan tab.</summary>
public static class CarePlanLabels
{
    public static string NhsReferral(CarePlanNhsReferral? value) => value switch
    {
        CarePlanNhsReferral.NotAppropriate => "No — not appropriate",
        CarePlanNhsReferral.Discussed => "Discussed — not yet referred",
        CarePlanNhsReferral.Made => "Yes — referral made",
        CarePlanNhsReferral.Declined => "Offered — guest declined",
        _ => "Not recorded",
    };

    public static string GoalStatus(CarePlanGoalStatus status) => status switch
    {
        CarePlanGoalStatus.NotStarted => "Not started",
        CarePlanGoalStatus.InProgress => "In progress",
        CarePlanGoalStatus.Achieved => "Achieved",
        CarePlanGoalStatus.Discontinued => "Discontinued",
        _ => status.ToString(),
    };

    public static string PlanStatus(CarePlanStatus status) => status switch
    {
        CarePlanStatus.Active => "Active",
        CarePlanStatus.Completed => "Closed",
        CarePlanStatus.Superseded => "Superseded",
        _ => status.ToString(),
    };
}

/// <summary>"Export Plan" — a plain-text copy of one of the guest's care plans. Logged as an export against the guest.</summary>
public sealed record ExportCarePlanQuery(Guid GuestId, Guid CarePlanId) : IRequest<CarePlanExportDto?>;

public sealed record CarePlanExportDto(string FileName, string Content);

public sealed class ExportCarePlanQueryHandler(IAppDbContext db, IGuestReadService reads, IAuditTrail audit)
    : IRequestHandler<ExportCarePlanQuery, CarePlanExportDto?>
{
    public async Task<CarePlanExportDto?> Handle(ExportCarePlanQuery request, CancellationToken cancellationToken)
    {
        var guest = await db.Guests.AsNoTracking()
            .Where(g => g.Id == request.GuestId)
            .Select(g => new { g.FirstName, g.LastName, g.GuestNumber })
            .FirstOrDefaultAsync(cancellationToken);
        if (guest is null) return null;

        var plans = await reads.GetCarePlansAsync(request.GuestId, cancellationToken);
        var plan = (plans.Current is null ? plans.History : plans.History.Prepend(plans.Current))
            .FirstOrDefault(p => p.Id == request.CarePlanId);
        if (plan is null) return null;

        await audit.RecordAsync(request.GuestId, AuditAction.Read, "CarePlan", plan.Id.ToString(), "Care plan exported", cancellationToken);

        return new CarePlanExportDto(
            $"care-plan-G-{guest.GuestNumber}-{plan.StartedOn:yyyy-MM-dd}.txt",
            CarePlanText.Build(plan, $"{guest.FirstName} {guest.LastName}", guest.GuestNumber));
    }
}

/// <summary>Renders a care plan as the plain-text document behind "Export Plan", in the order of the Care Plan form.</summary>
public static class CarePlanText
{
    public static string Build(CarePlanDto plan, string guestName, int guestNumber)
    {
        var sb = new StringBuilder();
        string Date(DateOnly? d) => d is null ? "—" : d.Value.ToString("dd MMM yyyy");
        string YesNo(bool? b) => b is null ? "Not recorded" : b.Value ? "Yes" : "No";

        void Section(string heading, string? body)
        {
            sb.AppendLine(heading);
            var text = string.IsNullOrWhiteSpace(body) ? "Not recorded." : body.Trim();
            foreach (var line in text.ReplaceLineEndings("\n").Split('\n')) sb.AppendLine($"  {line}");
            sb.AppendLine();
        }

        sb.AppendLine("CARE PLAN");
        sb.AppendLine($"{CarePlanLabels.PlanStatus(plan.Status)} · Created {Date(plan.StartedOn)} by {plan.CreatedByName}"
            + (plan.ClosedOn is null ? "" : $" · Closed {Date(plan.ClosedOn)}"));
        sb.AppendLine($"Guest: {guestName} (G-{guestNumber})");
        sb.AppendLine($"Exported: {DateTimeOffset.UtcNow:dd MMM yyyy · HH:mm} UTC");
        sb.AppendLine();

        Section("WHAT DOES THE GUEST WANT TO WORK ON?", plan.GuestVoice);
        Section("WHAT SUPPORT WILL WE PROVIDE?", plan.SupportArrangements);
        Section("WHAT WILL THE GUEST DO BETWEEN SESSIONS?", plan.BetweenSessions);
        Section("REFERRALS MADE OR PLANNED", plan.Referrals);

        sb.AppendLine("GOALS");
        if (plan.Goals.Count == 0) sb.AppendLine("  No goals recorded.");
        foreach (var (goal, index) in plan.Goals.OrderBy(g => g.SortOrder).Select((g, i) => (g, i)))
        {
            sb.AppendLine($"  {index + 1}. {goal.Description} [{CarePlanLabels.GoalStatus(goal.Status)}]"
                + (goal.TargetDate is null ? "" : $" — target {Date(goal.TargetDate)}"));
            if (string.IsNullOrWhiteSpace(goal.ProgressNote)) continue;
            foreach (var line in goal.ProgressNote.Trim().ReplaceLineEndings("\n").Split('\n')) sb.AppendLine($"     {line}");
        }
        sb.AppendLine();

        sb.AppendLine("REVIEW & NEXT STEPS");
        sb.AppendLine($"  Date of next contact:       {Date(plan.NextContactOn)}");
        sb.AppendLine($"  MDT review date:            {Date(plan.ReviewDueOn)}{(plan.IsReviewOverdue ? " (overdue)" : "")}");
        sb.AppendLine($"  CPN involvement required:   {YesNo(plan.CpnInvolvementRequired)}");
        sb.AppendLine($"  NHS referral:               {CarePlanLabels.NhsReferral(plan.NhsReferral)}");
        sb.AppendLine();

        Section("OTHER NOTES FOR THE RECORD", plan.OtherNotes);
        return sb.ToString().TrimEnd() + Environment.NewLine;
    }
}

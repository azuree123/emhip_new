using Emhip.Domain.Entities;
using Emhip.Domain.Events;
using Xunit;

namespace Emhip.UnitTests.Domain;

public class RiskAssessmentTests
{
    [Fact]
    public void Raises_RiskFlagRaisedEvent_when_any_flag_is_set()
    {
        var assessment = new RiskAssessment(
            guestId: Guid.NewGuid(), version: 1, assessedByStaffId: Guid.NewGuid(),
            suicidalIdeation: true, selfHarm: false, riskToOthers: false, severeDeterioration: false, safeguardingConcern: false,
            notes: null);

        Assert.True(assessment.HasAnyFlag);
        var raised = Assert.Single(assessment.DomainEvents);
        Assert.IsType<RiskFlagRaisedEvent>(raised);
    }

    [Fact]
    public void Does_not_raise_event_when_no_flags_are_set()
    {
        var assessment = new RiskAssessment(
            guestId: Guid.NewGuid(), version: 1, assessedByStaffId: Guid.NewGuid(),
            suicidalIdeation: false, selfHarm: false, riskToOthers: false, severeDeterioration: false, safeguardingConcern: false,
            notes: "routine check-in");

        Assert.False(assessment.HasAnyFlag);
        Assert.Empty(assessment.DomainEvents);
    }
}

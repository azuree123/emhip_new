using Emhip.Application.Abstractions;
using Microsoft.EntityFrameworkCore;

namespace Emhip.Infrastructure.Persistence;

public sealed class GuestAnonymiser(EmhipDbContext db) : IGuestAnonymiser
{
    public async Task ScrubProjectionsAsync(Guid guestId, CancellationToken cancellationToken = default)
    {
        var readModel = await db.UrgentCases.FirstOrDefaultAsync(u => u.GuestId == guestId, cancellationToken);
        if (readModel is null) return;

        readModel.GuestName = "Anonymised guest";
        readModel.AssignedCmhwName = null;
        readModel.IsActive = false;
        await db.SaveChangesAsync(cancellationToken);
    }
}

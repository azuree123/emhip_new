using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Emhip.Infrastructure.Persistence;

/// <summary>
/// Design-time factory so `dotnet ef migrations add` works without a running host or a live
/// database — the connection string here is only used to generate migration SQL, never to
/// open a connection.
/// </summary>
public sealed class EmhipDbContextFactory : IDesignTimeDbContextFactory<EmhipDbContext>
{
    public EmhipDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<EmhipDbContext>();
        optionsBuilder.UseSqlServer("Server=(local);Database=Emhip;Trusted_Connection=True;TrustServerCertificate=True;");
        return new EmhipDbContext(optionsBuilder.Options);
    }
}

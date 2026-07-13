using System.Data;

namespace Emhip.Infrastructure.Persistence;

/// <summary>Raw ADO.NET connections for the Dapper read side — kept separate from the EF Core write-side DbContext.</summary>
public interface ISqlConnectionFactory
{
    IDbConnection CreateConnection();
}

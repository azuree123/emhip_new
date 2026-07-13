using System.Data;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Options;

namespace Emhip.Infrastructure.Persistence;

public sealed class SqlConnectionFactory(IOptions<EmhipConnectionOptions> options) : ISqlConnectionFactory
{
    public IDbConnection CreateConnection() => new SqlConnection(options.Value.ConnectionString);
}

public sealed class EmhipConnectionOptions
{
    public const string SectionName = "ConnectionStrings";
    public string ConnectionString { get; set; } = default!;
}

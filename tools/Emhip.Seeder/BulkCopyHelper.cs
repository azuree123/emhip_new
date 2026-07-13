using Microsoft.Data.SqlClient;

namespace Emhip.Seeder;

/// <summary>
/// Thin wrapper around SqlBulkCopy — the "SqlBulkCopy for imports" tool called out in
/// ARCHITECTURE.md. Column names in the DataTable must match the destination table exactly;
/// server-generated columns (e.g. Guests.RowVersion) must not be included.
/// </summary>
internal static class BulkCopyHelper
{
    public static async Task WriteAsync(SqlConnection connection, string tableName, System.Data.DataTable table)
    {
        using var bulkCopy = new SqlBulkCopy(connection)
        {
            DestinationTableName = tableName,
            BatchSize = 5000,
            BulkCopyTimeout = 120,
        };

        foreach (System.Data.DataColumn column in table.Columns)
        {
            bulkCopy.ColumnMappings.Add(column.ColumnName, column.ColumnName);
        }

        await bulkCopy.WriteToServerAsync(table);
    }
}

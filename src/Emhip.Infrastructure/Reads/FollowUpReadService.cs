using Dapper;
using Emhip.Application.Common;
using Emhip.Application.FollowUps;
using Emhip.Infrastructure.Persistence;

namespace Emhip.Infrastructure.Reads;

/// <summary>Global Follow-up queue — keyset-paginated on (DueDate, Id), per ARCHITECTURE.md.</summary>
public sealed class FollowUpReadService(ISqlConnectionFactory connectionFactory) : IFollowUpReadService
{
    private sealed record FollowUpCursor(DateOnly DueDate, Guid Id);

    public async Task<KeysetPage<FollowUpQueueItemDto>> GetQueueAsync(
        Guid hubId, bool overdueOnly, Guid? assigneeStaffId, string? cursor, int pageSize, CancellationToken cancellationToken = default)
    {
        var decodedCursor = KeysetCursor.Decode<FollowUpCursor>(cursor);

        const string sql = """
            SELECT TOP (@FetchSize)
                f.Id, f.GuestId, g.FirstName + ' ' + g.LastName AS GuestName, f.DueDate, f.Status,
                s.DisplayName AS AssigneeName,
                CASE WHEN f.Status = 'Scheduled' AND f.DueDate < CAST(SYSUTCDATETIME() AS date) THEN 1 ELSE 0 END AS IsOverdue
            FROM FollowUps f
            JOIN Guests g ON g.Id = f.GuestId
            JOIN AspNetUsers s ON s.Id = f.AssigneeStaffId
            WHERE g.HubId = @HubId
                AND (@AssigneeStaffId IS NULL OR f.AssigneeStaffId = @AssigneeStaffId)
                AND (
                    @OverdueOnly = 0
                    OR (f.Status = 'Scheduled' AND f.DueDate < CAST(SYSUTCDATETIME() AS date))
                    OR f.Status = 'Overdue'
                )
                AND (
                    @HasCursor = 0
                    OR f.DueDate > @DueDate
                    OR (f.DueDate = @DueDate AND f.Id > @Id)
                )
            ORDER BY f.DueDate, f.Id
            """;

        using var connection = connectionFactory.CreateConnection();
        var rows = (await connection.QueryAsync<FollowUpRow>(sql, new
        {
            HubId = hubId,
            AssigneeStaffId = assigneeStaffId,
            OverdueOnly = overdueOnly,
            HasCursor = decodedCursor is not null,
            DueDate = decodedCursor?.DueDate.ToDateTime(TimeOnly.MinValue) ?? DateTime.MinValue,
            Id = decodedCursor?.Id ?? Guid.Empty,
            FetchSize = pageSize + 1,
        })).ToList();

        var hasMore = rows.Count > pageSize;
        var page = rows.Take(pageSize).ToList();
        var nextCursor = hasMore
            ? KeysetCursor.Encode(new FollowUpCursor(DateOnly.FromDateTime(page[^1].DueDate), page[^1].Id))
            : null;

        return new KeysetPage<FollowUpQueueItemDto>
        {
            Items = page.Select(r => new FollowUpQueueItemDto(
                r.Id, r.GuestId, r.GuestName, DateOnly.FromDateTime(r.DueDate), r.Status, r.AssigneeName, r.IsOverdue)).ToList(),
            NextCursor = nextCursor,
            HasMore = hasMore,
        };
    }

    private sealed class FollowUpRow
    {
        public Guid Id { get; set; }
        public Guid GuestId { get; set; }
        public string GuestName { get; set; } = default!;
        public DateTime DueDate { get; set; }
        public string Status { get; set; } = default!;
        public string AssigneeName { get; set; } = default!;
        public bool IsOverdue { get; set; }
    }
}

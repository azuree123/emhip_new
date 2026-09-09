using Emhip.Domain.Enums;

namespace Emhip.Application.Abstractions;

/// <summary>
/// Explicit audit-trail writes for the events the automatic hooks cannot see: reads that are not
/// under /guests/{id} (urgent episodes, document downloads), record exports, and anonymisation.
/// Writes (create/update/delete) are still captured automatically by AuditSaveChangesInterceptor.
/// </summary>
public interface IAuditTrail
{
    /// <summary>Appends one event and saves it immediately (its own unit of work, so a failed request still leaves a trace).</summary>
    Task RecordAsync(Guid? guestId, AuditAction action, string entityName, string entityId, string? details, CancellationToken cancellationToken = default);
}

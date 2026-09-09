namespace Emhip.Application.Abstractions;

/// <summary>
/// Infrastructure-side half of guest anonymisation: scrubs the denormalised read models (which
/// the Application layer cannot see) once the aggregate itself has been anonymised.
/// </summary>
public interface IGuestAnonymiser
{
    Task ScrubProjectionsAsync(Guid guestId, CancellationToken cancellationToken = default);
}

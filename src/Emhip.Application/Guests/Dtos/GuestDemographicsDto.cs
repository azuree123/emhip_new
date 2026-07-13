namespace Emhip.Application.Guests.Dtos;

public sealed record GuestDemographicsDto(
    Guid GuestId,
    string? Ethnicity,
    string? Nationality,
    string? PreferredLanguage,
    bool InterpreterNeeded,
    string? HousingStatus,
    string? EmploymentStatus,
    string? EmergencyContactName,
    string? EmergencyContactPhone,
    string? EmergencyContactRelationship,
    string? GpName,
    string? GpPractice,
    string? NhsNumber);

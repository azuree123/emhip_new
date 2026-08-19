using System.Globalization;
using Emhip.Application.Abstractions;
using Emhip.Domain.Entities;
using Emhip.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Emhip.Application.Migration;

public sealed record ImportRowError(int RowNumber, string Column, string Message);

public sealed record ImportResultDto(
    bool DryRun,
    int RowsRead,
    int GuestsCreated,
    int GuestsUpdated,
    int NotesCreated,
    int DialogAssessmentsCreated,
    IReadOnlyList<ImportRowError> Errors)
{
    public bool Succeeded => Errors.Count == 0;
}

/// <summary>
/// Legacy data migration (spec §7). Takes a CSV export of the old InForm records and creates
/// guests with their demographics, history and DIALOG scores, preserving the original
/// timestamps rather than stamping everything with the import date.
///
/// Always run with <paramref name="DryRun"/> first: it validates and reports every bad row
/// without writing, so a broken export can be fixed before touching the live database.
/// Re-running is safe — a row whose legacy reference already exists updates that guest instead
/// of creating a duplicate.
/// </summary>
public sealed record ImportGuestsCommand(string Csv, bool DryRun) : IRequest<ImportResultDto>;

public sealed class ImportGuestsCommandHandler(IAppDbContext db, ICurrentUser currentUser) : IRequestHandler<ImportGuestsCommand, ImportResultDto>
{
    /// <summary>
    /// Recognised columns. Only first name, last name and date of birth are required; everything
    /// else is filled when present, so a partial export still migrates cleanly.
    /// </summary>
    private static readonly string[] KnownColumns =
    [
        "legacy_id", "first_name", "last_name", "date_of_birth", "gender", "phone", "email",
        "address_line1", "address_line2", "post_code", "registered_at", "status", "pathway",
        "afa_support", "referral_source", "referral_type", "referral_subcategory",
        "ethnicity", "nationality", "preferred_language", "housing_status", "employment_status",
        "marital_status", "living_group", "country_of_origin", "gp_name", "gp_practice", "nhs_number",
        "last_activity_at", "notes", "dialog_scores", "dialog_assessed_at",
    ];

    public async Task<ImportResultDto> Handle(ImportGuestsCommand request, CancellationToken cancellationToken)
    {
        var errors = new List<ImportRowError>();
        var rows = CsvReader.Parse(request.Csv);

        if (rows.Count == 0)
        {
            return new ImportResultDto(request.DryRun, 0, 0, 0, 0, 0,
                [new ImportRowError(0, "file", "The file is empty or has no data rows.")]);
        }

        var unknown = rows[0].Keys.Where(k => !KnownColumns.Contains(k, StringComparer.OrdinalIgnoreCase)).ToList();
        foreach (var column in unknown)
        {
            errors.Add(new ImportRowError(1, column, $"Unrecognised column '{column}' — it will be ignored."));
        }

        var created = 0;
        var updated = 0;
        var notesCreated = 0;
        var dialogCreated = 0;

        for (var index = 0; index < rows.Count; index++)
        {
            var row = rows[index];
            var rowNumber = index + 2; // 1-based, and the header takes row 1.

            var firstName = Value(row, "first_name");
            var lastName = Value(row, "last_name");
            var dobText = Value(row, "date_of_birth");

            if (string.IsNullOrWhiteSpace(firstName)) errors.Add(new ImportRowError(rowNumber, "first_name", "Required."));
            if (string.IsNullOrWhiteSpace(lastName)) errors.Add(new ImportRowError(rowNumber, "last_name", "Required."));

            if (!TryParseDate(dobText, out var dateOfBirth))
            {
                errors.Add(new ImportRowError(rowNumber, "date_of_birth", $"Could not read '{dobText}' as a date."));
                continue;
            }

            if (string.IsNullOrWhiteSpace(firstName) || string.IsNullOrWhiteSpace(lastName)) continue;

            var pathwayText = Value(row, "pathway");
            GuestPathway? pathway = null;
            if (!string.IsNullOrWhiteSpace(pathwayText))
            {
                if (Enum.TryParse<GuestPathway>(pathwayText.Replace(" ", string.Empty), ignoreCase: true, out var parsedPathway))
                {
                    pathway = parsedPathway;
                }
                else
                {
                    errors.Add(new ImportRowError(rowNumber, "pathway", $"Unknown pathway '{pathwayText}'."));
                }
            }

            var statusText = Value(row, "status");
            var status = GuestStatus.New;
            if (!string.IsNullOrWhiteSpace(statusText)
                && !Enum.TryParse(statusText.Replace(" ", string.Empty), ignoreCase: true, out status))
            {
                errors.Add(new ImportRowError(rowNumber, "status", $"Unknown status '{statusText}' — defaulting to New."));
                status = GuestStatus.New;
            }

            if (request.DryRun) { created++; continue; }

            // Match on the legacy reference when one is supplied, so a re-run updates rather than duplicates.
            var legacyId = Value(row, "legacy_id");
            Guest? guest = null;
            if (!string.IsNullOrWhiteSpace(legacyId))
            {
                guest = await db.Guests.FirstOrDefaultAsync(
                    g => g.HubId == currentUser.HubId && g.LegacyReference == legacyId, cancellationToken);
            }

            if (guest is null)
            {
                guest = new Guest(
                    currentUser.HubId, firstName!, lastName!, dateOfBirth, currentUser.StaffId, consentGiven: true,
                    Value(row, "gender"), Value(row, "phone"), Value(row, "email"),
                    Value(row, "address_line1"), Value(row, "address_line2"), Value(row, "post_code"),
                    assignedCmhwId: null, referralSource: Value(row, "referral_source"));

                db.Guests.Add(guest);
                created++;
            }
            else
            {
                guest.UpdateContactDetails(Value(row, "phone"), Value(row, "email"),
                    Value(row, "address_line1"), Value(row, "address_line2"), Value(row, "post_code"));
                updated++;
            }

            guest.SetLegacyReference(legacyId);
            guest.UpdateStatus(status);
            if (pathway is not null) guest.Allocate(pathway.Value, ParseBool(Value(row, "afa_support")));

            // Historic timestamps must be preserved (§7.2).
            if (TryParseTimestamp(Value(row, "registered_at"), out var registeredAt)) guest.OverwriteRegisteredAt(registeredAt);
            if (TryParseTimestamp(Value(row, "last_activity_at"), out var lastActivity)) guest.RecordActivity(lastActivity);

            var referralTypeText = Value(row, "referral_type");
            if (!string.IsNullOrWhiteSpace(referralTypeText) && Enum.TryParse<ReferralType>(referralTypeText, true, out var referralType))
            {
                guest.SetReferral(referralType, Value(row, "referral_subcategory"), Value(row, "referral_source"));
            }

            await UpsertDemographicsAsync(db, guest.Id, row, cancellationToken);

            var notes = Value(row, "notes");
            if (!string.IsNullOrWhiteSpace(notes))
            {
                db.Notes.Add(new Note(guest.Id, currentUser.StaffId, notes!, NoteColor.Yellow, isPinned: false));
                notesCreated++;
            }

            if (TryParseDialog(Value(row, "dialog_scores"), out var scores))
            {
                var assessedAt = TryParseTimestamp(Value(row, "dialog_assessed_at"), out var at) ? at : DateTimeOffset.UtcNow;
                var version = await db.DialogAssessments.CountAsync(d => d.GuestId == guest.Id, cancellationToken) + 1;

                var assessment = new DialogAssessment(
                    guest.Id, version, currentUser.StaffId,
                    scores[0], scores[1], scores[2], scores[3], scores[4], scores[5],
                    scores[6], scores[7], scores[8], scores[9], scores[10]);

                assessment.OverwriteAssessedAt(assessedAt);
                db.DialogAssessments.Add(assessment);
                dialogCreated++;
            }
            else if (!string.IsNullOrWhiteSpace(Value(row, "dialog_scores")))
            {
                errors.Add(new ImportRowError(rowNumber, "dialog_scores", "Expected 11 numbers between 1 and 7, separated by spaces or semicolons."));
            }
        }

        if (!request.DryRun && errors.All(e => e.Column != "file"))
        {
            await db.SaveChangesAsync(cancellationToken);
        }

        return new ImportResultDto(request.DryRun, rows.Count, created, updated, notesCreated, dialogCreated, errors);
    }

    private static async Task UpsertDemographicsAsync(IAppDbContext db, Guid guestId, IReadOnlyDictionary<string, string> row, CancellationToken cancellationToken)
    {
        var demographics = await db.GuestDemographics.FirstOrDefaultAsync(d => d.GuestId == guestId, cancellationToken);
        if (demographics is null)
        {
            demographics = new GuestDemographics(guestId);
            db.GuestDemographics.Add(demographics);
        }

        demographics.Update(
            Value(row, "ethnicity"), Value(row, "nationality"), Value(row, "preferred_language"), interpreterNeeded: false,
            Value(row, "housing_status"), Value(row, "employment_status"),
            Value(row, "marital_status"), Value(row, "living_group"), Value(row, "country_of_origin"),
            emergencyContactName: null, emergencyContactPhone: null, emergencyContactRelationship: null,
            Value(row, "gp_name"), Value(row, "gp_practice"), Value(row, "nhs_number"));
    }

    private static string? Value(IReadOnlyDictionary<string, string> row, string column) =>
        row.TryGetValue(column, out var value) && !string.IsNullOrWhiteSpace(value) ? value.Trim() : null;

    private static bool ParseBool(string? text) =>
        text is not null && (text.Equals("true", StringComparison.OrdinalIgnoreCase)
            || text.Equals("yes", StringComparison.OrdinalIgnoreCase) || text == "1");

    private static bool TryParseDate(string? text, out DateOnly value)
    {
        value = default;
        if (string.IsNullOrWhiteSpace(text)) return false;

        string[] formats = ["yyyy-MM-dd", "dd/MM/yyyy", "d/M/yyyy", "dd-MM-yyyy", "MM/dd/yyyy"];
        return DateOnly.TryParseExact(text, formats, CultureInfo.InvariantCulture, DateTimeStyles.None, out value)
            || DateOnly.TryParse(text, CultureInfo.InvariantCulture, DateTimeStyles.None, out value);
    }

    private static bool TryParseTimestamp(string? text, out DateTimeOffset value)
    {
        value = default;
        if (string.IsNullOrWhiteSpace(text)) return false;
        if (DateTimeOffset.TryParse(text, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out value)) return true;
        if (TryParseDate(text, out var date))
        {
            value = new DateTimeOffset(date.ToDateTime(TimeOnly.MinValue), TimeSpan.Zero);
            return true;
        }

        return false;
    }

    /// <summary>Reads "4 5 3 6 …" or "4;5;3;6;…" — 11 DIALOG domain scores in the canonical order.</summary>
    private static bool TryParseDialog(string? text, out int[] scores)
    {
        scores = [];
        if (string.IsNullOrWhiteSpace(text)) return false;

        var parts = text.Split([' ', ';', ','], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        if (parts.Length != 11) return false;

        var parsed = new int[11];
        for (var i = 0; i < 11; i++)
        {
            if (!int.TryParse(parts[i], out parsed[i]) || parsed[i] < 1 || parsed[i] > 7) return false;
        }

        scores = parsed;
        return true;
    }
}

/// <summary>Minimal RFC-4180 CSV reader — quoted fields, embedded commas, doubled quotes.</summary>
internal static class CsvReader
{
    public static List<Dictionary<string, string>> Parse(string csv)
    {
        var rows = new List<Dictionary<string, string>>();
        var lines = SplitRecords(csv);
        if (lines.Count < 2) return rows;

        var headers = lines[0].Select(h => h.Trim().ToLowerInvariant()).ToList();

        foreach (var fields in lines.Skip(1))
        {
            if (fields.Count == 1 && string.IsNullOrWhiteSpace(fields[0])) continue;

            var row = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            for (var i = 0; i < headers.Count && i < fields.Count; i++)
            {
                row[headers[i]] = fields[i];
            }

            rows.Add(row);
        }

        return rows;
    }

    private static List<List<string>> SplitRecords(string csv)
    {
        var records = new List<List<string>>();
        var fields = new List<string>();
        var field = new System.Text.StringBuilder();
        var inQuotes = false;

        for (var i = 0; i < csv.Length; i++)
        {
            var c = csv[i];

            if (inQuotes)
            {
                if (c == '"')
                {
                    if (i + 1 < csv.Length && csv[i + 1] == '"') { field.Append('"'); i++; }
                    else inQuotes = false;
                }
                else field.Append(c);

                continue;
            }

            switch (c)
            {
                case '"':
                    inQuotes = true;
                    break;
                case ',':
                    fields.Add(field.ToString());
                    field.Clear();
                    break;
                case '\r':
                    break;
                case '\n':
                    fields.Add(field.ToString());
                    field.Clear();
                    records.Add(fields);
                    fields = [];
                    break;
                default:
                    field.Append(c);
                    break;
            }
        }

        if (field.Length > 0 || fields.Count > 0)
        {
            fields.Add(field.ToString());
            records.Add(fields);
        }

        return records;
    }
}

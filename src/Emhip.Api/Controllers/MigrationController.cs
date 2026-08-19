using Emhip.Application.Migration;
using Emhip.Domain.Authorization;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Emhip.Api.Controllers;

/// <summary>
/// Legacy data migration (spec §7). Upload a CSV export of the previous system; the importer maps
/// it onto the new structure, preserving the original timestamps.
///
/// Always dry-run first — it validates every row and reports problems without writing anything.
/// Imports are idempotent when the export carries a `legacy_id`: a re-run updates the guest that
/// reference already created rather than duplicating them.
/// </summary>
[ApiController]
[Route("admin/migration")]
[Authorize(Policy = Permissions.Admin.ManageUsers)]
public sealed class MigrationController(IMediator mediator) : ControllerBase
{
    /// <summary>The columns the importer understands, for building the mapping from InForm's export.</summary>
    [HttpGet("guest-template")]
    public IActionResult GetGuestTemplate()
    {
        const string header = "legacy_id,first_name,last_name,date_of_birth,gender,phone,email," +
            "address_line1,address_line2,post_code,registered_at,status,pathway,afa_support," +
            "referral_source,referral_type,referral_subcategory,ethnicity,nationality,preferred_language," +
            "housing_status,employment_status,marital_status,living_group,country_of_origin,gp_name,gp_practice,nhs_number," +
            "last_activity_at,notes,dialog_scores,dialog_assessed_at\n";

        const string example = "INF-1001,Jordan,Fielding,1988-03-14,Female,07700900123,jordan@example.org," +
            "12 High Street,,SW9 8AB,2024-06-01,Active,MentalWellbeing,false," +
            "GP referral,Secondary,Community mental health team,Black African,British,English," +
            "Private rented,Part-time employed,Single,Lives alone,Nigeria,Dr A Mensah,Brixton Practice,4857773456," +
            "2026-05-12,\"Migrated from InForm — see legacy record for full history.\",4 5 3 6 2 5 4 6 3 5 4,2024-06-08\n";

        return File(System.Text.Encoding.UTF8.GetBytes(header + example), "text/csv", "emhip-guest-import-template.csv");
    }

    /// <summary>Validates and (unless dryRun) imports the uploaded CSV.</summary>
    [HttpPost("guests")]
    [RequestSizeLimit(104_857_600)]
    public async Task<ActionResult<ImportResultDto>> ImportGuests(
        IFormFile file, [FromQuery] bool dryRun = true, CancellationToken cancellationToken = default)
    {
        if (file is null || file.Length == 0) return BadRequest(new { error = "No file was uploaded." });

        using var reader = new StreamReader(file.OpenReadStream());
        var csv = await reader.ReadToEndAsync(cancellationToken);

        var result = await mediator.Send(new ImportGuestsCommand(csv, dryRun), cancellationToken);
        return Ok(result);
    }
}

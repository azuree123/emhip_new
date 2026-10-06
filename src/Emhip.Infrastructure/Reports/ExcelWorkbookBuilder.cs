using ClosedXML.Excel;
using Emhip.Application.Reports;

namespace Emhip.Infrastructure.Reports;

/// <summary>
/// Builds the multi-sheet .xlsx export the spec asks for (§5.4): pathway, caseload and outcome
/// data in one workbook, so a manager gets the whole picture in a single download instead of
/// three separate CSVs. Demographics and referral sources are on every export (customer feedback).
/// Every sheet follows the reporting period the Reports screen was showing, so the workbook and
/// the screen agree; figures that are inherently current (a CMHW's caseload) say so in their header.
/// Sheet names must stay in step with WORKBOOK_SHEETS in client/src/app/features/reports/report-meta.ts.
/// </summary>
public sealed class ExcelWorkbookBuilder : IExcelWorkbookBuilder
{
    public byte[] BuildServiceReport(ServiceReportExportDto report)
    {
        using var workbook = new XLWorkbook();

        BuildSummarySheet(workbook, report);
        BuildDemographicsSheet(workbook, report);
        BuildReferralSourcesSheet(workbook, report);
        BuildPathwaySheet(workbook, report);
        BuildCaseloadSheet(workbook, report);
        BuildOutcomesSheet(workbook, report);
        BuildDataQualitySheet(workbook, report);

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return stream.ToArray();
    }

    private static void BuildSummarySheet(XLWorkbook workbook, ServiceReportExportDto report)
    {
        var sheet = workbook.Worksheets.Add("Summary");
        sheet.Cell(1, 1).Value = $"{report.OrganisationName} — service report";
        sheet.Cell(1, 1).Style.Font.Bold = true;
        sheet.Cell(1, 1).Style.Font.FontSize = 14;
        sheet.Cell(2, 1).Value = $"Period {report.From:dd MMM yyyy} to {report.To:dd MMM yyyy}";
        sheet.Cell(3, 1).Value = $"Generated {report.GeneratedAt:dd MMM yyyy HH:mm} UTC";
        sheet.Cell(4, 1).Value = $"DIALOG outcomes cohort: {report.OutcomesCohort}";

        // The Overview tab's KPI tiles and contact activity for the same period. Guest counts are
        // the guests registered in the period, by their status now; "Inactive" is the display name
        // of the OnHold engagement status (customer terminology).
        var rows = new (string Label, int? Value)[]
        {
            ("Guests registered in period", report.StatusCounts.Total),
            ("  of which New (initial conversation outstanding)", report.StatusCounts.PendingConversation),
            ("  of which Active", report.StatusCounts.Active),
            ("  of which Inactive", report.StatusCounts.Inactive),
            ("  of which currently urgent", report.StatusCounts.Urgent),
            ("", null),
            ("Activity in period", null),
            ("Guests seen", report.Activity.GuestsSeen),
            ("Contacts recorded", report.Activity.ContactsRecorded),
            ("Scheduled contacts due", report.Activity.FollowUpEntries),
            ("Urgent flags raised", report.Activity.UrgentFlagsRaised),
        };

        var row = 5;
        sheet.Cell(row, 1).Value = "Measure";
        sheet.Cell(row, 2).Value = "Count";
        HeaderRow(sheet, row, 2);

        foreach (var (label, value) in rows)
        {
            row++;
            sheet.Cell(row, 1).Value = label;
            if (value is { } count) sheet.Cell(row, 2).Value = count;
            else if (label.Length > 0) sheet.Cell(row, 1).Style.Font.Bold = true;
        }

        sheet.Columns().AdjustToContents();
    }

    private static void BuildDemographicsSheet(XLWorkbook workbook, ServiceReportExportDto report)
    {
        var sheet = workbook.Worksheets.Add("Demographics");
        var row = BreakdownSheetHeader(sheet, "Guest demographics", report);

        row = BreakdownSection(sheet, row, "Ethnicity", report.Breakdowns.Ethnicity, report.Breakdowns);
        row = BreakdownSection(sheet, row, "Age group", report.Breakdowns.AgeGroups, report.Breakdowns);
        row = BreakdownSection(sheet, row, "Gender", report.Breakdowns.Gender, report.Breakdowns);
        BreakdownSection(sheet, row, "Country of origin", report.Breakdowns.CountryOfOrigin, report.Breakdowns);

        sheet.Columns().AdjustToContents();
    }

    private static void BuildReferralSourcesSheet(XLWorkbook workbook, ServiceReportExportDto report)
    {
        var sheet = workbook.Worksheets.Add("Referral sources");
        var row = BreakdownSheetHeader(sheet, "Referral sources", report);

        row = BreakdownSection(sheet, row, "Referral source", report.Breakdowns.ReferralSources, report.Breakdowns);
        row = BreakdownSection(sheet, row, "Referral type", report.Breakdowns.ReferralTypes, report.Breakdowns);
        if (report.Breakdowns.SecondaryReferralSubcategories.Count > 0)
        {
            // Percentages here are of all guests, like every other section, so the rows read consistently.
            BreakdownSection(sheet, row, "Secondary referral subcategory", report.Breakdowns.SecondaryReferralSubcategories, report.Breakdowns);
        }

        sheet.Columns().AdjustToContents();
    }

    /// <summary>Title + period lines shared by the breakdown sheets; returns the first free row.</summary>
    private static int BreakdownSheetHeader(IXLWorksheet sheet, string title, ServiceReportExportDto report)
    {
        sheet.Cell(1, 1).Value = title;
        sheet.Cell(1, 1).Style.Font.Bold = true;
        sheet.Cell(1, 1).Style.Font.FontSize = 14;
        sheet.Cell(2, 1).Value =
            $"All current guests: {report.Breakdowns.TotalGuests} · Registered {report.From:dd MMM yyyy} to {report.To:dd MMM yyyy}: {report.Breakdowns.RegisteredInPeriod}";
        return 4;
    }

    /// <summary>
    /// One breakdown table: category, all-guests count and share, in-period count and share,
    /// followed by a blank spacer row. Returns the row the next section starts on.
    /// </summary>
    private static int BreakdownSection(
        IXLWorksheet sheet, int row, string heading, IReadOnlyList<ReportBreakdownRowDto> rows, ReportBreakdownsDto totals)
    {
        sheet.Cell(row, 1).Value = heading;
        sheet.Cell(row, 2).Value = "All guests";
        sheet.Cell(row, 3).Value = "% of all guests";
        sheet.Cell(row, 4).Value = "Registered in period";
        sheet.Cell(row, 5).Value = "% of registered in period";
        HeaderRow(sheet, row, 5, freeze: false);

        static double Share(int count, int total) => total == 0 ? 0 : Math.Round(100.0 * count / total, 1);

        foreach (var item in rows)
        {
            row++;
            sheet.Cell(row, 1).Value = item.Label;
            sheet.Cell(row, 2).Value = item.AllGuests;
            sheet.Cell(row, 3).Value = Share(item.AllGuests, totals.TotalGuests);
            sheet.Cell(row, 4).Value = item.RegisteredInPeriod;
            sheet.Cell(row, 5).Value = Share(item.RegisteredInPeriod, totals.RegisteredInPeriod);
        }

        if (rows.Count == 0)
        {
            row++;
            sheet.Cell(row, 1).Value = "No guests recorded";
        }

        return row + 2;
    }

    private static void BuildPathwaySheet(XLWorkbook workbook, ServiceReportExportDto report)
    {
        // Guests registered in the period, by the pathway they are on now; the DIALOG average is
        // their latest assessment recorded in the period.
        var sheet = workbook.Worksheets.Add("Pathways");
        sheet.Cell(1, 1).Value = "Pathway";
        sheet.Cell(1, 2).Value = "Guests registered in period";
        sheet.Cell(1, 3).Value = "Active";
        sheet.Cell(1, 4).Value = "Urgent";
        sheet.Cell(1, 5).Value = "Inactive";
        sheet.Cell(1, 6).Value = "AFA support";
        sheet.Cell(1, 7).Value = "Avg latest DIALOG in period (/77)";
        HeaderRow(sheet, 1, 7);

        var row = 1;
        foreach (var pathway in report.Pathways)
        {
            row++;
            sheet.Cell(row, 1).Value = Emhip.Application.Guests.GuestPathwayLabels.For(pathway.Pathway);
            sheet.Cell(row, 2).Value = pathway.TotalGuests;
            sheet.Cell(row, 3).Value = pathway.ActiveGuests;
            sheet.Cell(row, 4).Value = pathway.UrgentGuests;
            sheet.Cell(row, 5).Value = pathway.InactiveGuests;
            sheet.Cell(row, 6).Value = pathway.AfaSupportCount;
            if (pathway.AvgLatestDialogTotal is { } avg) sheet.Cell(row, 7).Value = avg;
        }

        sheet.Columns().AdjustToContents();
    }

    private static void BuildCaseloadSheet(XLWorkbook workbook, ServiceReportExportDto report)
    {
        // A caseload is who is assigned now; the two contact columns follow the period.
        var sheet = workbook.Worksheets.Add("Caseload");
        sheet.Cell(1, 1).Value = "CMHW";
        sheet.Cell(1, 2).Value = "Assigned guests (current)";
        sheet.Cell(1, 3).Value = "Active (current)";
        sheet.Cell(1, 4).Value = "Urgent (current)";
        sheet.Cell(1, 5).Value = "Overdue contacts due in period";
        sheet.Cell(1, 6).Value = "Contacts recorded in period";
        HeaderRow(sheet, 1, 6);

        var row = 1;
        foreach (var worker in report.Caseload)
        {
            row++;
            sheet.Cell(row, 1).Value = worker.DisplayName;
            sheet.Cell(row, 2).Value = worker.AssignedGuests;
            sheet.Cell(row, 3).Value = worker.ActiveGuests;
            sheet.Cell(row, 4).Value = worker.UrgentGuests;
            sheet.Cell(row, 5).Value = worker.OverdueFollowUps;
            sheet.Cell(row, 6).Value = worker.ContactsInPeriod;
        }

        sheet.Columns().AdjustToContents();
    }

    private static void BuildOutcomesSheet(XLWorkbook workbook, ServiceReportExportDto report)
    {
        var sheet = workbook.Worksheets.Add("DIALOG outcomes");

        // Which guests these averages cover — the DIALOG Outcomes tab's demographic filters, if any.
        sheet.Cell(1, 1).Value = "Cohort";
        sheet.Cell(1, 1).Style.Font.Bold = true;
        sheet.Cell(1, 2).Value = report.OutcomesCohort;
        sheet.Cell(2, 1).Value = "Guests in cohort";
        sheet.Cell(2, 1).Style.Font.Bold = true;
        sheet.Cell(2, 2).Value = report.Outcomes.CohortGuests;
        sheet.Cell(3, 1).Value = "Assessments recorded";
        sheet.Cell(3, 1).Style.Font.Bold = true;
        sheet.Cell(3, 2).Value = $"{report.From:dd MMM yyyy} to {report.To:dd MMM yyyy}";

        sheet.Cell(4, 1).Value = "Domain";
        sheet.Cell(4, 2).Value = "Baseline average";
        sheet.Cell(4, 3).Value = "Latest average";
        sheet.Cell(4, 4).Value = "Change";
        HeaderRow(sheet, 4, 4);

        var row = 4;
        foreach (var dimension in report.Outcomes.Dimensions)
        {
            row++;
            sheet.Cell(row, 1).Value = dimension.Label;
            if (dimension.BaselineAverage is { } baseline) sheet.Cell(row, 2).Value = baseline;
            if (dimension.LatestAverage is { } latest) sheet.Cell(row, 3).Value = latest;
            if (dimension.BaselineAverage is { } b && dimension.LatestAverage is { } l)
            {
                sheet.Cell(row, 4).Value = Math.Round(l - b, 2);
            }
        }

        row += 2;
        sheet.Cell(row, 1).Value = "Guests with a baseline in period";
        sheet.Cell(row, 2).Value = report.Outcomes.GuestsWithBaseline;
        sheet.Cell(row + 1, 1).Value = "Guests with a reassessment in period";
        sheet.Cell(row + 1, 2).Value = report.Outcomes.GuestsWithFollowUp;
        sheet.Cell(row + 2, 1).Value = "Guests baselined in period, not yet reassessed";
        sheet.Cell(row + 2, 2).Value = report.Outcomes.GuestsAwaitingReassessment;

        sheet.Columns().AdjustToContents();
    }

    private static void BuildDataQualitySheet(XLWorkbook workbook, ServiceReportExportDto report)
    {
        // Completeness of the records registered in the period.
        var sheet = workbook.Worksheets.Add("Data quality");
        sheet.Cell(1, 1).Value = "Issue";
        sheet.Cell(1, 2).Value = "Guests affected";
        sheet.Cell(1, 3).Value = "% of guests registered in period";
        HeaderRow(sheet, 1, 3);

        var row = 1;
        foreach (var issue in report.DataQuality.Issues)
        {
            row++;
            sheet.Cell(row, 1).Value = issue.Label;
            sheet.Cell(row, 2).Value = issue.Count;
            sheet.Cell(row, 3).Value = report.DataQuality.TotalGuests == 0
                ? 0
                : Math.Round(100.0 * issue.Count / report.DataQuality.TotalGuests, 1);
        }

        sheet.Columns().AdjustToContents();
    }

    /// <summary>Bold grey header strip; <paramref name="freeze"/> is off for sheets with several stacked tables.</summary>
    private static void HeaderRow(IXLWorksheet sheet, int row, int lastColumn, bool freeze = true)
    {
        var range = sheet.Range(row, 1, row, lastColumn);
        range.Style.Font.Bold = true;
        range.Style.Fill.BackgroundColor = XLColor.FromHtml("#F1F1F1");
        if (freeze) sheet.SheetView.FreezeRows(row);
    }
}

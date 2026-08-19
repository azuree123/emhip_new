using ClosedXML.Excel;
using Emhip.Application.Reports;

namespace Emhip.Infrastructure.Reports;

/// <summary>
/// Builds the multi-sheet .xlsx export the spec asks for (§5.4): pathway, caseload and outcome
/// data in one workbook, so a manager gets the whole picture in a single download instead of
/// three separate CSVs.
/// </summary>
public sealed class ExcelWorkbookBuilder : IExcelWorkbookBuilder
{
    public byte[] BuildServiceReport(ServiceReportExportDto report)
    {
        using var workbook = new XLWorkbook();

        BuildSummarySheet(workbook, report);
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

        var rows = new (string Label, int Value)[]
        {
            ("Total guests", report.StatusCounts.Total),
            ("Active", report.StatusCounts.Active),
            ("New (initial conversation outstanding)", report.StatusCounts.PendingConversation),
            ("On hold", report.StatusCounts.Inactive),
            ("Urgent", report.StatusCounts.Urgent),
        };

        var row = 5;
        sheet.Cell(row, 1).Value = "Measure";
        sheet.Cell(row, 2).Value = "Count";
        HeaderRow(sheet, row, 2);

        foreach (var (label, value) in rows)
        {
            row++;
            sheet.Cell(row, 1).Value = label;
            sheet.Cell(row, 2).Value = value;
        }

        sheet.Columns().AdjustToContents();
    }

    private static void BuildPathwaySheet(XLWorkbook workbook, ServiceReportExportDto report)
    {
        var sheet = workbook.Worksheets.Add("Pathways");
        sheet.Cell(1, 1).Value = "Pathway";
        sheet.Cell(1, 2).Value = "Total guests";
        sheet.Cell(1, 3).Value = "Active";
        sheet.Cell(1, 4).Value = "Urgent";
        sheet.Cell(1, 5).Value = "On hold";
        sheet.Cell(1, 6).Value = "AFA support";
        sheet.Cell(1, 7).Value = "Avg latest DIALOG (/77)";
        HeaderRow(sheet, 1, 7);

        var row = 1;
        foreach (var pathway in report.Pathways)
        {
            row++;
            sheet.Cell(row, 1).Value = pathway.Pathway;
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
        var sheet = workbook.Worksheets.Add("Caseload");
        sheet.Cell(1, 1).Value = "CMHW";
        sheet.Cell(1, 2).Value = "Assigned guests";
        sheet.Cell(1, 3).Value = "Active";
        sheet.Cell(1, 4).Value = "Urgent";
        sheet.Cell(1, 5).Value = "Overdue follow-ups";
        sheet.Cell(1, 6).Value = "Contacts (30 days)";
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
            sheet.Cell(row, 6).Value = worker.ContactsLast30Days;
        }

        sheet.Columns().AdjustToContents();
    }

    private static void BuildOutcomesSheet(XLWorkbook workbook, ServiceReportExportDto report)
    {
        var sheet = workbook.Worksheets.Add("DIALOG outcomes");
        sheet.Cell(1, 1).Value = "Domain";
        sheet.Cell(1, 2).Value = "Baseline average";
        sheet.Cell(1, 3).Value = "Latest average";
        sheet.Cell(1, 4).Value = "Change";
        HeaderRow(sheet, 1, 4);

        var row = 1;
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
        sheet.Cell(row, 1).Value = "Guests with a baseline";
        sheet.Cell(row, 2).Value = report.Outcomes.GuestsWithBaseline;
        sheet.Cell(row + 1, 1).Value = "Guests with a follow-up";
        sheet.Cell(row + 1, 2).Value = report.Outcomes.GuestsWithFollowUp;

        sheet.Columns().AdjustToContents();
    }

    private static void BuildDataQualitySheet(XLWorkbook workbook, ServiceReportExportDto report)
    {
        var sheet = workbook.Worksheets.Add("Data quality");
        sheet.Cell(1, 1).Value = "Issue";
        sheet.Cell(1, 2).Value = "Guests affected";
        sheet.Cell(1, 3).Value = "% of guests";
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

    private static void HeaderRow(IXLWorksheet sheet, int row, int lastColumn)
    {
        var range = sheet.Range(row, 1, row, lastColumn);
        range.Style.Font.Bold = true;
        range.Style.Fill.BackgroundColor = XLColor.FromHtml("#F1F1F1");
        sheet.SheetView.FreezeRows(row);
    }
}

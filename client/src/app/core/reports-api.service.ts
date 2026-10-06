import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  BreakdownSliceDto,
  CaseloadReportRowDto,
  ContactsBreakdownReportDto,
  CpnActivityReportDto,
  DataQualityReportDto,
  DialogOutcomesReportDto,
  DialogTrendPointDto,
  ExportHistoryItemDto,
  PathwayAnalyticsDto,
  PathwayReportDto,
} from './api-models';

/**
 * A demographic cohort to cross-filter a report by — the same query params (and meaning) as
 * GET /guests, so `demographicFilterParams()` from the shared filter drawer produces one directly.
 */
export interface ReportCohortParams {
  ethnicity?: string;
  gender?: string;
  countryOfOrigin?: string;
  /** Inclusive age bounds in years, derived from date of birth server-side. */
  ageMin?: number;
  ageMax?: number;
}

/**
 * The Reports screen's reporting period (inclusive, yyyy-MM-dd) — one range shared by every tab
 * and by the exports.
 */
export interface ReportPeriod {
  from: string;
  to: string;
}

function periodParams(period: ReportPeriod): HttpParams {
  return new HttpParams().set('from', period.from).set('to', period.to);
}

/** Adds the set cohort filters to `params`; unset ones are left off the query string. */
function withCohort(params: HttpParams, cohort?: ReportCohortParams): HttpParams {
  if (!cohort) return params;
  if (cohort.ethnicity) params = params.set('ethnicity', cohort.ethnicity);
  if (cohort.gender) params = params.set('gender', cohort.gender);
  if (cohort.countryOfOrigin) params = params.set('countryOfOrigin', cohort.countryOfOrigin);
  if (cohort.ageMin !== undefined) params = params.set('ageMin', cohort.ageMin);
  if (cohort.ageMax !== undefined) params = params.set('ageMax', cohort.ageMax);
  return params;
}

/** Maps 1:1 to ReportsController. */
@Injectable({ providedIn: 'root' })
export class ReportsApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/reports`;

  getPathwayReport(from: string, to: string): Observable<PathwayReportDto> {
    const params = new HttpParams().set('from', from).set('to', to);
    return this.http.get<PathwayReportDto>(`${this.base}/pathways`, { params });
  }

  /**
   * "Outcome dimensions" — DIALOG averages, baseline vs latest reassessment, over the assessments
   * recorded in the period, for the hub or a cohort.
   */
  getDialogOutcomes(period: ReportPeriod, cohort?: ReportCohortParams): Observable<DialogOutcomesReportDto> {
    const params = withCohort(periodParams(period), cohort);
    return this.http.get<DialogOutcomesReportDto>(`${this.base}/dialog-outcomes`, { params });
  }

  /** "Pathway Analytics" tab — per-pathway totals, statuses, AFA and DIALOG averages for the guests registered in the period. */
  getPathwayAnalytics(period: ReportPeriod): Observable<PathwayAnalyticsDto> {
    return this.http.get<PathwayAnalyticsDto>(`${this.base}/pathway-analytics`, { params: periodParams(period) });
  }

  /** "Caseload Reports" tab — current per-CMHW caseload, with the overdue and recorded contacts of the period. */
  getCaseload(period: ReportPeriod): Observable<CaseloadReportRowDto[]> {
    return this.http.get<CaseloadReportRowDto[]>(`${this.base}/caseload`, { params: periodParams(period) });
  }

  /** "Data Quality" tab — record-completeness issue counts for the guests registered in the period. */
  getDataQuality(period: ReportPeriod): Observable<DataQualityReportDto> {
    return this.http.get<DataQualityReportDto>(`${this.base}/data-quality`, { params: periodParams(period) });
  }

  /** "CPN Activity" tab — the CPN referral pipeline and the guests on the CPN caseload (yyyy-MM-dd). */
  getCpnActivity(from: string, to: string): Observable<CpnActivityReportDto> {
    const params = new HttpParams().set('from', from).set('to', to);
    return this.http.get<CpnActivityReportDto>(`${this.base}/cpn-activity`, { params });
  }

  /** Contacts by type and outcome within the range (yyyy-MM-dd). */
  getContactsBreakdown(from: string, to: string): Observable<ContactsBreakdownReportDto> {
    const params = new HttpParams().set('from', from).set('to', to);
    return this.http.get<ContactsBreakdownReportDto>(`${this.base}/contacts-breakdown`, { params });
  }

  /** "DIALOG score trend" — monthly average total score in the period, for the hub or a cohort. */
  getDialogTrend(period: ReportPeriod, cohort?: ReportCohortParams): Observable<DialogTrendPointDto[]> {
    const params = withCohort(periodParams(period), cohort);
    return this.http.get<DialogTrendPointDto[]>(`${this.base}/dialog-trend`, { params });
  }

  /** "Referral sources" breakdown of the guests registered in the period. */
  getReferralSources(period: ReportPeriod): Observable<BreakdownSliceDto[]> {
    return this.http.get<BreakdownSliceDto[]>(`${this.base}/referral-sources`, { params: periodParams(period) });
  }

  /** "Export history" tab — the hub's most recent exports taken in the period. */
  getExportHistory(period: ReportPeriod): Observable<ExportHistoryItemDto[]> {
    return this.http.get<ExportHistoryItemDto[]>(`${this.base}/exports`, { params: periodParams(period) });
  }

  /**
   * Multi-sheet Excel workbook (sheets listed in WORKBOOK_SHEETS), every sheet for the period. `dialogCohort` is the DIALOG
   * Outcomes tab's demographic filter — it narrows the workbook's DIALOG outcomes sheet only.
   */
  exportWorkbook(from: string, to: string, dialogCohort?: ReportCohortParams): Observable<Blob> {
    const params = withCohort(new HttpParams().set('from', from).set('to', to), dialogCohort);
    return this.http.get(`${this.base}/export.xlsx`, { params, responseType: 'blob' });
  }

  /** CSV export — one row per pathway referral in the range, with each guest's demographics and
   *  referral source. Fetched via HttpClient so the auth interceptor attaches the JWT
   *  (a plain browser navigation would send no Authorization header and get a 401). */
  exportCsv(from: string, to: string): Observable<Blob> {
    const params = new HttpParams().set('from', from).set('to', to);
    return this.http.get(`${this.base}/export`, { params, responseType: 'blob' });
  }
}

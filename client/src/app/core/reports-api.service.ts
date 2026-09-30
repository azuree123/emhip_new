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

  /** "Outcome dimensions" — DIALOG averages, baseline vs latest reassessment, for the hub or a cohort. */
  getDialogOutcomes(cohort?: ReportCohortParams): Observable<DialogOutcomesReportDto> {
    const params = withCohort(new HttpParams(), cohort);
    return this.http.get<DialogOutcomesReportDto>(`${this.base}/dialog-outcomes`, { params });
  }

  /** "Pathway Analytics" tab — per-pathway totals, statuses, AFA and DIALOG averages. */
  getPathwayAnalytics(): Observable<PathwayAnalyticsDto> {
    return this.http.get<PathwayAnalyticsDto>(`${this.base}/pathway-analytics`);
  }

  /** "Caseload Reports" tab — per-CMHW caseload rows. */
  getCaseload(): Observable<CaseloadReportRowDto[]> {
    return this.http.get<CaseloadReportRowDto[]>(`${this.base}/caseload`);
  }

  /** "Data Quality" tab — record-completeness issue counts. */
  getDataQuality(): Observable<DataQualityReportDto> {
    return this.http.get<DataQualityReportDto>(`${this.base}/data-quality`);
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

  /** "DIALOG score trend" — monthly average total score, for the hub or a cohort. */
  getDialogTrend(cohort?: ReportCohortParams): Observable<DialogTrendPointDto[]> {
    const params = withCohort(new HttpParams(), cohort);
    return this.http.get<DialogTrendPointDto[]>(`${this.base}/dialog-trend`, { params });
  }

  /** "Referral sources" breakdown. */
  getReferralSources(): Observable<BreakdownSliceDto[]> {
    return this.http.get<BreakdownSliceDto[]>(`${this.base}/referral-sources`);
  }

  /** "Export history" tab — most recent exports for the hub. */
  getExportHistory(): Observable<ExportHistoryItemDto[]> {
    return this.http.get<ExportHistoryItemDto[]>(`${this.base}/exports`);
  }

  /**
   * Multi-sheet Excel workbook (sheets listed in WORKBOOK_SHEETS). `dialogCohort` is the DIALOG
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

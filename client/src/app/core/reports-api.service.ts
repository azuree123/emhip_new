import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  BreakdownSliceDto,
  CaseloadReportRowDto,
  ContactsBreakdownReportDto,
  DataQualityReportDto,
  DialogOutcomesReportDto,
  DialogTrendPointDto,
  ExportHistoryItemDto,
  PathwayAnalyticsDto,
  PathwayReportDto,
} from './api-models';

/** Maps 1:1 to ReportsController. */
@Injectable({ providedIn: 'root' })
export class ReportsApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/reports`;

  getPathwayReport(from: string, to: string): Observable<PathwayReportDto> {
    const params = new HttpParams().set('from', from).set('to', to);
    return this.http.get<PathwayReportDto>(`${this.base}/pathways`, { params });
  }

  /** "Outcome dimensions" — hub-wide DIALOG averages, baseline vs latest follow-up. */
  getDialogOutcomes(): Observable<DialogOutcomesReportDto> {
    return this.http.get<DialogOutcomesReportDto>(`${this.base}/dialog-outcomes`);
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

  /** "CPN Activity" — contacts by type and outcome within the range (yyyy-MM-dd). */
  getContactsBreakdown(from: string, to: string): Observable<ContactsBreakdownReportDto> {
    const params = new HttpParams().set('from', from).set('to', to);
    return this.http.get<ContactsBreakdownReportDto>(`${this.base}/contacts-breakdown`, { params });
  }

  /** "DIALOG score trend" — monthly average total score. */
  getDialogTrend(): Observable<DialogTrendPointDto[]> {
    return this.http.get<DialogTrendPointDto[]>(`${this.base}/dialog-trend`);
  }

  /** "Referral sources" breakdown. */
  getReferralSources(): Observable<BreakdownSliceDto[]> {
    return this.http.get<BreakdownSliceDto[]>(`${this.base}/referral-sources`);
  }

  /** "Export history" tab — most recent exports for the hub. */
  getExportHistory(): Observable<ExportHistoryItemDto[]> {
    return this.http.get<ExportHistoryItemDto[]>(`${this.base}/exports`);
  }

  /** CSV export — fetched via HttpClient so the auth interceptor attaches the JWT
   *  (a plain browser navigation would send no Authorization header and get a 401). */
  exportCsv(from: string, to: string): Observable<Blob> {
    const params = new HttpParams().set('from', from).set('to', to);
    return this.http.get(`${this.base}/export`, { params, responseType: 'blob' });
  }
}

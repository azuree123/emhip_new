import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { PathwayReportDto } from './api-models';

/** Maps 1:1 to ReportsController. */
@Injectable({ providedIn: 'root' })
export class ReportsApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/reports`;

  getPathwayReport(from: string, to: string): Observable<PathwayReportDto> {
    const params = new HttpParams().set('from', from).set('to', to);
    return this.http.get<PathwayReportDto>(`${this.base}/pathways`, { params });
  }

  /** Streaming CSV export — returns the endpoint URL for a direct browser navigation/download rather than buffering the response. */
  exportUrl(from: string, to: string): string {
    return `${this.base}/export?from=${from}&to=${to}`;
  }
}

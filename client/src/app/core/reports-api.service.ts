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

  /** CSV export — fetched via HttpClient so the auth interceptor attaches the JWT
   *  (a plain browser navigation would send no Authorization header and get a 401). */
  exportCsv(from: string, to: string): Observable<Blob> {
    const params = new HttpParams().set('from', from).set('to', to);
    return this.http.get(`${this.base}/export`, { params, responseType: 'blob' });
  }
}

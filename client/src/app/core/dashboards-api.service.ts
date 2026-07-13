import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { CmhwDashboardDto, HubManagerDashboardDto } from './api-models';

/** Maps 1:1 to DashboardsController. */
@Injectable({ providedIn: 'root' })
export class DashboardsApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/dashboards`;

  getCmhwDashboard(): Observable<CmhwDashboardDto> {
    return this.http.get<CmhwDashboardDto>(`${this.base}/cmhw`);
  }

  getHubManagerDashboard(): Observable<HubManagerDashboardDto> {
    return this.http.get<HubManagerDashboardDto>(`${this.base}/hub-manager`);
  }
}

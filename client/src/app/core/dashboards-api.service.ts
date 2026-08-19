import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { HttpParams } from '@angular/common/http';
import { CmhwDashboardDto, GuestsSeenDto, GuestsSeenPeriod, HubManagerDashboardDto } from './api-models';

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

  /** "Guest Seen" card + expanded view. mine=true scopes to the signed-in CMHW's own contacts. */
  getGuestsSeen(period: GuestsSeenPeriod, mine = false, range?: { from: string; to: string }): Observable<GuestsSeenDto> {
    let params = new HttpParams().set('period', period);
    if (mine) params = params.set('mine', true);
    // A supplied range wins over the preset period (spec §5.1 custom range).
    if (range) params = params.set('from', range.from).set('to', range.to);
    return this.http.get<GuestsSeenDto>(`${this.base}/guests-seen`, { params });
  }
}

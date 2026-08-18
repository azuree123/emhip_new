import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { EscalateToCmhtRequest, ResolveUrgentCaseRequest, UrgentCaseDto, UrgentEpisodeDto } from './api-models';

/** Maps 1:1 to UrgentCasesController. Live updates arrive separately via UrgentCasesHubService (SignalR). */
@Injectable({ providedIn: 'root' })
export class UrgentCasesApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/urgent-cases`;

  getActive(): Observable<UrgentCaseDto[]> {
    return this.http.get<UrgentCaseDto[]>(this.base);
  }

  /** Resolved urgent episodes — the "Urgent Episode Record" history. */
  getResolved(): Observable<UrgentEpisodeDto[]> {
    return this.http.get<UrgentEpisodeDto[]>(`${this.base}/resolved`);
  }

  /** The guest's currently open episode (escalation state); 404 when none. */
  getOpenEpisode(guestId: string): Observable<UrgentEpisodeDto> {
    return this.http.get<UrgentEpisodeDto>(`${this.base}/${guestId}/episode`);
  }

  escalateToCmht(guestId: string, request: EscalateToCmhtRequest): Observable<void> {
    return this.http.post<void>(`${this.base}/${guestId}/escalate-cmht`, request);
  }

  /** Closes the episode and returns the guest to Active. The list updates via the SignalR "urgentCaseResolved" event. */
  resolve(guestId: string, request: ResolveUrgentCaseRequest): Observable<void> {
    return this.http.post<void>(`${this.base}/${guestId}/resolve`, request);
  }
}

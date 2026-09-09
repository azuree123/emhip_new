import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  EscalateToCmhtRequest,
  ResolveUrgentCaseRequest,
  UrgentCaseDto,
  UrgentEpisodeDto,
  UrgentEpisodeRecordDto,
  UrgentEpisodeSummaryDto,
} from './api-models';

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

  /** Every episode for the guest, oldest first — the "Episode 1 / 2 / 3" tabs on the record screen. */
  getEpisodes(guestId: string): Observable<UrgentEpisodeSummaryDto[]> {
    return this.http.get<UrgentEpisodeSummaryDto[]>(`${this.base}/${guestId}/episodes`);
  }

  /** The full Urgent Episode Record for one episode (viewing it is written to the guest's access log). */
  getEpisodeRecord(episodeId: string): Observable<UrgentEpisodeRecordDto> {
    return this.http.get<UrgentEpisodeRecordDto>(`${this.base}/episodes/${episodeId}`);
  }

  /** "Export Record" — plain-text copy of the record; logged as a disclosure against the guest. */
  exportEpisodeRecord(episodeId: string): Observable<Blob> {
    return this.http.get(`${this.base}/episodes/${episodeId}/export`, { responseType: 'blob' });
  }

  escalateToCmht(guestId: string, request: EscalateToCmhtRequest): Observable<void> {
    return this.http.post<void>(`${this.base}/${guestId}/escalate-cmht`, request);
  }

  /** Closes the episode and returns the guest to Active. The list updates via the SignalR "urgentCaseResolved" event. */
  resolve(guestId: string, request: ResolveUrgentCaseRequest): Observable<void> {
    return this.http.post<void>(`${this.base}/${guestId}/resolve`, request);
  }
}

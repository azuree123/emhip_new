import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { FollowUpQueueItemDto, KeysetPage } from './api-models';

/** Maps 1:1 to FollowUpsController — backs the Global Follow-up screen. */
@Injectable({ providedIn: 'root' })
export class FollowUpsApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/followups`;

  getQueue(opts: { overdue?: boolean; assignee?: string; cursor?: string; pageSize?: number }): Observable<KeysetPage<FollowUpQueueItemDto>> {
    let params = new HttpParams();
    if (opts.overdue !== undefined) params = params.set('overdue', opts.overdue);
    if (opts.assignee) params = params.set('assignee', opts.assignee);
    if (opts.cursor) params = params.set('cursor', opts.cursor);
    if (opts.pageSize) params = params.set('pageSize', opts.pageSize);
    return this.http.get<KeysetPage<FollowUpQueueItemDto>>(this.base, { params });
  }

  complete(followUpId: string): Observable<void> {
    return this.http.post<void>(`${this.base}/${followUpId}/complete`, {});
  }
}

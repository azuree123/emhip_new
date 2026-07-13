import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { UrgentCaseDto } from './api-models';

/** Maps 1:1 to UrgentCasesController. Live updates arrive separately via UrgentCasesHubService (SignalR). */
@Injectable({ providedIn: 'root' })
export class UrgentCasesApiService {
  private readonly http = inject(HttpClient);

  getActive(): Observable<UrgentCaseDto[]> {
    return this.http.get<UrgentCaseDto[]>(`${environment.apiBaseUrl}/urgent-cases`);
  }
}

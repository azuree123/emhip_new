import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { MdtQueueDto } from './api-models';

/** Maps 1:1 to MdtController — the Hub Manager's MDT queue. */
@Injectable({ providedIn: 'root' })
export class MdtApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/mdt`;

  getQueue(): Observable<MdtQueueDto> {
    return this.http.get<MdtQueueDto>(`${this.base}/queue`);
  }

  /** "Confirm assign CPN" — allocates the CPN and starts tracking CPN activity for the guest. */
  confirmCpn(itemId: string, assignedCpnStaffId: string, confirmationNote: string | null): Observable<void> {
    return this.http.post<void>(`${this.base}/${itemId}/confirm-cpn`, { assignedCpnStaffId, confirmationNote });
  }

  /** "Decline with reason". */
  decline(itemId: string, reason: string, context: string | null): Observable<void> {
    return this.http.post<void>(`${this.base}/${itemId}/decline`, { reason, context });
  }

  /** "Mark as discussed" — the MDT note is required. */
  markDiscussed(itemId: string, mdtNote: string): Observable<void> {
    return this.http.post<void>(`${this.base}/${itemId}/discussed`, { mdtNote });
  }
}

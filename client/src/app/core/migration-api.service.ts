import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ImportResultDto } from './api-models';

/**
 * Legacy data migration (spec §7) — maps to MigrationController.
 * Always dry-run first: it validates every row and reports problems without writing.
 */
@Injectable({ providedIn: 'root' })
export class MigrationApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/admin/migration`;

  /** CSV template listing every column the importer understands. */
  downloadGuestTemplate(): Observable<Blob> {
    return this.http.get(`${this.base}/guest-template`, { responseType: 'blob' });
  }

  /** Uploads the export. With dryRun (the default) nothing is written. */
  importGuests(file: File, dryRun = true): Observable<ImportResultDto> {
    const form = new FormData();
    form.append('file', file, file.name);
    const params = new HttpParams().set('dryRun', dryRun);
    return this.http.post<ImportResultDto>(`${this.base}/guests`, form, { params });
  }
}

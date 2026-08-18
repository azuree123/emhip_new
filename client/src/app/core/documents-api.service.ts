import { HttpClient, HttpErrorResponse, HttpEvent, HttpEventType, HttpParams, HttpRequest } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  DocumentDetailDto,
  DocumentListItemDto,
  DocumentStatsDto,
  DocumentStatus,
  KeysetPage,
  UpdateDocumentRequest,
  UploadDocumentRequest,
} from './api-models';

/** Progress of an in-flight upload; `done` carries the created document/version id. */
export type UploadProgress =
  | { state: 'progress'; percent: number }
  | { state: 'done'; id?: string; versionNumber?: number };

/** Maps 1:1 to DocumentsController — the single upload path for the whole portal. */
@Injectable({ providedIn: 'root' })
export class DocumentsApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/documents`;

  getList(opts: {
    q?: string;
    guestId?: string;
    category?: string;
    status?: DocumentStatus;
    tag?: string;
    includeDeleted?: boolean;
    /** The recycle-bin view: only soft-deleted documents. */
    deletedOnly?: boolean;
    cursor?: string;
    pageSize?: number;
  }): Observable<KeysetPage<DocumentListItemDto>> {
    let params = new HttpParams();
    if (opts.q) params = params.set('q', opts.q);
    if (opts.guestId) params = params.set('guestId', opts.guestId);
    if (opts.category) params = params.set('category', opts.category);
    if (opts.status) params = params.set('status', opts.status);
    if (opts.tag) params = params.set('tag', opts.tag);
    if (opts.includeDeleted) params = params.set('includeDeleted', true);
    if (opts.deletedOnly) params = params.set('deletedOnly', true);
    if (opts.cursor) params = params.set('cursor', opts.cursor);
    if (opts.pageSize) params = params.set('pageSize', opts.pageSize);
    return this.http.get<KeysetPage<DocumentListItemDto>>(this.base, { params });
  }

  getStats(): Observable<DocumentStatsDto> {
    return this.http.get<DocumentStatsDto>(`${this.base}/stats`);
  }

  getDetail(documentId: string): Observable<DocumentDetailDto> {
    return this.http.get<DocumentDetailDto>(`${this.base}/${documentId}`);
  }

  /** Uploads a new document as version 1, reporting progress so the UI can show a bar. */
  upload(request: UploadDocumentRequest): Observable<UploadProgress> {
    const form = new FormData();
    form.append('file', request.file, request.file.name);
    form.append('title', request.title);
    form.append('category', request.category);
    if (request.guestId) form.append('guestId', request.guestId);
    if (request.description) form.append('description', request.description);
    if (request.tags) form.append('tags', request.tags);
    if (request.retainUntil) form.append('retainUntil', request.retainUntil);

    return this.trackUpload(new HttpRequest('POST', this.base, form, { reportProgress: true }));
  }

  /** Uploads a replacement file as the next version. */
  addVersion(documentId: string, file: File, changeNote?: string | null): Observable<UploadProgress> {
    const form = new FormData();
    form.append('file', file, file.name);
    if (changeNote) form.append('changeNote', changeNote);

    return this.trackUpload(new HttpRequest('POST', `${this.base}/${documentId}/versions`, form, { reportProgress: true }));
  }

  /**
   * Downloads through HttpClient (not a plain link) so the auth interceptor attaches the JWT —
   * a bare navigation would be rejected with 401.
   */
  download(documentId: string, version?: number): Observable<Blob> {
    let params = new HttpParams();
    if (version) params = params.set('version', version);
    return this.http.get(`${this.base}/${documentId}/download`, { params, responseType: 'blob' });
  }

  updateMetadata(documentId: string, request: UpdateDocumentRequest): Observable<void> {
    return this.http.put<void>(`${this.base}/${documentId}`, request);
  }

  /** Soft delete — recoverable from the recycle bin. */
  delete(documentId: string, reason?: string | null): Observable<void> {
    let params = new HttpParams();
    if (reason) params = params.set('reason', reason);
    return this.http.delete<void>(`${this.base}/${documentId}`, { params });
  }

  restore(documentId: string): Observable<void> {
    return this.http.post<void>(`${this.base}/${documentId}/restore`, {});
  }

  /** Permanent: removes the stored files too. Rejected while a retention date stands. */
  purge(documentId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${documentId}/purge`);
  }

  checkOut(documentId: string): Observable<void> {
    return this.http.post<void>(`${this.base}/${documentId}/checkout`, {});
  }

  checkIn(documentId: string, force = false): Observable<void> {
    const params = force ? new HttpParams().set('force', true) : undefined;
    return this.http.post<void>(`${this.base}/${documentId}/checkin`, {}, { params });
  }

  private trackUpload(request: HttpRequest<FormData>): Observable<UploadProgress> {
    return this.http.request<{ id?: string; versionNumber?: number }>(request).pipe(
      map((event: HttpEvent<{ id?: string; versionNumber?: number }>): UploadProgress => {
        if (event.type === HttpEventType.UploadProgress) {
          const percent = event.total ? Math.round((100 * event.loaded) / event.total) : 0;
          return { state: 'progress', percent };
        }
        if (event.type === HttpEventType.Response) {
          return { state: 'done', id: event.body?.id, versionNumber: event.body?.versionNumber };
        }
        return { state: 'progress', percent: 0 };
      }),
    );
  }
}

/** Pulls the human-readable message out of the API's ProblemDetails body (e.g. rejected uploads). */
export function documentErrorMessage(error: unknown, fallback = 'Something went wrong.'): string {
  if (error instanceof HttpErrorResponse) {
    const detail = (error.error as { detail?: string; title?: string } | null)?.detail;
    const title = (error.error as { detail?: string; title?: string } | null)?.title;
    return detail || title || error.message || fallback;
  }
  return fallback;
}

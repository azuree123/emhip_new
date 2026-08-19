import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  CreateCustomFieldRequest,
  CustomFieldDefinitionDto,
  CustomFieldEntityType,
  CustomFieldEntry,
  CustomFieldValueDto,
  DeleteCustomFieldResult,
  UpdateCustomFieldRequest,
} from './api-models';

/** Maps 1:1 to CustomFieldsController. */
@Injectable({ providedIn: 'root' })
export class CustomFieldsApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/custom-fields`;

  /**
   * Cache of "does this form have any custom fields at all", so every form that embeds the
   * renderer doesn't fire a request when the answer is "none configured" (the common case).
   */
  private readonly definitionCache = new Map<CustomFieldEntityType, CustomFieldDefinitionDto[]>();

  getDefinitions(entityType?: CustomFieldEntityType, includeInactive = false): Observable<CustomFieldDefinitionDto[]> {
    let params = new HttpParams();
    if (entityType) params = params.set('entityType', entityType);
    if (includeInactive) params = params.set('includeInactive', true);
    return this.http.get<CustomFieldDefinitionDto[]>(this.base, { params });
  }

  /** Active definitions for one form, cached for the session. */
  getActiveDefinitions(entityType: CustomFieldEntityType): Observable<CustomFieldDefinitionDto[]> {
    const cached = this.definitionCache.get(entityType);
    if (cached) return of(cached);
    return this.getDefinitions(entityType).pipe(tap((defs) => this.definitionCache.set(entityType, defs)));
  }

  /** Call after any definition change so forms pick it up without a reload. */
  invalidateCache(): void {
    this.definitionCache.clear();
  }

  create(request: CreateCustomFieldRequest): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(this.base, request).pipe(tap(() => this.invalidateCache()));
  }

  update(id: string, request: UpdateCustomFieldRequest): Observable<void> {
    return this.http.put<void>(`${this.base}/${id}`, request).pipe(tap(() => this.invalidateCache()));
  }

  /** Deletes an unused field; one that already holds answers is deactivated instead (see `deleted`). */
  delete(id: string): Observable<DeleteCustomFieldResult> {
    return this.http.delete<DeleteCustomFieldResult>(`${this.base}/${id}`).pipe(tap(() => this.invalidateCache()));
  }

  reorder(entityType: CustomFieldEntityType, orderedIds: string[]): Observable<void> {
    return this.http.put<void>(`${this.base}/reorder`, { entityType, orderedIds }).pipe(tap(() => this.invalidateCache()));
  }

  /** Definitions merged with this record's answers. */
  getValues(entityType: CustomFieldEntityType, entityId: string): Observable<CustomFieldValueDto[]> {
    return this.http.get<CustomFieldValueDto[]>(`${this.base}/values/${entityType}/${entityId}`);
  }

  saveValues(entityType: CustomFieldEntityType, entityId: string, entries: CustomFieldEntry[]): Observable<void> {
    return this.http.put<void>(`${this.base}/values/${entityType}/${entityId}`, { entries });
  }
}

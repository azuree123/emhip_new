import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  ContactHistoryRowDto,
  ContactHistorySummaryDto,
  ContactListRowDto,
  ContactOutcome,
  ContactType,
  ContactsByGuestRowDto,
  KeysetPage,
} from './api-models';

/** The "All contacts" dropdown values — mirrors ContactHistoryCategory on the server. */
export type ContactHistoryCategory = 'Casework' | 'Activity' | 'Hospitality' | 'Afa' | 'Cpn';

/** Which tile a contact list opens — mirrors ContactListKind on the server. */
export type ContactListKind =
  | 'All'
  | 'Casework'
  | 'Activity'
  | 'Hospitality'
  | 'Afa'
  | 'AfaAndHospitality'
  | 'Cpn'
  | 'CpnSessions'
  | 'CpnAssessments';

/** The caseload scope and date range shared by the screen's list, tiles and tile lists. */
export interface ContactScopeOptions {
  /** Staff id of the guest's assigned CMHW (the CMHW filter). */
  cmhw?: string;
  /** "My caseload" — guests allocated to this staff member as their CMHW or their confirmed CPN. */
  caseload?: string;
  /** yyyy-MM-dd, inclusive. */
  from?: string;
  to?: string;
}

export interface ContactsByGuestOptions extends ContactScopeOptions {
  q?: string;
  category?: ContactHistoryCategory;
  cursor?: string;
  pageSize?: number;
}

export interface ContactListOptions extends ContactScopeOptions {
  kind: ContactListKind;
  cursor?: string;
  pageSize?: number;
}

function scopeParams(opts: ContactScopeOptions): HttpParams {
  let params = new HttpParams();
  if (opts.cmhw) params = params.set('cmhw', opts.cmhw);
  if (opts.caseload) params = params.set('caseload', opts.caseload);
  if (opts.from) params = params.set('from', opts.from);
  if (opts.to) params = params.set('to', opts.to);
  return params;
}

/** Maps 1:1 to ContactsController — the hub-wide Contact History screen. */
@Injectable({ providedIn: 'root' })
export class ContactsApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/contacts`;

  /** Keyset-paged contacts across the hub, newest first. Pass `cursor` from the previous page to continue. */
  getHistory(opts: {
    q?: string;
    guest?: string;
    /** Staff id of the worker who logged the contact. */
    loggedBy?: string;
    /** Staff id of the guest's assigned CMHW. */
    cmhw?: string;
    type?: ContactType;
    outcome?: ContactOutcome;
    /** yyyy-MM-dd, inclusive. */
    from?: string;
    to?: string;
    cursor?: string;
    pageSize?: number;
  }): Observable<KeysetPage<ContactHistoryRowDto>> {
    let params = new HttpParams();
    if (opts.q) params = params.set('q', opts.q);
    if (opts.guest) params = params.set('guest', opts.guest);
    if (opts.loggedBy) params = params.set('loggedBy', opts.loggedBy);
    if (opts.cmhw) params = params.set('cmhw', opts.cmhw);
    if (opts.type) params = params.set('type', opts.type);
    if (opts.outcome) params = params.set('outcome', opts.outcome);
    if (opts.from) params = params.set('from', opts.from);
    if (opts.to) params = params.set('to', opts.to);
    if (opts.cursor) params = params.set('cursor', opts.cursor);
    if (opts.pageSize) params = params.set('pageSize', opts.pageSize);
    return this.http.get<KeysetPage<ContactHistoryRowDto>>(this.base, { params });
  }

  /** Contact History screen rows — one per guest with any contact, most recent contact first (keyset-paged). */
  getByGuest(opts: ContactsByGuestOptions): Observable<KeysetPage<ContactsByGuestRowDto>> {
    let params = scopeParams(opts);
    if (opts.q) params = params.set('q', opts.q);
    if (opts.category) params = params.set('category', opts.category);
    if (opts.cursor) params = params.set('cursor', opts.cursor);
    if (opts.pageSize) params = params.set('pageSize', opts.pageSize);
    return this.http.get<KeysetPage<ContactsByGuestRowDto>>(`${this.base}/by-guest`, { params });
  }

  /** The screen's stat tiles for the same caseload scope. */
  getSummary(opts: ContactScopeOptions): Observable<ContactHistorySummaryDto> {
    return this.http.get<ContactHistorySummaryDto>(`${this.base}/summary`, { params: scopeParams(opts) });
  }

  /** The contacts behind one tile, newest first (keyset-paged); the first page's `totalCount` is the tile's figure. */
  getList(opts: ContactListOptions): Observable<KeysetPage<ContactListRowDto>> {
    let params = scopeParams(opts).set('kind', opts.kind);
    if (opts.cursor) params = params.set('cursor', opts.cursor);
    if (opts.pageSize) params = params.set('pageSize', opts.pageSize);
    return this.http.get<KeysetPage<ContactListRowDto>>(`${this.base}/list`, { params });
  }
}

import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  AddContactRequest,
  AddNoteRequest,
  CmhwOptionDto,
  CreatePathwayReferralRequest,
  GuestClinicalDto,
  GuestDemographicsDto,
  GuestFollowUpsDto,
  GuestInitialConversationDto,
  GuestListItemDto,
  GuestOverviewDto,
  GuestPathwayDto,
  GuestStatus,
  KeysetPage,
  PathwayCategory,
  RecordInitialConversationRequest,
  RecordRiskAssessmentRequest,
  RegisterGuestRequest,
  ScheduleFollowUpRequest,
  UpdateDemographicsRequest,
} from './api-models';

/** Maps 1:1 to GuestsController — see ARCHITECTURE.md "API surface". */
@Injectable({ providedIn: 'root' })
export class GuestsApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/guests`;

  getGuestList(opts: {
    q?: string;
    status?: GuestStatus;
    pathway?: PathwayCategory;
    /** true = only guests whose latest risk assessment has flags; false = only guests without. */
    risk?: boolean;
    /** Staff GUID from getCmhwOptions() — filters to guests assigned to that CMHW. */
    cmhw?: string;
    /** Only guests whose last contact falls within the past N days. */
    lastActivityDays?: number;
    cursor?: string;
    pageSize?: number;
  }): Observable<KeysetPage<GuestListItemDto>> {
    let params = new HttpParams();
    if (opts.q) params = params.set('q', opts.q);
    if (opts.status) params = params.set('status', opts.status);
    if (opts.pathway) params = params.set('pathway', opts.pathway);
    // risk=false is a real filter (low-risk only), so test for undefined rather than truthiness.
    if (opts.risk !== undefined) params = params.set('risk', opts.risk);
    if (opts.cmhw) params = params.set('cmhw', opts.cmhw);
    if (opts.lastActivityDays) params = params.set('lastActivityDays', opts.lastActivityDays);
    if (opts.cursor) params = params.set('cursor', opts.cursor);
    if (opts.pageSize) params = params.set('pageSize', opts.pageSize);
    return this.http.get<KeysetPage<GuestListItemDto>>(this.base, { params });
  }

  /** CMHW options for the guest list's "Assigned CMHW" filter — current hub only. */
  getCmhwOptions(): Observable<CmhwOptionDto[]> {
    return this.http.get<CmhwOptionDto[]>(`${this.base}/cmhws`);
  }

  register(request: RegisterGuestRequest): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(this.base, request);
  }

  getOverview(guestId: string): Observable<GuestOverviewDto> {
    return this.http.get<GuestOverviewDto>(`${this.base}/${guestId}/overview`);
  }

  getDemographics(guestId: string): Observable<GuestDemographicsDto> {
    return this.http.get<GuestDemographicsDto>(`${this.base}/${guestId}/demographics`);
  }

  updateDemographics(guestId: string, request: UpdateDemographicsRequest): Observable<void> {
    return this.http.put<void>(`${this.base}/${guestId}/demographics`, request);
  }

  getClinical(guestId: string): Observable<GuestClinicalDto> {
    return this.http.get<GuestClinicalDto>(`${this.base}/${guestId}/clinical`);
  }

  recordRiskAssessment(guestId: string, request: RecordRiskAssessmentRequest): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(`${this.base}/${guestId}/risk-assessments`, request);
  }

  getPathway(guestId: string): Observable<GuestPathwayDto> {
    return this.http.get<GuestPathwayDto>(`${this.base}/${guestId}/pathway`);
  }

  createPathwayReferral(guestId: string, request: CreatePathwayReferralRequest): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(`${this.base}/${guestId}/pathway`, request);
  }

  getFollowUps(guestId: string): Observable<GuestFollowUpsDto> {
    return this.http.get<GuestFollowUpsDto>(`${this.base}/${guestId}/followups`);
  }

  scheduleFollowUp(guestId: string, request: ScheduleFollowUpRequest): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(`${this.base}/${guestId}/followups`, request);
  }

  getInitialConversation(guestId: string): Observable<GuestInitialConversationDto> {
    return this.http.get<GuestInitialConversationDto>(`${this.base}/${guestId}/initial-conversation`);
  }

  recordInitialConversation(guestId: string, request: RecordInitialConversationRequest): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(`${this.base}/${guestId}/initial-conversation`, request);
  }

  addContact(guestId: string, request: AddContactRequest): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(`${this.base}/${guestId}/contacts`, request);
  }

  addNote(guestId: string, request: AddNoteRequest): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(`${this.base}/${guestId}/notes`, request);
  }
}

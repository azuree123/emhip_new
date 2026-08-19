import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  AddContactRequest,
  GuestNoteDto,
  ChangePathwayRequest,
  CaseworkNoteInput,
  CaseworkNoteDto,
  AddNoteRequest,
  AllocateGuestRequest,
  ClinicalProfileDto,
  CmhwOptionDto,
  CreatePathwayReferralRequest,
  DialogScores,
  GuestActionDto,
  GuestActionRequest,
  GuestClinicalDto,
  GuestDemographicsDto,
  GuestDialogDto,
  GuestFollowUpsDto,
  GuestInitialConversationDto,
  GuestListItemDto,
  GuestOverviewDto,
  GuestPathwayDto,
  GuestStatus,
  GuestSuggestionDto,
  KeysetPage,
  PathwayCategory,
  RecordInitialConversationRequest,
  RecordRiskAssessmentRequest,
  RegisterGuestRequest,
  ScheduleFollowUpRequest,
  UpdateClinicalProfileRequest,
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

  /** Top-bar search autocomplete — matches names or "G-1001" references within the caller's hub. */
  suggest(q: string, limit = 8): Observable<GuestSuggestionDto[]> {
    const params = new HttpParams().set('q', q).set('limit', limit);
    return this.http.get<GuestSuggestionDto[]>(`${this.base}/suggest`, { params });
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

  /** All quick notes for the guest, pinned first. */
  getNotes(guestId: string): Observable<GuestNoteDto[]> {
    return this.http.get<GuestNoteDto[]>(`${this.base}/${guestId}/notes`);
  }

  addNote(guestId: string, request: AddNoteRequest): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(`${this.base}/${guestId}/notes`, request);
  }

  /** Pinned notes surface on the guest overview. */
  setNotePinned(guestId: string, noteId: string, isPinned: boolean): Observable<void> {
    return this.http.put<void>(`${this.base}/${guestId}/notes/${noteId}/pin`, { isPinned });
  }

  /** Casework notes (SBAR clinical records), newest first. */
  getCaseworkNotes(guestId: string): Observable<CaseworkNoteDto[]> {
    return this.http.get<CaseworkNoteDto[]>(`${this.base}/${guestId}/casework-notes`);
  }

  /**
   * Saves a casework note. `submit: false` keeps it as a draft; submitting writes the linked
   * contact, the actions arising, and the next-contact follow-up.
   */
  saveCaseworkNote(guestId: string, input: CaseworkNoteInput, submit: boolean): Observable<{ id: string }> {
    const params = new HttpParams().set('submit', submit);
    return this.http.post<{ id: string }>(`${this.base}/${guestId}/casework-notes`, input, { params });
  }

  updateCaseworkNote(guestId: string, noteId: string, input: CaseworkNoteInput, submit: boolean): Observable<void> {
    const params = new HttpParams().set('submit', submit);
    return this.http.put<void>(`${this.base}/${guestId}/casework-notes/${noteId}`, input, { params });
  }

  /** Discards a draft; submitted notes are part of the clinical record and cannot be deleted. */
  deleteCaseworkNote(guestId: string, noteId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${guestId}/casework-notes/${noteId}`);
  }

  /** "Change Pathway" — moves the guest and appends the pathway-history entry. */
  changePathway(guestId: string, request: ChangePathwayRequest): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(`${this.base}/${guestId}/pathway-changes`, request);
  }

  /** DIALOG tab — baseline (version 1), latest and full history. */
  getDialog(guestId: string): Observable<GuestDialogDto> {
    return this.http.get<GuestDialogDto>(`${this.base}/${guestId}/dialog`);
  }

  /** Records the next DIALOG version; scores are 1–7 per domain. */
  recordDialogAssessment(guestId: string, scores: DialogScores): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(`${this.base}/${guestId}/dialog-assessments`, scores);
  }

  getActions(guestId: string): Observable<GuestActionDto[]> {
    return this.http.get<GuestActionDto[]>(`${this.base}/${guestId}/actions`);
  }

  addAction(guestId: string, request: GuestActionRequest): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(`${this.base}/${guestId}/actions`, request);
  }

  updateAction(guestId: string, actionId: string, request: GuestActionRequest): Observable<void> {
    return this.http.put<void>(`${this.base}/${guestId}/actions/${actionId}`, request);
  }

  deleteAction(guestId: string, actionId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${guestId}/actions/${actionId}`);
  }

  getClinicalProfile(guestId: string): Observable<ClinicalProfileDto> {
    return this.http.get<ClinicalProfileDto>(`${this.base}/${guestId}/clinical-profile`);
  }

  updateClinicalProfile(guestId: string, request: UpdateClinicalProfileRequest): Observable<void> {
    return this.http.put<void>(`${this.base}/${guestId}/clinical-profile`, request);
  }

  /** Register flow "Pathway & allocation" step. */
  allocate(guestId: string, request: AllocateGuestRequest): Observable<void> {
    return this.http.post<void>(`${this.base}/${guestId}/allocation`, request);
  }
}

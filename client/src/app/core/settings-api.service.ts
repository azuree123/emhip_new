import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  CreateLookupRequest,
  DocumentStorageProvider,
  EmailPreviewDto,
  EmailTemplateDto,
  EmailTestResultDto,
  LookupItemDto,
  PublicSettings,
  SettingsSectionDto,
  StorageTestResultDto,
  UpdateEmailTemplateRequest,
  UpdateLookupRequest,
} from './api-models';

/** Setting keys the SPA reads — mirrors SettingsCatalog.Keys on the server. */
export const SettingKeys = {
  OrganisationName: 'general.organisationName',
  SupportEmail: 'general.supportEmail',
  DateFormat: 'general.dateFormat',
  MaxUploadMb: 'documents.upload.maxFileSizeMb',
  AllowedExtensions: 'documents.upload.allowedExtensions',
  DefaultRetentionYears: 'documents.retentionYears',
  UrgentResponseHours: 'clinical.urgentResponseHours',
  InactivityDays: 'clinical.inactivityDays',
  FollowUpDefaultDays: 'clinical.followUpDefaultDays',
  DialogReviewWeeks: 'clinical.dialogReviewWeeks',
  GuestListPageSize: 'ui.guestListPageSize',
} as const;

/** Maps 1:1 to SettingsController and LookupsController. */
@Injectable({ providedIn: 'root' })
export class SettingsApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/settings`;
  private readonly lookupsBase = `${environment.apiBaseUrl}/lookups`;
  private readonly emailTemplatesBase = `${environment.apiBaseUrl}/email-templates`;

  /** Cached display settings, loaded once after sign-in. */
  private readonly publicSettings = signal<PublicSettings>({});

  readonly organisationName = computed(() => this.publicSettings()[SettingKeys.OrganisationName] || 'EMHIP');
  readonly dateFormat = computed(() => this.publicSettings()[SettingKeys.DateFormat] || 'dd MMM yyyy');
  readonly maxUploadMb = computed(() => Number(this.publicSettings()[SettingKeys.MaxUploadMb] ?? 25));
  readonly allowedExtensions = computed(() =>
    (this.publicSettings()[SettingKeys.AllowedExtensions] ?? '')
      .split(',')
      .map((e) => e.trim().replace(/^\./, '').toLowerCase())
      .filter(Boolean),
  );
  readonly urgentResponseHours = computed(() => Number(this.publicSettings()[SettingKeys.UrgentResponseHours] ?? 72));
  readonly followUpDefaultDays = computed(() => Number(this.publicSettings()[SettingKeys.FollowUpDefaultDays] ?? 14));
  readonly dialogReviewWeeks = computed(() => Number(this.publicSettings()[SettingKeys.DialogReviewWeeks] ?? 12));

  /** Called once by the shell after sign-in; safe to call again to refresh after a settings save. */
  loadPublicSettings(): Observable<PublicSettings> {
    return this.http.get<PublicSettings>(`${this.base}/public`).pipe(tap((values) => this.publicSettings.set(values)));
  }

  /** Full editor (requires settings.view) — secrets arrive as null with hasValue telling you if one is stored. */
  getSettings(): Observable<SettingsSectionDto[]> {
    return this.http.get<SettingsSectionDto[]>(this.base);
  }

  /** Send only changed keys; omit a secret to keep the stored value. */
  updateSettings(values: Record<string, string | null>): Observable<void> {
    return this.http.put<void>(this.base, values);
  }

  /** Writes and removes a probe object to prove the credentials work. Blank values fall back to what's saved. */
  testStorage(provider: DocumentStorageProvider, values: Record<string, string | null>): Observable<StorageTestResultDto> {
    return this.http.post<StorageTestResultDto>(`${this.base}/storage/test`, { provider, values });
  }

  /** Editable transactional email templates (keys are fixed by the code that sends them). */
  getEmailTemplates(): Observable<EmailTemplateDto[]> {
    return this.http.get<EmailTemplateDto[]>(this.emailTemplatesBase);
  }

  updateEmailTemplate(key: string, request: UpdateEmailTemplateRequest): Observable<void> {
    return this.http.put<void>(`${this.emailTemplatesBase}/${key}`, request);
  }

  /** Restores the template shipped with the application. */
  resetEmailTemplate(key: string): Observable<void> {
    return this.http.post<void>(`${this.emailTemplatesBase}/${key}/reset`, {});
  }

  /** Renders with sample data; pass unsaved editor content to preview before saving. */
  previewEmailTemplate(key: string, subject?: string, htmlBody?: string): Observable<EmailPreviewDto> {
    return this.http.post<EmailPreviewDto>(`${this.emailTemplatesBase}/${key}/preview`, { subject, htmlBody });
  }

  /** Sends a real message using the supplied (possibly unsaved) email settings. */
  testEmail(toEmail: string, provider: string, values: Record<string, string | null>): Observable<EmailTestResultDto> {
    return this.http.post<EmailTestResultDto>(`${this.base}/email/test`, { toEmail, provider, values });
  }

  getLookups(category?: string, includeInactive = false): Observable<LookupItemDto[]> {
    let params = new HttpParams();
    if (category) params = params.set('category', category);
    if (includeInactive) params = params.set('includeInactive', true);
    return this.http.get<LookupItemDto[]>(this.lookupsBase, { params });
  }

  createLookup(request: CreateLookupRequest): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(this.lookupsBase, request);
  }

  updateLookup(id: string, request: UpdateLookupRequest): Observable<void> {
    return this.http.put<void>(`${this.lookupsBase}/${id}`, request);
  }

  /** Only custom items can be deleted; built-ins must be deactivated instead. */
  deleteLookup(id: string): Observable<void> {
    return this.http.delete<void>(`${this.lookupsBase}/${id}`);
  }

  reorderLookups(category: string, orderedIds: string[]): Observable<void> {
    return this.http.put<void>(`${this.lookupsBase}/reorder`, { category, orderedIds });
  }
}

/** Lookup categories seeded by the server (LookupSeeder.Categories). */
export const LookupCategories = {
  DocumentCategory: 'DocumentCategory',
  ReferralSource: 'ReferralSource',
  Ethnicity: 'Ethnicity',
  HousingStatus: 'HousingStatus',
  EmploymentStatus: 'EmploymentStatus',
  PreferredLanguage: 'PreferredLanguage',
  DiagnosisGroup: 'DiagnosisGroup',
  CmhtTeam: 'CmhtTeam',
  EscalationReason: 'EscalationReason',
  EscalationUrgency: 'EscalationUrgency',
  FollowUpCadence: 'FollowUpCadence',
  ContactRelationship: 'ContactRelationship',
} as const;

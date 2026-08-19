import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import {
  DocumentStorageProvider,
  EmailTestResultDto,
  SettingFieldDto,
  SettingsSectionDto,
  StorageTestResultDto,
} from '../../core/api-models';
import { AuthService } from '../../core/auth.service';
import { Permissions } from '../../core/permissions';
import { SettingsApiService } from '../../core/settings-api.service';
import { EmailTemplatesComponent } from './email-templates.component';
import { LookupsManagerComponent } from './lookups-manager.component';

/** Pseudo-tabs appended after the catalog sections — their own editors, not settings-catalog fields. */
const LOOKUPS_TAB = 'Lookups';
const EMAIL_TEMPLATES_TAB = 'Email templates';

/**
 * Tab order the design calls for. Sections the server adds later still appear — they just fall in
 * after these, so a new SettingsCatalog section needs no change here.
 */
const SECTION_ORDER = ['General', 'Document storage', 'Uploads', 'Clinical', 'Interface', 'Email'];

/** Mirrors SettingsCatalog's StorageSection constant — the one section that gets the Test connection action. */
const STORAGE_SECTION = 'Document storage';

/** SettingsCatalog.Keys.StorageProvider. Not in SettingKeys because the SPA never reads it outside this screen. */
const STORAGE_PROVIDER_KEY = 'documents.storage.provider';

/** SettingsCatalog's EmailSection — the section that gets the Send test email action. */
const EMAIL_SECTION = 'Email';

/** SettingsCatalog.Keys.EmailProvider. "None" logs messages instead of sending them. */
const EMAIL_PROVIDER_KEY = 'email.provider';

/**
 * "Settings" — the portal configuration editor. Everything on the General/Document storage/
 * Uploads/Clinical/Interface tabs is rendered generically from the catalog GET /settings returns
 * (SettingsCatalog on the server), so wiring up a new setting is a server-side one-liner: fields
 * arrive with their kind, options and visibleWhen rules and this screen lays them out unchanged.
 * The Email templates and Lookups tabs hand off to their own editors.
 *
 * settings.view opens the page read-only; settings.manage unlocks the inputs, Save, the storage
 * Test connection probe and the Send test email action.
 */
@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [EmailTemplatesComponent, LookupsManagerComponent],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsComponent implements OnInit {
  private readonly settingsApi = inject(SettingsApiService);
  private readonly auth = inject(AuthService);

  readonly lookupsTab = LOOKUPS_TAB;
  readonly emailTemplatesTab = EMAIL_TEMPLATES_TAB;

  /** The Email templates editor, when that tab is open — consulted by the tab-switch guard. */
  private readonly emailTemplates = viewChild(EmailTemplatesComponent);

  /** settings.view alone can reach this route, so the whole form falls back to read-only. */
  readonly canManage = this.auth.hasPermission(Permissions.Settings.Manage);

  readonly sections = signal<SettingsSectionDto[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);

  /** Working copy, keyed by setting key. Secrets always start blank — the server never sends them. */
  readonly values = signal<Record<string, string>>({});
  /** What the server last told us, for the dirty diff. Replaced wholesale whenever the catalog loads. */
  private readonly baseline = signal<Record<string, string>>({});

  readonly activeTab = signal<string>(SECTION_ORDER[0]);
  /** Set while the discard-changes prompt is up; holds the tab we're trying to move to. */
  readonly pendingTab = signal<string | null>(null);

  readonly saving = signal(false);
  readonly saved = signal(false);
  readonly saveError = signal<string | null>(null);

  readonly testing = signal(false);
  readonly testResult = signal<StorageTestResultDto | null>(null);

  /** Send test email — the Email section's equivalent of the storage connection probe. */
  readonly testEmailTo = signal('');
  readonly sendingTest = signal(false);
  readonly emailTestResult = signal<EmailTestResultDto | null>(null);

  readonly tabs = computed<string[]>(() => {
    const fromApi = this.sections().map((s) => s.section);
    const ordered = [
      ...SECTION_ORDER.filter((s) => fromApi.includes(s)),
      ...fromApi.filter((s) => !SECTION_ORDER.includes(s)),
    ];
    return [...ordered, EMAIL_TEMPLATES_TAB, LOOKUPS_TAB];
  });

  readonly allFields = computed<SettingFieldDto[]>(() => this.sections().flatMap((s) => s.fields));

  readonly activeSection = computed<SettingsSectionDto | null>(
    () => this.sections().find((s) => s.section === this.activeTab()) ?? null,
  );

  /** Fields on the current tab whose visibleWhen rule is satisfied by the values in the form right now. */
  readonly activeFields = computed<SettingFieldDto[]>(() => {
    const section = this.activeSection();
    return section ? section.fields.filter((field) => this.isVisible(field)) : [];
  });

  readonly isStorageTab = computed(() => this.activeTab() === STORAGE_SECTION);
  readonly isEmailTab = computed(() => this.activeTab() === EMAIL_SECTION);

  readonly isTemplatesTab = computed(() => this.activeTab() === EMAIL_TEMPLATES_TAB);
  readonly isLookupsTab = computed(() => this.activeTab() === LOOKUPS_TAB);
  /** True on the catalog-driven tabs — the ones the header's Save/Discard actually apply to. */
  readonly isSectionTab = computed(() => !this.isTemplatesTab() && !this.isLookupsTab());

  /** Only keys the user actually touched — secrets count as changed the moment anything is typed. */
  readonly changedKeys = computed<string[]>(() => {
    const current = this.values();
    const base = this.baseline();
    return Object.keys(current).filter((key) => current[key] !== (base[key] ?? ''));
  });

  readonly isDirty = computed(() => this.changedKeys().length > 0);

  /** Currently selected email provider; "None" means messages are logged rather than sent. */
  readonly emailProvider = computed(() => this.valueOf(EMAIL_PROVIDER_KEY) || 'None');

  readonly canSendTestEmail = computed(
    () => this.canManage && !this.sendingTest() && !!this.testEmailTo().trim() && this.emailProvider() !== 'None',
  );

  /**
   * Unsaved-change count for whatever the current tab owns — the catalog form on a section tab,
   * the template editor on the Email templates tab. Drives the tab-switch guard prompt.
   */
  readonly guardCount = computed(() =>
    this.isTemplatesTab() ? (this.emailTemplates()?.dirtyCount() ?? 0) : this.changedKeys().length,
  );

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.settingsApi.getSettings().subscribe({
      next: (sections) => {
        this.applyCatalog(sections);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loadError.set(err.error?.message ?? 'Could not load settings.');
        this.loading.set(false);
      },
    });
  }

  // ---- Tabs -----------------------------------------------------------------------------

  selectTab(tab: string): void {
    if (tab === this.activeTab()) return;
    // Values live in one shared map across tabs (and the template editor holds one draft), so
    // leaving mid-edit would quietly strand changes behind a tab the user may not go back to.
    if (this.guardCount() > 0) {
      this.pendingTab.set(tab);
      return;
    }
    this.goToTab(tab);
  }

  /** "Discard changes" on the guard prompt — roll back to the server's values and move on. */
  confirmTabSwitch(): void {
    const tab = this.pendingTab();
    if (!tab) return;
    if (this.isTemplatesTab()) this.emailTemplates()?.discardChanges();
    else this.discardChanges();
    this.pendingTab.set(null);
    this.goToTab(tab);
  }

  cancelTabSwitch(): void {
    this.pendingTab.set(null);
  }

  private goToTab(tab: string): void {
    this.activeTab.set(tab);
    this.testResult.set(null);
    this.emailTestResult.set(null);
    this.saved.set(false);
    this.saveError.set(null);
  }

  // ---- Field rendering ------------------------------------------------------------------

  /** A field with no visibleWhen rule is always shown; otherwise the controlling key must match. */
  isVisible(field: SettingFieldDto): boolean {
    if (!field.visibleWhenKey || !field.visibleWhenValues?.length) return true;
    return field.visibleWhenValues.includes(this.values()[field.visibleWhenKey] ?? '');
  }

  valueOf(key: string): string {
    return this.values()[key] ?? '';
  }

  isChecked(key: string): boolean {
    return this.valueOf(key) === 'true';
  }

  isChanged(key: string): boolean {
    return this.changedKeys().includes(key);
  }

  secretPlaceholder(field: SettingFieldDto): string {
    return field.hasValue ? '••••••••  (leave blank to keep current)' : 'Not configured';
  }

  onTextInput(key: string, event: Event): void {
    this.setValue(key, (event.target as HTMLInputElement).value);
  }

  onTextareaInput(key: string, event: Event): void {
    this.setValue(key, (event.target as HTMLTextAreaElement).value);
  }

  onSelectChange(key: string, event: Event): void {
    this.setValue(key, (event.target as HTMLSelectElement).value);
  }

  onToggleChange(key: string, event: Event): void {
    this.setValue(key, (event.target as HTMLInputElement).checked ? 'true' : 'false');
  }

  private setValue(key: string, value: string): void {
    this.values.update((current) => ({ ...current, [key]: value }));
    // Any edit invalidates the previous save/test outcome.
    this.saved.set(false);
    this.saveError.set(null);
    this.testResult.set(null);
    this.emailTestResult.set(null);
  }

  onTestEmailInput(event: Event): void {
    this.testEmailTo.set((event.target as HTMLInputElement).value);
    this.emailTestResult.set(null);
  }

  // ---- Save -----------------------------------------------------------------------------

  discardChanges(): void {
    this.values.set({ ...this.baseline() });
    this.saved.set(false);
    this.saveError.set(null);
    this.testResult.set(null);
    this.emailTestResult.set(null);
  }

  save(): void {
    if (!this.canManage || this.saving() || !this.isDirty()) return;

    const current = this.values();
    const base = this.baseline();
    const payload: Record<string, string | null> = {};

    for (const field of this.allFields()) {
      const value = current[field.key] ?? '';
      if (field.isSecret) {
        // Blank means "keep what's stored" — the server ignores empty secrets, but there's no
        // reason to put the key on the wire at all.
        if (value !== '') payload[field.key] = value;
      } else if (value !== (base[field.key] ?? '')) {
        // Cleared fields go back as null so the server falls back to the catalog default.
        payload[field.key] = value === '' ? null : value;
      }
    }

    if (Object.keys(payload).length === 0) return;

    this.saving.set(true);
    this.saved.set(false);
    this.saveError.set(null);

    this.settingsApi.updateSettings(payload).subscribe({
      next: () => {
        // Re-read the catalog so the "Configured" chips and stored values reflect the save and
        // the secret inputs blank out again.
        this.settingsApi.getSettings().subscribe({
          next: (sections) => {
            this.applyCatalog(sections);
            this.saving.set(false);
            this.saved.set(true);
          },
          error: () => {
            // The save itself succeeded — only the refresh failed.
            this.saving.set(false);
            this.saved.set(true);
          },
        });
        // Refresh the shell's cached display settings (organisation name, date format, thresholds…).
        this.settingsApi.loadPublicSettings().subscribe({ error: () => undefined });
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.saveError.set(err.error?.message ?? 'Could not save these settings.');
      },
    });
  }

  // ---- Storage connection test ----------------------------------------------------------

  testStorage(): void {
    if (!this.canManage || this.testing()) return;

    const provider = (this.valueOf(STORAGE_PROVIDER_KEY) || 'Local') as DocumentStorageProvider;
    const values = this.sectionValuesForTest(STORAGE_SECTION);

    this.testing.set(true);
    this.testResult.set(null);
    this.settingsApi.testStorage(provider, values).subscribe({
      next: (result) => {
        this.testResult.set(result);
        this.testing.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.testResult.set({ success: false, message: err.error?.message ?? 'The connection test could not be run.' });
        this.testing.set(false);
      },
    });
  }

  // ---- Send test email ------------------------------------------------------------------

  /**
   * Sends a real message through the settings on screen — the email equivalent of the storage
   * probe. Blank secrets are omitted so the server falls back to the stored credentials, letting
   * an admin verify what's already saved without re-typing it.
   */
  sendTestEmail(): void {
    if (!this.canSendTestEmail()) return;

    const toEmail = this.testEmailTo().trim();
    const provider = this.emailProvider();
    const values = this.sectionValuesForTest(EMAIL_SECTION);

    this.sendingTest.set(true);
    this.emailTestResult.set(null);
    this.settingsApi.testEmail(toEmail, provider, values).subscribe({
      next: (result) => {
        this.emailTestResult.set(result);
        this.sendingTest.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.emailTestResult.set({
          success: false,
          message: err.error?.detail ?? err.error?.message ?? 'The test email could not be sent.',
        });
        this.sendingTest.set(false);
      },
    });
  }

  // ---- Internals ------------------------------------------------------------------------

  /**
   * The visible fields of one section as a test payload. Secrets are sent only when something was
   * typed — an omitted secret means "use the stored one" on the server.
   */
  private sectionValuesForTest(section: string): Record<string, string | null> {
    const values: Record<string, string | null> = {};

    for (const field of this.allFields()) {
      if (field.section !== section || !this.isVisible(field)) continue;
      const value = this.valueOf(field.key);
      if (field.isSecret) {
        if (value !== '') values[field.key] = value;
      } else {
        values[field.key] = value;
      }
    }

    return values;
  }

  /** Rebuilds the form + dirty baseline from a freshly fetched catalog. */
  private applyCatalog(sections: SettingsSectionDto[]): void {
    const next: Record<string, string> = {};
    for (const section of sections) {
      for (const field of section.fields) {
        // Secrets arrive as null by design — they start blank and stay blank unless retyped.
        next[field.key] = field.isSecret ? '' : (field.value ?? '');
      }
    }

    this.sections.set(sections);
    this.values.set(next);
    this.baseline.set({ ...next });

    // Land on a tab that actually exists (the catalog drives the list).
    if (!this.tabs().includes(this.activeTab())) {
      this.activeTab.set(this.tabs()[0] ?? LOOKUPS_TAB);
    }
  }
}

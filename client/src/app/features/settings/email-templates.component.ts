import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, ElementRef, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { EmailPreviewDto, EmailTemplateDto } from '../../core/api-models';
import { AuthService } from '../../core/auth.service';
import { Permissions } from '../../core/permissions';
import { SettingsApiService } from '../../core/settings-api.service';

/** The three editable fields, tracked so a token chip knows where to insert itself. */
export type EmailEditorField = 'subject' | 'html' | 'text';

const FIELD_LABELS: Record<EmailEditorField, string> = {
  subject: 'Subject',
  html: 'HTML body',
  text: 'Plain-text body',
};

/** ProblemDetails carries the useful sentence in `detail`; validation failures use `errors`. */
function problemMessage(error: unknown, fallback: string): string {
  const body = (error as HttpErrorResponse | undefined)?.error;
  if (typeof body === 'string' && body.trim()) return body.trim();

  if (body && typeof body === 'object') {
    const detail = (body as { detail?: string }).detail;
    if (detail?.trim()) return detail.trim();

    const errors = (body as { errors?: Record<string, string[]> }).errors;
    if (errors) {
      const messages = Object.values(errors).flat().filter(Boolean);
      if (messages.length) return messages.join(' ');
    }

    const title = (body as { title?: string }).title;
    if (title?.trim()) return title.trim();
  }

  return fallback;
}

/**
 * Wraps the template fragment (the server stores a <div>, not a whole document) in a minimal
 * document for the preview frame. Nothing here can reach the portal: the iframe is sandboxed
 * with no allow-* tokens, so it is a unique origin with scripts, forms and navigation disabled.
 */
function previewDocument(html: string): string {
  return (
    '<!doctype html><html><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '</head><body style="margin:0;background:#f4f4f5;">' +
    html +
    '</body></html>'
  );
}

/**
 * "Email templates" tab of the Settings screen — the wording of every transactional message the
 * portal sends (EmailTemplatesController). Keys are fixed by the code that sends them; the
 * subject, bodies and the on/off switch belong to the admin.
 *
 * Tokens are the only templating supported, so they are the centre of the UI: `template.tokens`
 * renders as chips that insert `{{token}}` at the caret of whichever field was last focused.
 *
 * settings.view opens the tab read-only; settings.manage unlocks the editor, Save and Restore
 * default — matching the controller, where GET is View and the mutations are Manage.
 */
@Component({
  selector: 'emhip-email-templates',
  standalone: true,
  imports: [],
  templateUrl: './email-templates.component.html',
  styleUrl: './email-templates.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmailTemplatesComponent implements OnInit {
  private readonly settingsApi = inject(SettingsApiService);
  private readonly auth = inject(AuthService);
  private readonly sanitizer = inject(DomSanitizer);

  readonly canManage = this.auth.hasPermission(Permissions.Settings.Manage);

  readonly templates = signal<EmailTemplateDto[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);

  readonly selectedKey = signal<string | null>(null);
  readonly selected = computed<EmailTemplateDto | null>(
    () => this.templates().find((t) => t.key === this.selectedKey()) ?? null,
  );

  // ---- Working copy of the selected template ---------------------------------------------

  readonly subject = signal('');
  readonly htmlBody = signal('');
  readonly textBody = signal('');
  readonly isEnabled = signal(true);

  readonly saving = signal(false);
  readonly saved = signal(false);
  readonly saveError = signal<string | null>(null);

  readonly resetting = signal(false);
  readonly resetConfirmOpen = signal(false);

  /** Set while the discard-changes prompt is up; holds the template key we're trying to open. */
  readonly pendingKey = signal<string | null>(null);

  // ---- Preview ----------------------------------------------------------------------------

  readonly previewOpen = signal(false);
  readonly previewLoading = signal(false);
  readonly previewError = signal<string | null>(null);
  readonly preview = signal<EmailPreviewDto | null>(null);
  readonly previewShowsText = signal(false);

  // ---- Token insertion --------------------------------------------------------------------

  /** Which field a token chip will land in. Defaults to the HTML body, where tokens mostly go. */
  readonly lastFocused = signal<EmailEditorField>('html');
  readonly lastFocusedLabel = computed(() => FIELD_LABELS[this.lastFocused()]);

  private readonly subjectInput = viewChild<ElementRef<HTMLInputElement>>('subjectInput');
  private readonly htmlInput = viewChild<ElementRef<HTMLTextAreaElement>>('htmlInput');
  private readonly textInput = viewChild<ElementRef<HTMLTextAreaElement>>('textInput');

  // ---- Dirty state ------------------------------------------------------------------------

  /** Named so the Settings host can word its guard prompt; also drives the "unsaved" chip. */
  readonly dirtyCount = computed(() => {
    const template = this.selected();
    if (!template) return 0;

    let count = 0;
    if (this.subject() !== template.subject) count++;
    if (this.htmlBody() !== template.htmlBody) count++;
    if (this.textBody() !== (template.textBody ?? '')) count++;
    if (this.isEnabled() !== template.isEnabled) count++;
    return count;
  });

  readonly isDirty = computed(() => this.dirtyCount() > 0);

  readonly canSave = computed(
    () => this.canManage && this.isDirty() && !this.saving() && !!this.subject().trim() && !!this.htmlBody().trim(),
  );

  /** The preview document, handed to the sandboxed frame. */
  readonly previewDoc = computed<SafeHtml | null>(() => {
    const rendered = this.preview();
    if (!rendered) return null;
    // The frame is a sandboxed, unique-origin document — scripts and forms cannot run in it and it
    // has no access to the portal. Angular's HTML sanitizer would strip the inline styles every
    // email template depends on, so the markup is passed through to the srcdoc unchanged. This is
    // the only place admin-authored HTML is rendered, and it never touches the app document.
    return this.sanitizer.bypassSecurityTrustHtml(previewDocument(rendered.htmlBody));
  });

  ngOnInit(): void {
    this.load();
  }

  // ---- Loading ----------------------------------------------------------------------------

  load(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.settingsApi.getEmailTemplates().subscribe({
      next: (templates) => {
        this.templates.set(templates);
        this.loading.set(false);

        const current = this.selectedKey();
        const key = current && templates.some((t) => t.key === current) ? current : (templates[0]?.key ?? null);
        this.selectedKey.set(key);
        this.resetDraft();
      },
      error: (err: HttpErrorResponse) => {
        this.loadError.set(problemMessage(err, 'Could not load the email templates.'));
        this.loading.set(false);
      },
    });
  }

  // ---- Selection + dirty guard ------------------------------------------------------------

  selectTemplate(key: string): void {
    if (key === this.selectedKey()) return;
    // One editor shared by every template, so leaving mid-edit would quietly drop the changes.
    if (this.isDirty()) {
      this.pendingKey.set(key);
      return;
    }
    this.openTemplate(key);
  }

  /** "Discard changes" on the guard prompt. */
  confirmSwitch(): void {
    const key = this.pendingKey();
    if (!key) return;
    this.pendingKey.set(null);
    this.openTemplate(key);
  }

  cancelSwitch(): void {
    this.pendingKey.set(null);
  }

  private openTemplate(key: string): void {
    this.selectedKey.set(key);
    this.resetDraft();
  }

  /** Rolls the editor back to the values the server last gave us. Called by the Settings host too. */
  discardChanges(): void {
    this.resetDraft();
  }

  private resetDraft(): void {
    const template = this.selected();
    this.subject.set(template?.subject ?? '');
    this.htmlBody.set(template?.htmlBody ?? '');
    this.textBody.set(template?.textBody ?? '');
    this.isEnabled.set(template?.isEnabled ?? true);
    this.lastFocused.set('html');
    this.saved.set(false);
    this.saveError.set(null);
    this.closePreview();
    this.resetConfirmOpen.set(false);
  }

  // ---- Field edits ------------------------------------------------------------------------

  noteFocus(field: EmailEditorField): void {
    this.lastFocused.set(field);
  }

  onSubjectInput(event: Event): void {
    this.subject.set((event.target as HTMLInputElement).value);
    this.touch();
  }

  onHtmlInput(event: Event): void {
    this.htmlBody.set((event.target as HTMLTextAreaElement).value);
    this.touch();
  }

  onTextInput(event: Event): void {
    this.textBody.set((event.target as HTMLTextAreaElement).value);
    this.touch();
  }

  onEnabledChange(event: Event): void {
    this.isEnabled.set((event.target as HTMLInputElement).checked);
    this.touch();
  }

  private touch(): void {
    this.saved.set(false);
    this.saveError.set(null);
  }

  // ---- Token chips ------------------------------------------------------------------------

  /**
   * Drops `{{token}}` in at the caret of the field that was last focused, replacing any selection.
   * The DOM value is written straight away so the caret can be restored around the insertion, then
   * the signal is updated so the dirty diff and Save payload agree with what's on screen.
   */
  insertToken(token: string): void {
    if (!this.canManage) return;

    const field = this.lastFocused();
    const element = this.elementFor(field);
    if (!element) return;

    const snippet = `{{${token}}}`;
    const value = element.value;
    const start = element.selectionStart ?? value.length;
    const end = element.selectionEnd ?? start;
    const next = value.slice(0, start) + snippet + value.slice(end);
    const caret = start + snippet.length;

    element.value = next;
    this.setField(field, next);
    this.touch();

    // The signal write schedules a re-render that reassigns [value]; put the caret back after it.
    setTimeout(() => {
      element.focus();
      element.setSelectionRange(caret, caret);
    });
  }

  private elementFor(field: EmailEditorField): HTMLInputElement | HTMLTextAreaElement | null {
    switch (field) {
      case 'subject':
        return this.subjectInput()?.nativeElement ?? null;
      case 'text':
        return this.textInput()?.nativeElement ?? null;
      default:
        return this.htmlInput()?.nativeElement ?? null;
    }
  }

  private setField(field: EmailEditorField, value: string): void {
    if (field === 'subject') this.subject.set(value);
    else if (field === 'text') this.textBody.set(value);
    else this.htmlBody.set(value);
  }

  // ---- Save -------------------------------------------------------------------------------

  save(): void {
    const template = this.selected();
    if (!template || !this.canManage || this.saving()) return;

    const subject = this.subject().trim();
    const htmlBody = this.htmlBody();
    if (!subject) {
      this.saveError.set('A subject is required.');
      return;
    }
    if (!htmlBody.trim()) {
      this.saveError.set('The HTML body cannot be empty.');
      return;
    }

    const textBody = this.textBody().trim() ? this.textBody() : null;
    const isEnabled = this.isEnabled();

    this.saving.set(true);
    this.saved.set(false);
    this.saveError.set(null);

    this.settingsApi.updateEmailTemplate(template.key, { subject, htmlBody, textBody, isEnabled }).subscribe({
      next: () => {
        // Patch locally first so the editor stops reading as dirty even if the refresh below fails.
        this.patchTemplate(template.key, { subject, htmlBody, textBody, isEnabled });
        this.subject.set(subject);
        this.saving.set(false);
        this.saved.set(true);
        this.refreshQuietly();
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.saveError.set(problemMessage(err, 'Could not save this template.'));
      },
    });
  }

  // ---- Restore default --------------------------------------------------------------------

  askReset(): void {
    if (!this.canManage || !this.selected()) return;
    this.resetConfirmOpen.set(true);
  }

  cancelReset(): void {
    this.resetConfirmOpen.set(false);
  }

  confirmReset(): void {
    const template = this.selected();
    if (!template || !this.canManage || this.resetting()) return;

    this.resetting.set(true);
    this.saveError.set(null);
    this.settingsApi.resetEmailTemplate(template.key).subscribe({
      next: () => {
        this.resetting.set(false);
        this.resetConfirmOpen.set(false);
        // The shipped wording only lives on the server, so re-read rather than guess at it.
        this.settingsApi.getEmailTemplates().subscribe({
          next: (templates) => {
            this.templates.set(templates);
            this.resetDraft();
            this.saved.set(true);
          },
          error: (err: HttpErrorResponse) => {
            this.saveError.set(problemMessage(err, 'Restored, but the template could not be reloaded.'));
          },
        });
      },
      error: (err: HttpErrorResponse) => {
        this.resetting.set(false);
        this.resetConfirmOpen.set(false);
        this.saveError.set(problemMessage(err, 'Could not restore the default wording.'));
      },
    });
  }

  // ---- Preview ----------------------------------------------------------------------------

  openPreview(): void {
    const template = this.selected();
    if (!template) return;

    this.previewOpen.set(true);
    this.previewShowsText.set(false);
    this.previewLoading.set(true);
    this.previewError.set(null);
    this.preview.set(null);

    // Unsaved editor content is sent so the preview shows what's on screen, not what's stored.
    this.settingsApi.previewEmailTemplate(template.key, this.subject(), this.htmlBody()).subscribe({
      next: (rendered) => {
        this.preview.set(rendered);
        this.previewLoading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.previewError.set(problemMessage(err, 'Could not render a preview of this template.'));
        this.previewLoading.set(false);
      },
    });
  }

  closePreview(): void {
    this.previewOpen.set(false);
    this.preview.set(null);
    this.previewError.set(null);
    this.previewLoading.set(false);
    this.previewShowsText.set(false);
  }

  togglePreviewText(): void {
    this.previewShowsText.update((v) => !v);
  }

  // ---- Display helpers --------------------------------------------------------------------

  /** Built in code rather than the template so the braces never look like an interpolation. */
  tokenText(token: string): string {
    return `{{${token}}}`;
  }

  tokenTitle(token: string): string {
    return `Insert ${this.tokenText(token)} into the ${this.lastFocusedLabel().toLowerCase()}`;
  }

  /** Never-customised templates come back with a default DateTimeOffset (year 0001). */
  lastEdited(template: EmailTemplateDto): string {
    if (!template.updatedAt || template.updatedAt.startsWith('0001')) return 'Using the wording shipped with the portal';

    const when = new Date(template.updatedAt);
    if (Number.isNaN(when.getTime())) return 'Edited';
    return `Last edited ${when.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}`;
  }

  private patchTemplate(key: string, changes: Partial<EmailTemplateDto>): void {
    this.templates.update((all) => all.map((t) => (t.key === key ? { ...t, ...changes } : t)));
  }

  /** Re-reads the list after a save so updatedAt is the server's, not a guess. Failure is harmless. */
  private refreshQuietly(): void {
    this.settingsApi.getEmailTemplates().subscribe({
      next: (templates) => this.templates.set(templates),
      error: () => undefined,
    });
  }
}

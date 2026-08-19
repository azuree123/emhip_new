import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { LookupItemDto } from '../../core/api-models';
import { AuthService } from '../../core/auth.service';
import { DocumentsApiService, documentErrorMessage } from '../../core/documents-api.service';
import { Permissions } from '../../core/permissions';
import { IconComponent } from '../../design-system/icon.component';
import { GuestPickerComponent } from '../../shared/guest-picker.component';
import { fileExtension, formatBytes } from './documents.util';

/**
 * "Upload document" drawer — the single entry point for adding a document to the register.
 *
 * The file is validated against the hub's own upload rules (SettingsApiService.maxUploadMb /
 * allowedExtensions, passed in by the parent) *before* anything is sent, so an oversized or
 * blocked file never costs the operator an upload. Once accepted, the request is streamed with
 * reportProgress and the drawer shows the live percentage from DocumentsApiService's
 * UploadProgress stream. Anything the server still rejects is surfaced verbatim through
 * documentErrorMessage().
 */
@Component({
  selector: 'app-document-upload-drawer',
  standalone: true,
  imports: [IconComponent, FormsModule, GuestPickerComponent],
  templateUrl: './document-upload-drawer.component.html',
  styleUrl: './document-upload-drawer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentUploadDrawerComponent {
  private readonly documentsApi = inject(DocumentsApiService);
  private readonly auth = inject(AuthService);

  /** DocumentCategory lookups, already loaded by the parent screen. */
  readonly categories = input.required<LookupItemDto[]>();
  /** documents.upload.maxFileSizeMb — 0/NaN means "no client-side cap". */
  readonly maxUploadMb = input.required<number>();
  /** documents.upload.allowedExtensions, dot-stripped and lowercased; empty means "any". */
  readonly allowedExtensions = input.required<string[]>();

  readonly closed = output<void>();
  /** Emitted once the upload succeeds so the parent can refresh the register and the stats. */
  readonly uploaded = output<string | null>();

  // ---- Form state ---------------------------------------------------------

  protected readonly file = signal<File | null>(null);
  protected readonly title = signal('');
  protected readonly category = signal('');
  protected readonly description = signal('');
  protected readonly tags = signal<string[]>([]);
  protected readonly tagDraft = signal('');
  protected readonly retainUntil = signal('');
  /** Optional guest link — the shared picker's value, null when no guest is linked. */
  protected readonly guestId = signal<string | null>(null);

  // ---- Drag & drop / request state ---------------------------------------

  protected readonly dragging = signal(false);
  protected readonly fileError = signal<string | null>(null);
  protected readonly submitted = signal(false);
  protected readonly busy = signal(false);
  protected readonly percent = signal(0);
  protected readonly error = signal<string | null>(null);

  // ---- Guest link picker --------------------------------------------------

  /** The picker is pointless (and would 403) without permission to read guests. */
  protected readonly canLinkGuest = this.auth.hasPermission(Permissions.Guests.View);

  protected readonly maxBytes = computed(() => {
    const mb = this.maxUploadMb();
    return Number.isFinite(mb) && mb > 0 ? mb * 1024 * 1024 : 0;
  });

  /** "PDF, DOCX, PNG" — the allow-list as shown under the drop zone. */
  protected readonly extensionSummary = computed(() =>
    this.allowedExtensions()
      .map((e) => e.toUpperCase())
      .join(', '),
  );

  protected readonly canSubmit = computed(
    () => !this.busy() && !!this.file() && !!this.title().trim() && !!this.category() && !this.fileError(),
  );

  // ---- File selection -----------------------------------------------------

  protected onFileInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.acceptFile(input.files?.[0] ?? null);
    // Reset so re-picking the same file after a validation failure still fires a change event.
    input.value = '';
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(true);
  }

  protected onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    this.acceptFile(event.dataTransfer?.files?.[0] ?? null);
  }

  protected clearFile(): void {
    this.file.set(null);
    this.fileError.set(null);
  }

  /** Runs the hub's own size/extension rules before the file is ever accepted into the form. */
  private acceptFile(candidate: File | null): void {
    if (!candidate) {
      return;
    }
    const problem = this.validateFile(candidate);
    this.fileError.set(problem);
    this.file.set(candidate);
    // Seed the title from the file name (minus its extension) the first time round.
    if (!problem && !this.title().trim()) {
      const dot = candidate.name.lastIndexOf('.');
      this.title.set(dot > 0 ? candidate.name.slice(0, dot) : candidate.name);
    }
  }

  private validateFile(candidate: File): string | null {
    const allowed = this.allowedExtensions();
    const extension = fileExtension(candidate.name);
    if (allowed.length > 0 && (!extension || !allowed.includes(extension))) {
      return `${extension ? '.' + extension : 'That file type'} isn't accepted. Allowed types: ${this.extensionSummary()}.`;
    }
    const max = this.maxBytes();
    if (max > 0 && candidate.size > max) {
      return `${formatBytes(candidate.size)} exceeds the ${this.maxUploadMb()} MB upload limit.`;
    }
    if (candidate.size === 0) {
      return 'That file is empty.';
    }
    return null;
  }

  protected fileSize(): string {
    const file = this.file();
    return file ? formatBytes(file.size) : '';
  }

  // ---- Tags ---------------------------------------------------------------

  protected onTagDraft(event: Event): void {
    this.tagDraft.set((event.target as HTMLInputElement).value);
  }

  /** Enter or comma commits the draft as a chip; the API stores them comma-separated. */
  protected onTagKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' && event.key !== ',') {
      return;
    }
    event.preventDefault();
    this.commitTag();
  }

  protected commitTag(): void {
    const value = this.tagDraft().trim().replace(/,+$/, '');
    if (value && !this.tags().includes(value)) {
      this.tags.update((current) => [...current, value]);
    }
    this.tagDraft.set('');
  }

  protected removeTag(tag: string): void {
    this.tags.update((current) => current.filter((t) => t !== tag));
  }

  // ---- Guest link ---------------------------------------------------------

  /** Fed by the shared guest picker; null (its cleared state) files this as a hub document. */
  protected onGuestChange(guestId: string | null): void {
    this.guestId.set(guestId);
  }

  // ---- Plain text inputs --------------------------------------------------

  protected onTitle(event: Event): void {
    this.title.set((event.target as HTMLInputElement).value);
  }

  protected onCategory(event: Event): void {
    this.category.set((event.target as HTMLSelectElement).value);
  }

  protected onDescription(event: Event): void {
    this.description.set((event.target as HTMLTextAreaElement).value);
  }

  protected onRetainUntil(event: Event): void {
    this.retainUntil.set((event.target as HTMLInputElement).value);
  }

  // ---- Submit -------------------------------------------------------------

  protected submit(): void {
    this.submitted.set(true);
    const file = this.file();
    if (!file || !this.canSubmit()) {
      return;
    }

    // A tag left in the box when Upload is pressed should still count.
    this.commitTag();

    this.busy.set(true);
    this.percent.set(0);
    this.error.set(null);

    this.documentsApi
      .upload({
        file,
        title: this.title().trim(),
        category: this.category(),
        guestId: this.guestId(),
        description: this.description().trim() || null,
        tags: this.tags().length ? this.tags().join(', ') : null,
        retainUntil: this.retainUntil() || null,
      })
      .subscribe({
        next: (event) => {
          if (event.state === 'progress') {
            this.percent.set(event.percent);
            return;
          }
          this.percent.set(100);
          this.busy.set(false);
          this.uploaded.emit(event.id ?? null);
        },
        error: (err: unknown) => {
          this.busy.set(false);
          this.error.set(documentErrorMessage(err, 'The upload was rejected. Please try again.'));
        },
      });
  }

  protected close(): void {
    if (this.busy()) {
      return;
    }
    this.closed.emit();
  }
}

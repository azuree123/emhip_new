import { ChangeDetectionStrategy, Component, EventEmitter, Output, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DocumentDetailDto, DocumentListItemDto, LookupItemDto } from '../../core/api-models';
import { AuthService } from '../../core/auth.service';
import { DocumentsApiService, documentErrorMessage } from '../../core/documents-api.service';
import { Permissions } from '../../core/permissions';
import { LookupCategories, SettingsApiService } from '../../core/settings-api.service';
import { formatDate, formatDateTime, humanize } from './guest-workspace.util';

/** Draft of the "Upload document" form — plain object so the template can use [(ngModel)]. */
interface UploadForm {
  title: string;
  category: string;
  description: string;
  tags: string;
}

/**
 * Documents tab — this guest's files, listed from DocumentsApiService.getList({ guestId }).
 * Same card/table/pill language as the other workspace tabs (guest-tab-shared.scss): a single
 * white card with the red "Upload document" header button, an inline upload panel with
 * drag-and-drop + live progress bar, and a Title / Category / Version / Size / Uploaded table
 * whose rows expand into the document's version history (getDetail) with per-version download
 * and an "Upload new version" form for documents.edit holders.
 *
 * Every action is gated on the permission the API enforces (documents.view/upload/edit/delete);
 * uploads are validated client-side against the documents.upload.* settings before they are sent
 * so an oversized or blocked file never round-trips.
 */
@Component({
  selector: 'emhip-guest-documents-tab',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './guest-documents-tab.component.html',
  styleUrl: './guest-documents-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GuestDocumentsTabComponent {
  private readonly documentsApi = inject(DocumentsApiService);
  private readonly settingsApi = inject(SettingsApiService);
  private readonly auth = inject(AuthService);

  readonly guestId = input.required<string>();
  /** Emitted after an upload/delete so the workspace header can refresh its counters. */
  @Output() readonly refresh = new EventEmitter<void>();

  readonly canView = this.auth.hasPermission(Permissions.Documents.View);
  readonly canUpload = this.auth.hasPermission(Permissions.Documents.Upload);
  readonly canEdit = this.auth.hasPermission(Permissions.Documents.Edit);
  readonly canDelete = this.auth.hasPermission(Permissions.Documents.Delete);

  readonly documents = signal<DocumentListItemDto[] | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  /** Keyset cursor for the "Load more" button; null once the last page is in. */
  readonly nextCursor = signal<string | null>(null);
  readonly loadingMore = signal(false);

  readonly categories = signal<LookupItemDto[]>([]);

  // ---- upload panel ----
  readonly showUpload = signal(false);
  readonly selectedFile = signal<File | null>(null);
  readonly dragging = signal(false);
  readonly uploading = signal(false);
  readonly uploadPercent = signal(0);
  readonly uploadError = signal<string | null>(null);
  form: UploadForm = this.emptyForm();

  // ---- expanded row (version history) ----
  readonly expandedId = signal<string | null>(null);
  readonly detail = signal<DocumentDetailDto | null>(null);
  readonly detailLoading = signal(false);
  readonly detailError = signal<string | null>(null);

  // ---- "Upload new version" inside the expanded row ----
  readonly showVersionForm = signal(false);
  readonly versionFile = signal<File | null>(null);
  readonly versionUploading = signal(false);
  readonly versionPercent = signal(0);
  readonly versionError = signal<string | null>(null);
  versionNote = '';

  /** Id of the row whose download/delete is in flight, so its buttons disable. */
  readonly busyId = signal<string | null>(null);
  readonly rowError = signal<string | null>(null);

  readonly maxUploadMb = this.settingsApi.maxUploadMb;
  readonly allowedExtensions = this.settingsApi.allowedExtensions;
  /** `accept` for the file inputs — omitted when the hub allows any extension. */
  readonly acceptAttr = computed(() => {
    const extensions = this.allowedExtensions();
    return extensions.length ? extensions.map((e) => `.${e}`).join(',') : null;
  });
  readonly uploadHint = computed(() => {
    const extensions = this.allowedExtensions();
    const size = `Up to ${this.maxUploadMb()} MB`;
    return extensions.length ? `${size} · ${extensions.join(', ')}` : size;
  });

  readonly formatDate = formatDate;
  readonly formatDateTime = formatDateTime;

  constructor() {
    effect((onCleanup) => {
      const id = this.guestId();
      let cancelled = false;
      onCleanup(() => (cancelled = true));
      this.resetPanels();
      this.load(id, () => cancelled);
    });
    if (this.canView) {
      this.settingsApi.getLookups(LookupCategories.DocumentCategory).subscribe({
        next: (items) => this.categories.set(items.filter((i) => i.isActive)),
        error: () => this.categories.set([]),
      });
    }
  }

  private emptyForm(): UploadForm {
    return { title: '', category: '', description: '', tags: '' };
  }

  private resetPanels(): void {
    this.showUpload.set(false);
    this.expandedId.set(null);
    this.detail.set(null);
    this.rowError.set(null);
  }

  private load(guestId: string, isCancelled: () => boolean): void {
    if (!this.canView) {
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.documentsApi.getList({ guestId, pageSize: 50 }).subscribe({
      next: (page) => {
        if (isCancelled()) return;
        this.documents.set(page.items);
        this.nextCursor.set(page.hasMore ? page.nextCursor : null);
        this.loading.set(false);
      },
      error: () => {
        if (isCancelled()) return;
        this.error.set('Could not load documents for this guest.');
        this.loading.set(false);
      },
    });
  }

  loadMore(): void {
    const cursor = this.nextCursor();
    if (!cursor || this.loadingMore()) return;
    this.loadingMore.set(true);
    this.documentsApi.getList({ guestId: this.guestId(), cursor, pageSize: 50 }).subscribe({
      next: (page) => {
        this.documents.update((current) => [...(current ?? []), ...page.items]);
        this.nextCursor.set(page.hasMore ? page.nextCursor : null);
        this.loadingMore.set(false);
      },
      error: () => this.loadingMore.set(false),
    });
  }

  /** Lookup label for a stored category code, falling back to the raw value. */
  categoryLabel(category: string): string {
    return this.categories().find((c) => c.code === category)?.label ?? humanize(category);
  }

  /** "812 KB" / "3.4 MB" — the table shows one size per row. */
  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${Math.round(kb)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  }

  splitTags(tags: string | null): string[] {
    return (tags ?? '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
  }

  // ---- upload ----

  toggleUpload(): void {
    if (this.showUpload()) {
      this.closeUpload();
      return;
    }
    this.form = this.emptyForm();
    this.selectedFile.set(null);
    this.uploadError.set(null);
    this.uploadPercent.set(0);
    this.showUpload.set(true);
  }

  closeUpload(): void {
    this.showUpload.set(false);
    this.selectedFile.set(null);
    this.uploadError.set(null);
    this.dragging.set(false);
  }

  onFileInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.pickFile(input.files?.[0] ?? null);
    // Allow re-picking the same file after a rejection.
    input.value = '';
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    this.pickFile(event.dataTransfer?.files?.[0] ?? null);
  }

  private pickFile(file: File | null): void {
    if (!file) return;
    const problem = this.validateFile(file);
    if (problem) {
      this.selectedFile.set(null);
      this.uploadError.set(problem);
      return;
    }
    this.uploadError.set(null);
    this.selectedFile.set(file);
    // Seed the title from the file name (without extension) when the user hasn't typed one.
    if (!this.form.title.trim()) this.form.title = file.name.replace(/\.[^.]+$/, '');
  }

  /** Client-side mirror of the server's upload rules (documents.upload.* settings). */
  private validateFile(file: File): string | null {
    const maxMb = this.maxUploadMb();
    if (maxMb > 0 && file.size > maxMb * 1024 * 1024) {
      return `"${file.name}" is ${this.formatSize(file.size)} — the limit is ${maxMb} MB.`;
    }
    const allowed = this.allowedExtensions();
    if (allowed.length) {
      const extension = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : '';
      if (!allowed.includes(extension)) {
        return `${extension ? `.${extension}` : 'That file type'} is not allowed. Accepted types: ${allowed.join(', ')}.`;
      }
    }
    return null;
  }

  submitUpload(): void {
    const file = this.selectedFile();
    if (!file) {
      this.uploadError.set('Choose a file to upload.');
      return;
    }
    if (!this.form.title.trim()) {
      this.uploadError.set('A title is required.');
      return;
    }
    if (!this.form.category) {
      this.uploadError.set('Choose a category.');
      return;
    }

    this.uploading.set(true);
    this.uploadPercent.set(0);
    this.uploadError.set(null);
    this.documentsApi
      .upload({
        file,
        title: this.form.title.trim(),
        category: this.form.category,
        guestId: this.guestId(),
        description: this.form.description.trim() || null,
        tags: this.form.tags.trim() || null,
      })
      .subscribe({
        next: (progress) => {
          if (progress.state === 'progress') {
            this.uploadPercent.set(progress.percent);
            return;
          }
          this.uploading.set(false);
          this.uploadPercent.set(100);
          this.form = this.emptyForm();
          this.selectedFile.set(null);
          this.showUpload.set(false);
          this.load(this.guestId(), () => false);
          this.refresh.emit();
        },
        error: (err: unknown) => {
          this.uploading.set(false);
          this.uploadError.set(documentErrorMessage(err, 'Could not upload this document. Please try again.'));
        },
      });
  }

  // ---- version history ----

  toggleExpand(doc: DocumentListItemDto): void {
    if (this.expandedId() === doc.id) {
      this.expandedId.set(null);
      this.detail.set(null);
      this.showVersionForm.set(false);
      return;
    }
    this.expandedId.set(doc.id);
    this.detail.set(null);
    this.showVersionForm.set(false);
    this.versionError.set(null);
    this.loadDetail(doc.id);
  }

  private loadDetail(documentId: string): void {
    this.detailLoading.set(true);
    this.detailError.set(null);
    this.documentsApi.getDetail(documentId).subscribe({
      next: (dto) => {
        // A second row may have been expanded while this request was in flight.
        if (this.expandedId() !== documentId) return;
        this.detail.set(dto);
        this.detailLoading.set(false);
      },
      error: () => {
        if (this.expandedId() !== documentId) return;
        this.detailError.set('Could not load the version history for this document.');
        this.detailLoading.set(false);
      },
    });
  }

  toggleVersionForm(): void {
    this.showVersionForm.update((v) => !v);
    this.versionFile.set(null);
    this.versionNote = '';
    this.versionError.set(null);
    this.versionPercent.set(0);
  }

  onVersionFileInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';
    if (!file) return;
    const problem = this.validateFile(file);
    if (problem) {
      this.versionFile.set(null);
      this.versionError.set(problem);
      return;
    }
    this.versionError.set(null);
    this.versionFile.set(file);
  }

  submitVersion(): void {
    const documentId = this.expandedId();
    const file = this.versionFile();
    if (!documentId) return;
    if (!file) {
      this.versionError.set('Choose the replacement file.');
      return;
    }

    this.versionUploading.set(true);
    this.versionPercent.set(0);
    this.versionError.set(null);
    this.documentsApi.addVersion(documentId, file, this.versionNote.trim() || null).subscribe({
      next: (progress) => {
        if (progress.state === 'progress') {
          this.versionPercent.set(progress.percent);
          return;
        }
        this.versionUploading.set(false);
        this.versionFile.set(null);
        this.versionNote = '';
        this.showVersionForm.set(false);
        this.loadDetail(documentId);
        this.load(this.guestId(), () => false);
        this.refresh.emit();
      },
      error: (err: unknown) => {
        this.versionUploading.set(false);
        this.versionError.set(documentErrorMessage(err, 'Could not upload this version. Please try again.'));
      },
    });
  }

  // ---- download / delete ----

  /** The API streams the file as a Blob (so the JWT interceptor applies) — save it via an object URL. */
  download(doc: DocumentListItemDto, version?: number, fileName?: string): void {
    if (this.busyId()) return;
    this.busyId.set(doc.id);
    this.rowError.set(null);
    this.documentsApi.download(doc.id, version).subscribe({
      next: (blob) => {
        this.busyId.set(null);
        this.saveBlob(blob, fileName ?? doc.fileName);
      },
      error: (err: unknown) => {
        this.busyId.set(null);
        this.rowError.set(documentErrorMessage(err, 'Could not download this document.'));
      },
    });
  }

  private saveBlob(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  /** Soft delete — the document stays recoverable from the recycle bin in Documents. */
  deleteDocument(doc: DocumentListItemDto): void {
    if (this.busyId()) return;
    this.busyId.set(doc.id);
    this.rowError.set(null);
    this.documentsApi.delete(doc.id).subscribe({
      next: () => {
        this.busyId.set(null);
        if (this.expandedId() === doc.id) {
          this.expandedId.set(null);
          this.detail.set(null);
        }
        this.load(this.guestId(), () => false);
        this.refresh.emit();
      },
      error: (err: unknown) => {
        this.busyId.set(null);
        this.rowError.set(documentErrorMessage(err, 'Could not delete this document.'));
      },
    });
  }
}

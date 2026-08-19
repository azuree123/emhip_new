import { ChangeDetectionStrategy, Component, OnInit, computed, effect, inject, input, output, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';

import { DocumentDetailDto, DocumentStatus, DocumentVersionDto, LookupItemDto } from '../../core/api-models';
import { AuthService } from '../../core/auth.service';
import { DocumentsApiService, documentErrorMessage } from '../../core/documents-api.service';
import { Permissions } from '../../core/permissions';
import { CustomFieldsComponent } from '../../shared/custom-fields.component';
import {
  DOCUMENT_STATUSES,
  fileExtension,
  formatBytes,
  formatDate,
  formatDateTime,
  providerLabel,
  saveBlob,
  splitTags,
  toIsoDate,
} from './documents.util';

/**
 * Document detail drawer — everything about one document in the register.
 *
 * Holds the editable metadata form (documents.edit), the full version history with a download
 * per version and its SHA-256 for integrity checks, the "upload new version" flow (validated
 * against the same hub upload rules as a first upload), and the check-out/check-in lock so two
 * people can't replace the same file at once.
 *
 * Deleting and purging are raised to the parent screen instead of being handled here, so both
 * the row menu and this drawer go through exactly one confirmation dialog.
 */
@Component({
  selector: 'app-document-detail-drawer',
  standalone: true,
  imports: [RouterLink, CustomFieldsComponent],
  templateUrl: './document-detail-drawer.component.html',
  styleUrl: './document-detail-drawer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentDetailDrawerComponent implements OnInit {
  private readonly documentsApi = inject(DocumentsApiService);
  private readonly auth = inject(AuthService);

  readonly documentId = input.required<string>();
  /** DocumentCategory lookups, already loaded by the parent screen. */
  readonly categories = input.required<LookupItemDto[]>();
  readonly maxUploadMb = input.required<number>();
  readonly allowedExtensions = input.required<string[]>();
  /** Set by the register's "Edit details" row action so the metadata form opens straight away. */
  readonly startInEdit = input(false);

  readonly closed = output<void>();
  /** Raised whenever the register/stats behind the drawer are now stale. */
  readonly changed = output<void>();
  readonly deleteRequested = output<DocumentDetailDto>();
  readonly purgeRequested = output<DocumentDetailDto>();

  // ---- Permissions --------------------------------------------------------

  protected readonly canEdit = this.auth.hasPermission(Permissions.Documents.Edit);
  protected readonly canUpload = this.auth.hasPermission(Permissions.Documents.Upload);
  protected readonly canDelete = this.auth.hasPermission(Permissions.Documents.Delete);
  protected readonly canRestore = this.auth.hasPermission(Permissions.Documents.Restore);
  protected readonly canPurge = this.auth.hasPermission(Permissions.Documents.Purge);
  private readonly myStaffId = this.auth.current().staffId;

  // ---- Loaded document ----------------------------------------------------

  protected readonly detail = signal<DocumentDetailDto | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  private initialEditApplied = false;

  // ---- Metadata editing ---------------------------------------------------

  protected readonly statuses = DOCUMENT_STATUSES;
  protected readonly editing = signal(false);
  protected readonly saving = signal(false);
  protected readonly saveError = signal<string | null>(null);
  protected readonly draftTitle = signal('');
  protected readonly draftDescription = signal('');
  protected readonly draftCategory = signal('');
  protected readonly draftTags = signal('');
  protected readonly draftStatus = signal<DocumentStatus>('Active');
  protected readonly draftRetainUntil = signal('');

  // ---- Check-out lock -----------------------------------------------------

  protected readonly lockBusy = signal(false);
  protected readonly lockError = signal<string | null>(null);

  // ---- New version --------------------------------------------------------

  protected readonly versionFile = signal<File | null>(null);
  protected readonly versionNote = signal('');
  protected readonly versionFileError = signal<string | null>(null);
  protected readonly versionBusy = signal(false);
  protected readonly versionPercent = signal(0);
  protected readonly versionError = signal<string | null>(null);
  protected readonly versionPanelOpen = signal(false);

  // ---- Downloads / clipboard ---------------------------------------------

  /** Version number currently downloading, so only that row's button shows a spinner label. */
  protected readonly downloading = signal<number | null>(null);
  protected readonly downloadError = signal<string | null>(null);
  protected readonly copiedVersionId = signal<string | null>(null);

  /** Restore lives in the drawer (nothing to confirm); delete/purge go up to the parent. */
  protected readonly restoring = signal(false);
  protected readonly restoreError = signal<string | null>(null);

  // ---- Admin-defined extra fields ----------------------------------------

  private readonly customFields = viewChild(CustomFieldsComponent);
  /** Mirrors the panel's own hasFields(), so the section can collapse when none are configured. */
  protected readonly hasExtraFields = signal(false);

  constructor() {
    effect(() => this.hasExtraFields.set(this.customFields()?.hasFields() ?? false));
  }

  protected readonly tagList = computed(() => splitTags(this.detail()?.tags));

  /** Null when nobody holds the lock; otherwise who has it and whether that's the current user. */
  protected readonly lock = computed(() => {
    const doc = this.detail();
    if (!doc?.checkedOutByName) {
      return null;
    }
    return {
      name: doc.checkedOutByName,
      at: formatDateTime(doc.checkedOutAt),
      mine: !!doc.checkedOutByStaffId && doc.checkedOutByStaffId === this.myStaffId,
    };
  });

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.documentsApi.getDetail(this.documentId()).subscribe({
      next: (detail) => {
        this.detail.set(detail);
        this.loading.set(false);
        // Only on the very first load — reloads after a save must not drop back into the form.
        if (this.startInEdit() && !this.initialEditApplied && !detail.isDeleted) {
          this.initialEditApplied = true;
          this.startEdit();
        }
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.loadError.set(documentErrorMessage(err, 'Unable to load this document right now.'));
      },
    });
  }

  // ---- Formatting used by the template ------------------------------------

  protected readonly formatBytes = formatBytes;
  protected readonly formatDate = formatDate;
  protected readonly formatDateTime = formatDateTime;
  protected readonly providerLabel = providerLabel;

  /** Categories arrive as lookup codes; show the operator the configured label where we have one. */
  protected categoryLabel(code: string): string {
    return this.categories().find((c) => c.code === code)?.label ?? code;
  }

  /** Long hex digests are unreadable in a table cell — show the head and tail only. */
  protected shortSha(sha: string | null): string {
    if (!sha) {
      return '—';
    }
    return sha.length > 20 ? `${sha.slice(0, 10)}…${sha.slice(-6)}` : sha;
  }

  // ---- Metadata edit ------------------------------------------------------

  protected startEdit(): void {
    const doc = this.detail();
    if (!doc || !this.canEdit) {
      return;
    }
    this.draftTitle.set(doc.title);
    this.draftDescription.set(doc.description ?? '');
    this.draftCategory.set(doc.category);
    this.draftTags.set(doc.tags ?? '');
    this.draftStatus.set(doc.status);
    this.draftRetainUntil.set(toIsoDate(doc.retainUntil));
    this.saveError.set(null);
    this.editing.set(true);
  }

  protected cancelEdit(): void {
    this.editing.set(false);
    this.saveError.set(null);
  }

  protected onDraftTitle(event: Event): void {
    this.draftTitle.set((event.target as HTMLInputElement).value);
  }

  protected onDraftDescription(event: Event): void {
    this.draftDescription.set((event.target as HTMLTextAreaElement).value);
  }

  protected onDraftCategory(event: Event): void {
    this.draftCategory.set((event.target as HTMLSelectElement).value);
  }

  protected onDraftTags(event: Event): void {
    this.draftTags.set((event.target as HTMLInputElement).value);
  }

  protected onDraftStatus(event: Event): void {
    this.draftStatus.set((event.target as HTMLSelectElement).value as DocumentStatus);
  }

  protected onDraftRetainUntil(event: Event): void {
    this.draftRetainUntil.set((event.target as HTMLInputElement).value);
  }

  protected saveMetadata(): void {
    const doc = this.detail();
    if (!doc || this.saving() || !this.draftTitle().trim() || !this.draftCategory()) {
      return;
    }
    this.saving.set(true);
    this.saveError.set(null);

    this.documentsApi
      .updateMetadata(doc.id, {
        title: this.draftTitle().trim(),
        description: this.draftDescription().trim() || null,
        category: this.draftCategory(),
        tags: this.draftTags().trim() || null,
        status: this.draftStatus(),
        retainUntil: this.draftRetainUntil() || null,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.editing.set(false);
          this.load();
          this.changed.emit();
        },
        error: (err: unknown) => {
          this.saving.set(false);
          this.saveError.set(documentErrorMessage(err, 'Those changes could not be saved.'));
        },
      });
  }

  // ---- Check-out / check-in ----------------------------------------------

  protected checkOut(): void {
    const doc = this.detail();
    if (!doc || this.lockBusy()) {
      return;
    }
    this.lockBusy.set(true);
    this.lockError.set(null);
    this.documentsApi.checkOut(doc.id).subscribe({
      next: () => this.afterLockChange(),
      error: (err: unknown) => this.failLock(err, 'This document could not be checked out.'),
    });
  }

  /** `force` is offered to editors when someone else left the document checked out. */
  protected checkIn(force: boolean): void {
    const doc = this.detail();
    if (!doc || this.lockBusy()) {
      return;
    }
    this.lockBusy.set(true);
    this.lockError.set(null);
    this.documentsApi.checkIn(doc.id, force).subscribe({
      next: () => this.afterLockChange(),
      error: (err: unknown) => this.failLock(err, 'This document could not be checked in.'),
    });
  }

  private afterLockChange(): void {
    this.lockBusy.set(false);
    this.load();
    this.changed.emit();
  }

  private failLock(err: unknown, fallback: string): void {
    this.lockBusy.set(false);
    this.lockError.set(documentErrorMessage(err, fallback));
  }

  // ---- New version --------------------------------------------------------

  protected toggleVersionPanel(): void {
    this.versionPanelOpen.update((open) => !open);
    this.versionError.set(null);
  }

  protected onVersionFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const candidate = input.files?.[0] ?? null;
    input.value = '';
    if (!candidate) {
      return;
    }
    this.versionFileError.set(this.validateFile(candidate));
    this.versionFile.set(candidate);
  }

  protected clearVersionFile(): void {
    this.versionFile.set(null);
    this.versionFileError.set(null);
  }

  protected onVersionNote(event: Event): void {
    this.versionNote.set((event.target as HTMLTextAreaElement).value);
  }

  /** Same client-side gate as the first upload — size and extension from the hub settings. */
  private validateFile(candidate: File): string | null {
    const allowed = this.allowedExtensions();
    const extension = fileExtension(candidate.name);
    if (allowed.length > 0 && (!extension || !allowed.includes(extension))) {
      const list = allowed.map((e) => e.toUpperCase()).join(', ');
      return `${extension ? '.' + extension : 'That file type'} isn't accepted. Allowed types: ${list}.`;
    }
    const mb = this.maxUploadMb();
    if (Number.isFinite(mb) && mb > 0 && candidate.size > mb * 1024 * 1024) {
      return `${formatBytes(candidate.size)} exceeds the ${mb} MB upload limit.`;
    }
    if (candidate.size === 0) {
      return 'That file is empty.';
    }
    return null;
  }

  protected uploadVersion(): void {
    const doc = this.detail();
    const file = this.versionFile();
    if (!doc || !file || this.versionFileError() || this.versionBusy()) {
      return;
    }
    this.versionBusy.set(true);
    this.versionPercent.set(0);
    this.versionError.set(null);

    this.documentsApi.addVersion(doc.id, file, this.versionNote().trim() || null).subscribe({
      next: (event) => {
        if (event.state === 'progress') {
          this.versionPercent.set(event.percent);
          return;
        }
        this.versionBusy.set(false);
        this.versionFile.set(null);
        this.versionNote.set('');
        this.versionPanelOpen.set(false);
        this.load();
        this.changed.emit();
      },
      error: (err: unknown) => {
        this.versionBusy.set(false);
        this.versionError.set(documentErrorMessage(err, 'The new version was rejected.'));
      },
    });
  }

  // ---- Downloads ----------------------------------------------------------

  /** Pass no version to fetch whatever is current. */
  protected download(version: DocumentVersionDto | null): void {
    const doc = this.detail();
    if (!doc || this.downloading() !== null) {
      return;
    }
    const versionNumber = version?.versionNumber ?? doc.currentVersionNumber;
    const fileName = version?.fileName ?? doc.versions.find((v) => v.isCurrent)?.fileName ?? doc.title;
    this.downloading.set(versionNumber);
    this.downloadError.set(null);

    this.documentsApi.download(doc.id, version ? version.versionNumber : undefined).subscribe({
      next: (blob) => {
        saveBlob(blob, fileName);
        this.downloading.set(null);
      },
      error: (err: unknown) => {
        this.downloading.set(null);
        this.downloadError.set(documentErrorMessage(err, 'That file could not be downloaded.'));
      },
    });
  }

  protected copySha(version: DocumentVersionDto): void {
    if (!version.sha256) {
      return;
    }
    void navigator.clipboard?.writeText(version.sha256).then(() => {
      this.copiedVersionId.set(version.id);
      setTimeout(() => {
        if (this.copiedVersionId() === version.id) {
          this.copiedVersionId.set(null);
        }
      }, 1800);
    });
  }

  // ---- Recycle-bin actions ------------------------------------------------

  protected restore(): void {
    const doc = this.detail();
    if (!doc || this.restoring()) {
      return;
    }
    this.restoring.set(true);
    this.restoreError.set(null);
    this.documentsApi.restore(doc.id).subscribe({
      next: () => {
        this.restoring.set(false);
        this.load();
        this.changed.emit();
      },
      error: (err: unknown) => {
        this.restoring.set(false);
        this.restoreError.set(documentErrorMessage(err, 'This document could not be restored.'));
      },
    });
  }

  protected requestDelete(): void {
    const doc = this.detail();
    if (doc) {
      this.deleteRequested.emit(doc);
    }
  }

  protected requestPurge(): void {
    const doc = this.detail();
    if (doc) {
      this.purgeRequested.emit(doc);
    }
  }

  protected close(): void {
    if (this.versionBusy()) {
      return;
    }
    this.closed.emit();
  }
}

import { ChangeDetectionStrategy, Component, EventEmitter, Output, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { DocumentDetailDto, DocumentListItemDto, LookupItemDto } from '../../core/api-models';
import { AuthService } from '../../core/auth.service';
import { DocumentsApiService, documentErrorMessage } from '../../core/documents-api.service';
import { Permissions } from '../../core/permissions';
import { LookupCategories, SettingsApiService } from '../../core/settings-api.service';
import { DocumentConfirmDialogComponent } from '../documents/document-confirm-dialog.component';
import { DocumentDetailDrawerComponent } from '../documents/document-detail-drawer.component';
import { DocumentUploadDrawerComponent } from '../documents/document-upload-drawer.component';
import { formatBytes, saveBlob, splitTags } from '../documents/documents.util';
import { formatDate, formatDateTime, humanize } from './guest-workspace.util';

/** Rows per keyset page. */
const PAGE_SIZE = 50;
/** The phrase an operator must type before a purge runs (same as the old register). */
const PURGE_PHRASE = 'DELETE';

/** A destructive action waiting on the shared confirmation dialog. */
interface ConfirmState {
  kind: 'delete' | 'purge';
  id: string;
  title: string;
}

/**
 * Documents tab — this guest's files, listed from DocumentsApiService.getList({ guestId }).
 *
 * This is the only place documents are managed: there is no hub-wide Documents page, so every
 * upload is filed on this guest automatically (customer feedback — the guest link must never be
 * a manual choice). The tab reuses the Document Management drawers and dialog rather than
 * keeping its own copies:
 *  - "Upload document" opens DocumentUploadDrawerComponent with `linkedGuestId`, which hides
 *    the guest picker;
 *  - a document's title / "View details" opens DocumentDetailDrawerComponent — metadata edit,
 *    version history with per-version download, "Upload new version", check-out;
 *  - Delete (with an optional reason) and Permanently delete go through
 *    DocumentConfirmDialogComponent.
 * Restore/purge holders also get a "Recycle bin" toggle that lists this guest's deleted files.
 *
 * Every action is gated on the permission the API enforces (Permissions.Documents.*).
 */
@Component({
  selector: 'emhip-guest-documents-tab',
  standalone: true,
  imports: [DocumentUploadDrawerComponent, DocumentDetailDrawerComponent, DocumentConfirmDialogComponent],
  templateUrl: './guest-documents-tab.component.html',
  styleUrl: './guest-documents-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GuestDocumentsTabComponent {
  private readonly documentsApi = inject(DocumentsApiService);
  private readonly settingsApi = inject(SettingsApiService);
  private readonly auth = inject(AuthService);

  readonly guestId = input.required<string>();
  /** Emitted after an upload/delete/restore so the workspace header can refresh its counters. */
  @Output() readonly refresh = new EventEmitter<void>();

  readonly canView = this.auth.hasPermission(Permissions.Documents.View);
  readonly canUpload = this.auth.hasPermission(Permissions.Documents.Upload);
  readonly canEdit = this.auth.hasPermission(Permissions.Documents.Edit);
  readonly canDelete = this.auth.hasPermission(Permissions.Documents.Delete);
  readonly canRestore = this.auth.hasPermission(Permissions.Documents.Restore);
  readonly canPurge = this.auth.hasPermission(Permissions.Documents.Purge);
  /** Only these users get the recycle-bin toggle — nobody else can act on what's in there. */
  readonly canSeeRecycleBin = this.canRestore || this.canPurge;

  readonly documents = signal<DocumentListItemDto[] | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  /** Keyset cursor for the "Load more" button; null once the last page is in. */
  readonly nextCursor = signal<string | null>(null);
  readonly loadingMore = signal(false);
  /** The API sends the total on the first page only; carried across "Load more". */
  readonly totalCount = signal<number | null>(null);
  /** Recycle-bin view: this guest's soft-deleted documents instead of the live ones. */
  readonly deletedOnly = signal(false);

  readonly categories = signal<LookupItemDto[]>([]);

  // ---- Overlays ----
  readonly uploadOpen = signal(false);
  readonly detailId = signal<string | null>(null);
  /** True when the drawer was opened from "Edit details", so the metadata form opens straight away. */
  readonly detailEdit = signal(false);
  readonly confirmState = signal<ConfirmState | null>(null);
  readonly confirmBusy = signal(false);
  readonly confirmError = signal<string | null>(null);
  readonly openMenuId = signal<string | null>(null);
  readonly purgePhrase = PURGE_PHRASE;

  /** Id of the row whose download/restore is in flight, so its buttons disable. */
  readonly busyId = signal<string | null>(null);
  readonly rowError = signal<string | null>(null);
  /** Transient success note above the table ("Document uploaded.", "Document restored.", …). */
  readonly flash = signal<string | null>(null);

  readonly maxUploadMb = this.settingsApi.maxUploadMb;
  readonly allowedExtensions = this.settingsApi.allowedExtensions;

  /** "3 documents" / "1 document in the recycle bin" — the total when the API sent one. */
  readonly heading = computed(() => {
    const count = this.totalCount() ?? this.documents()?.length ?? 0;
    const noun = count === 1 ? 'document' : 'documents';
    return this.deletedOnly() ? `${count} ${noun} in the recycle bin` : `${count} ${noun}`;
  });

  readonly formatDate = formatDate;
  readonly formatDateTime = formatDateTime;
  readonly formatSize = formatBytes;
  readonly splitTags = splitTags;

  constructor() {
    // Re-runs only when the guest changes — load() reads deletedOnly(), so it must not be tracked
    // here or toggling the recycle bin would re-fire this and switch it straight back off.
    effect((onCleanup) => {
      const id = this.guestId();
      let cancelled = false;
      onCleanup(() => (cancelled = true));
      untracked(() => {
        this.resetOverlays();
        this.deletedOnly.set(false);
        this.load(id, () => cancelled);
      });
    });
    if (this.canView) {
      this.settingsApi.getLookups(LookupCategories.DocumentCategory).subscribe({
        next: (items) => this.categories.set(items.filter((i) => i.isActive)),
        error: () => this.categories.set([]),
      });
    }
  }

  private resetOverlays(): void {
    this.uploadOpen.set(false);
    this.detailId.set(null);
    this.detailEdit.set(false);
    this.confirmState.set(null);
    this.openMenuId.set(null);
    this.rowError.set(null);
  }

  private load(guestId: string, isCancelled: () => boolean): void {
    if (!this.canView) {
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.openMenuId.set(null);
    this.documentsApi.getList({ guestId, deletedOnly: this.deletedOnly() || undefined, pageSize: PAGE_SIZE }).subscribe({
      next: (page) => {
        if (isCancelled()) return;
        this.documents.set(page.items);
        this.nextCursor.set(page.hasMore ? page.nextCursor : null);
        this.totalCount.set(page.totalCount);
        this.loading.set(false);
      },
      error: () => {
        if (isCancelled()) return;
        this.error.set('Could not load documents for this guest.');
        this.loading.set(false);
      },
    });
  }

  /** Re-reads the first page after anything changed, and tells the workspace header. */
  private reload(): void {
    this.load(this.guestId(), () => false);
    this.refresh.emit();
  }

  loadMore(): void {
    const cursor = this.nextCursor();
    if (!cursor || this.loadingMore()) return;
    this.loadingMore.set(true);
    this.documentsApi
      .getList({ guestId: this.guestId(), deletedOnly: this.deletedOnly() || undefined, cursor, pageSize: PAGE_SIZE })
      .subscribe({
        next: (page) => {
          this.documents.update((current) => [...(current ?? []), ...page.items]);
          this.nextCursor.set(page.hasMore ? page.nextCursor : null);
          this.loadingMore.set(false);
        },
        error: () => this.loadingMore.set(false),
      });
  }

  toggleRecycleBin(): void {
    this.deletedOnly.update((on) => !on);
    this.rowError.set(null);
    this.documents.set(null);
    this.load(this.guestId(), () => false);
  }

  /** Lookup label for a stored category code, falling back to the raw value. */
  categoryLabel(category: string): string {
    return this.categories().find((c) => c.code === category)?.label ?? humanize(category);
  }

  // ---- Row menu ----

  toggleMenu(documentId: string): void {
    this.openMenuId.update((open) => (open === documentId ? null : documentId));
  }

  closeMenu(): void {
    this.openMenuId.set(null);
  }

  // ---- Upload drawer ----

  openUpload(): void {
    this.uploadOpen.set(true);
  }

  closeUpload(): void {
    this.uploadOpen.set(false);
  }

  onUploaded(): void {
    this.uploadOpen.set(false);
    this.notify('Document uploaded.');
    // A new upload is live, so leave the recycle bin to show it.
    this.deletedOnly.set(false);
    this.reload();
  }

  // ---- Detail drawer (view / edit details / versions) ----

  openDetail(documentId: string, edit = false): void {
    this.closeMenu();
    this.detailEdit.set(edit);
    this.detailId.set(documentId);
  }

  closeDetail(): void {
    this.detailId.set(null);
    this.detailEdit.set(false);
  }

  /** The drawer saved something (details, a new version, a restore) — the list behind it is stale. */
  onDetailChanged(): void {
    this.reload();
  }

  // ---- Download ----

  /** The API streams the file as a Blob (so the JWT interceptor applies) — save it via an object URL. */
  download(doc: DocumentListItemDto): void {
    this.closeMenu();
    if (this.busyId()) return;
    this.busyId.set(doc.id);
    this.rowError.set(null);
    this.documentsApi.download(doc.id).subscribe({
      next: (blob) => {
        this.busyId.set(null);
        saveBlob(blob, doc.fileName);
      },
      error: (err: unknown) => {
        this.busyId.set(null);
        this.rowError.set(documentErrorMessage(err, 'Could not download this document.'));
      },
    });
  }

  // ---- Delete / purge (confirmed) and restore ----

  askDelete(doc: DocumentListItemDto | DocumentDetailDto): void {
    this.closeMenu();
    this.confirmError.set(null);
    this.confirmState.set({ kind: 'delete', id: doc.id, title: doc.title });
  }

  askPurge(doc: DocumentListItemDto | DocumentDetailDto): void {
    this.closeMenu();
    this.confirmError.set(null);
    this.confirmState.set({ kind: 'purge', id: doc.id, title: doc.title });
  }

  cancelConfirm(): void {
    this.confirmState.set(null);
    this.confirmError.set(null);
  }

  onConfirmed(reason: string | null): void {
    const state = this.confirmState();
    if (!state || this.confirmBusy()) return;
    this.confirmBusy.set(true);
    this.confirmError.set(null);

    const request = state.kind === 'delete' ? this.documentsApi.delete(state.id, reason) : this.documentsApi.purge(state.id);
    request.subscribe({
      next: () => {
        this.confirmBusy.set(false);
        this.confirmState.set(null);
        // Both actions take the document out of the current view, so drop the drawer with it.
        if (this.detailId() === state.id) this.closeDetail();
        this.notify(state.kind === 'delete' ? 'Document moved to the recycle bin.' : 'Document permanently deleted.');
        this.reload();
      },
      error: (err: unknown) => {
        this.confirmBusy.set(false);
        this.confirmError.set(
          documentErrorMessage(err, state.kind === 'delete' ? 'This document could not be deleted.' : 'This document could not be purged.'),
        );
      },
    });
  }

  /** Restoring needs no confirmation — it only ever puts a document back. */
  restore(doc: DocumentListItemDto): void {
    this.closeMenu();
    if (this.busyId()) return;
    this.busyId.set(doc.id);
    this.rowError.set(null);
    this.documentsApi.restore(doc.id).subscribe({
      next: () => {
        this.busyId.set(null);
        this.notify('Document restored.');
        this.reload();
      },
      error: (err: unknown) => {
        this.busyId.set(null);
        this.rowError.set(documentErrorMessage(err, 'This document could not be restored.'));
      },
    });
  }

  private notify(message: string): void {
    this.flash.set(message);
    setTimeout(() => {
      if (this.flash() === message) this.flash.set(null);
    }, 4000);
  }

  dismissFlash(): void {
    this.flash.set(null);
  }
}

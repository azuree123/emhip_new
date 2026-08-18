import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Subject, of } from 'rxjs';
import { catchError, debounceTime } from 'rxjs/operators';

import { DocumentDetailDto, DocumentListItemDto, DocumentStatsDto, DocumentStatus, LookupItemDto } from '../../core/api-models';
import { AuthService } from '../../core/auth.service';
import { DocumentsApiService, documentErrorMessage } from '../../core/documents-api.service';
import { Permissions } from '../../core/permissions';
import { LookupCategories, SettingsApiService } from '../../core/settings-api.service';
import { DocumentConfirmDialogComponent } from './document-confirm-dialog.component';
import { DocumentDetailDrawerComponent } from './document-detail-drawer.component';
import { DocumentUploadDrawerComponent } from './document-upload-drawer.component';
import { DOCUMENT_STATUSES, formatBytes, formatDate, formatDateTime, providerLabel, saveBlob } from './documents.util';

/** Rows per keyset page. */
const PAGE_SIZE = 25;
/** Search debounce — long enough to skip intermediate keystrokes, short enough to feel live. */
const SEARCH_DEBOUNCE_MS = 250;
/** The phrase an operator must type before a purge runs. */
const PURGE_PHRASE = 'DELETE';

type StatusFilterValue = DocumentStatus | 'All';

/** A destructive action waiting on the shared confirmation dialog. */
interface ConfirmState {
  kind: 'delete' | 'purge';
  id: string;
  title: string;
}

/**
 * Document Management — the hub's document register.
 *
 * The register is keyset-paged the same way the guest data sheet is (opaque `nextCursor` sent
 * straight back to the API, totalCount carried forward from the first page) because the
 * document table grows without bound across hub history. Every filter — search, category,
 * status and the recycle-bin toggle — is applied server-side, and changing any of them resets
 * to page one.
 *
 * Every action is gated on the caller's own permission claims (Permissions.Documents.*); a
 * user with only documents.view sees the register and can download, and nothing else.
 *
 * Layout follows the existing screens: guest-data-sheet's header band, toolbar chips, gray
 * table strip and "Load more" pager, over the reports suite's r12 white cards and KPI tiles.
 */
@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [RouterLink, DocumentUploadDrawerComponent, DocumentDetailDrawerComponent, DocumentConfirmDialogComponent],
  templateUrl: './documents.component.html',
  styleUrl: './documents.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentsComponent implements OnInit {
  private readonly documentsApi = inject(DocumentsApiService);
  private readonly settingsApi = inject(SettingsApiService);
  private readonly auth = inject(AuthService);

  // ---- Permissions --------------------------------------------------------

  protected readonly canUpload = this.auth.hasPermission(Permissions.Documents.Upload);
  protected readonly canEdit = this.auth.hasPermission(Permissions.Documents.Edit);
  protected readonly canDelete = this.auth.hasPermission(Permissions.Documents.Delete);
  protected readonly canRestore = this.auth.hasPermission(Permissions.Documents.Restore);
  protected readonly canPurge = this.auth.hasPermission(Permissions.Documents.Purge);
  /** Only these users get the recycle-bin toggle — nobody else can act on what's in there. */
  protected readonly canSeeRecycleBin = this.canRestore || this.canPurge;

  // ---- Upload rules from the hub's settings -------------------------------

  protected readonly maxUploadMb = this.settingsApi.maxUploadMb;
  protected readonly allowedExtensions = this.settingsApi.allowedExtensions;
  protected readonly organisationName = this.settingsApi.organisationName;

  // ---- Stats --------------------------------------------------------------

  protected readonly stats = signal<DocumentStatsDto | null>(null);
  protected readonly statsLoading = signal(true);
  protected readonly statsError = signal<string | null>(null);

  // ---- Register -----------------------------------------------------------

  protected readonly documents = signal<DocumentListItemDto[]>([]);
  protected readonly loading = signal(false);
  protected readonly loadingMore = signal(false);
  protected readonly hasMore = signal(false);
  /**
   * Total rows matching the current filters. The API sends it on the first (cursorless) page
   * only, so it's carried forward across "Load more" and cleared whenever the filters reset.
   */
  protected readonly totalCount = signal<number | null>(null);
  protected readonly error = signal<string | null>(null);
  private nextCursor: string | null = null;

  // ---- Filters ------------------------------------------------------------

  protected readonly searchTerm = signal('');
  protected readonly categoryFilter = signal('All');
  protected readonly statusFilter = signal<StatusFilterValue>('All');
  protected readonly deletedOnly = signal(false);
  protected readonly statusOptions = DOCUMENT_STATUSES;
  private readonly searchInput$ = new Subject<string>();

  /** DocumentCategory lookups — the filter chip and both drawers' category dropdowns. */
  protected readonly categories = signal<LookupItemDto[]>([]);

  // ---- Overlays -----------------------------------------------------------

  protected readonly uploadOpen = signal(false);
  protected readonly detailId = signal<string | null>(null);
  /** True when the drawer was opened from the row menu's "Edit details" action. */
  protected readonly detailEdit = signal(false);
  protected readonly confirmState = signal<ConfirmState | null>(null);
  protected readonly confirmBusy = signal(false);
  protected readonly confirmError = signal<string | null>(null);
  protected readonly openMenuId = signal<string | null>(null);

  /** Transient success note under the header ("Document uploaded", "Restored", …). */
  protected readonly flash = signal<string | null>(null);
  /** Row-level failures (a download that 404s) that don't belong to any dialog. */
  protected readonly actionError = signal<string | null>(null);
  /** Document id currently downloading, so only that row's menu shows the busy label. */
  protected readonly downloadingId = signal<string | null>(null);

  protected readonly purgePhrase = PURGE_PHRASE;
  /** Placeholder tiles rendered while GET /documents/stats is in flight. */
  protected readonly statSkeletons = [1, 2, 3, 4, 5, 6];

  /** Lookup code → configured label, for rendering the register's Category column. */
  private readonly categoryLabels = computed(() => {
    const map = new Map<string, string>();
    for (const item of this.categories()) {
      map.set(item.code, item.label);
    }
    return map;
  });

  protected readonly anyFilterApplied = computed(
    () => !!this.searchTerm() || this.categoryFilter() !== 'All' || this.statusFilter() !== 'All' || this.deletedOnly(),
  );

  constructor() {
    this.searchInput$.pipe(debounceTime(SEARCH_DEBOUNCE_MS), takeUntilDestroyed()).subscribe((term) => {
      if (term === this.searchTerm()) {
        return;
      }
      this.searchTerm.set(term);
      this.resetAndLoad();
    });
  }

  ngOnInit(): void {
    this.loadStats();
    this.loadCategories();
    this.resetAndLoad();
  }

  // ---- Formatting used by the template ------------------------------------

  protected readonly formatBytes = formatBytes;
  protected readonly formatDate = formatDate;
  protected readonly formatDateTime = formatDateTime;
  protected readonly providerLabel = providerLabel;

  protected categoryLabel(code: string): string {
    return this.categoryLabels().get(code) ?? code;
  }

  // ---- Loading ------------------------------------------------------------

  protected loadStats(): void {
    this.statsLoading.set(true);
    this.statsError.set(null);
    this.documentsApi.getStats().subscribe({
      next: (stats) => {
        this.stats.set(stats);
        this.statsLoading.set(false);
      },
      error: () => {
        this.statsLoading.set(false);
        this.statsError.set('Document statistics are unavailable right now.');
      },
    });
  }

  /** A failed lookup load just leaves the category dropdowns empty — the register still works. */
  private loadCategories(): void {
    this.settingsApi
      .getLookups(LookupCategories.DocumentCategory)
      .pipe(catchError(() => of([] as LookupItemDto[])))
      .subscribe((items) => this.categories.set(items.filter((i) => i.isActive)));
  }

  protected resetAndLoad(): void {
    this.documents.set([]);
    this.nextCursor = null;
    this.hasMore.set(false);
    this.totalCount.set(null);
    this.error.set(null);
    this.openMenuId.set(null);
    this.fetchPage(false);
  }

  protected loadMore(): void {
    if (this.loading() || this.loadingMore() || !this.hasMore()) {
      return;
    }
    this.fetchPage(true);
  }

  private fetchPage(append: boolean): void {
    if (append) {
      this.loadingMore.set(true);
    } else {
      this.loading.set(true);
    }

    const category = this.categoryFilter();
    const status = this.statusFilter();

    this.documentsApi
      .getList({
        q: this.searchTerm() || undefined,
        category: category === 'All' ? undefined : category,
        status: status === 'All' ? undefined : status,
        deletedOnly: this.deletedOnly() || undefined,
        cursor: append ? (this.nextCursor ?? undefined) : undefined,
        pageSize: PAGE_SIZE,
      })
      .pipe(
        catchError((err: unknown) => {
          this.error.set(documentErrorMessage(err, 'Unable to load documents right now. Please try again.'));
          return of(null);
        }),
      )
      .subscribe((page) => {
        this.loading.set(false);
        this.loadingMore.set(false);
        if (!page) {
          return;
        }
        this.documents.update((current) => (append ? [...current, ...page.items] : page.items));
        this.nextCursor = page.nextCursor;
        this.hasMore.set(page.hasMore);
        // Only the first page carries totalCount; keep the carried value on later pages.
        if (page.totalCount !== null) {
          this.totalCount.set(page.totalCount);
        }
      });
  }

  // ---- Filters ------------------------------------------------------------

  protected onSearchInput(event: Event): void {
    this.searchInput$.next((event.target as HTMLInputElement).value);
  }

  protected onCategoryChange(event: Event): void {
    this.categoryFilter.set((event.target as HTMLSelectElement).value);
    this.resetAndLoad();
  }

  protected onStatusChange(event: Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value as StatusFilterValue);
    this.resetAndLoad();
  }

  protected toggleRecycleBin(): void {
    this.deletedOnly.update((on) => !on);
    this.resetAndLoad();
  }

  protected clearFilters(): void {
    this.searchTerm.set('');
    this.searchInput$.next('');
    this.categoryFilter.set('All');
    this.statusFilter.set('All');
    this.deletedOnly.set(false);
    this.resetAndLoad();
  }

  // ---- Row menu -----------------------------------------------------------

  protected toggleMenu(documentId: string): void {
    this.openMenuId.update((open) => (open === documentId ? null : documentId));
  }

  protected closeMenu(): void {
    this.openMenuId.set(null);
  }

  // ---- Overlays -----------------------------------------------------------

  protected openUpload(): void {
    this.uploadOpen.set(true);
  }

  protected closeUpload(): void {
    this.uploadOpen.set(false);
  }

  protected onUploaded(): void {
    this.uploadOpen.set(false);
    this.notify('Document uploaded.');
    this.refreshAll();
  }

  protected openDetail(documentId: string, edit = false): void {
    this.closeMenu();
    this.detailEdit.set(edit);
    this.detailId.set(documentId);
  }

  protected closeDetail(): void {
    this.detailId.set(null);
    this.detailEdit.set(false);
  }

  /** The detail drawer changed something the register/stats behind it are showing. */
  protected onDetailChanged(): void {
    this.refreshAll();
  }

  // ---- Downloads ----------------------------------------------------------

  /** Fetches the current version through HttpClient (so the JWT rides along) and saves it. */
  protected download(doc: DocumentListItemDto): void {
    this.closeMenu();
    if (this.downloadingId()) {
      return;
    }
    this.downloadingId.set(doc.id);
    this.actionError.set(null);
    this.documentsApi.download(doc.id).subscribe({
      next: (blob) => {
        saveBlob(blob, doc.fileName);
        this.downloadingId.set(null);
      },
      error: (err: unknown) => {
        this.downloadingId.set(null);
        this.actionError.set(documentErrorMessage(err, 'That file could not be downloaded.'));
      },
    });
  }

  // ---- Destructive actions -----------------------------------------------

  protected askDelete(doc: DocumentListItemDto | DocumentDetailDto): void {
    this.closeMenu();
    this.confirmError.set(null);
    this.confirmState.set({ kind: 'delete', id: doc.id, title: doc.title });
  }

  protected askPurge(doc: DocumentListItemDto | DocumentDetailDto): void {
    this.closeMenu();
    this.confirmError.set(null);
    this.confirmState.set({ kind: 'purge', id: doc.id, title: doc.title });
  }

  protected cancelConfirm(): void {
    this.confirmState.set(null);
    this.confirmError.set(null);
  }

  protected onConfirmed(reason: string | null): void {
    const state = this.confirmState();
    if (!state || this.confirmBusy()) {
      return;
    }
    this.confirmBusy.set(true);
    this.confirmError.set(null);

    const request = state.kind === 'delete' ? this.documentsApi.delete(state.id, reason) : this.documentsApi.purge(state.id);

    request.subscribe({
      next: () => {
        this.confirmBusy.set(false);
        this.confirmState.set(null);
        // Both actions take the document out of the current view, so drop the drawer with it.
        if (this.detailId() === state.id) {
          this.detailId.set(null);
        }
        this.notify(state.kind === 'delete' ? 'Document moved to the recycle bin.' : 'Document permanently deleted.');
        this.refreshAll();
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
  protected restore(doc: DocumentListItemDto): void {
    this.closeMenu();
    this.actionError.set(null);
    this.documentsApi.restore(doc.id).subscribe({
      next: () => {
        this.notify('Document restored.');
        this.refreshAll();
      },
      error: (err: unknown) => this.actionError.set(documentErrorMessage(err, 'This document could not be restored.')),
    });
  }

  // ---- Shared helpers -----------------------------------------------------

  private refreshAll(): void {
    this.loadStats();
    this.resetAndLoad();
  }

  private notify(message: string): void {
    this.flash.set(message);
    setTimeout(() => {
      if (this.flash() === message) {
        this.flash.set(null);
      }
    }, 4000);
  }

  protected dismissFlash(): void {
    this.flash.set(null);
  }

  protected dismissActionError(): void {
    this.actionError.set(null);
  }
}

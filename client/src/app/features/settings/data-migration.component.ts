import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, ElementRef, inject, signal, viewChild } from '@angular/core';
import { ImportResultDto } from '../../core/api-models';
import { AuthService } from '../../core/auth.service';
import { MigrationApiService } from '../../core/migration-api.service';
import { Permissions } from '../../core/permissions';

/** File name the CSV template is saved under. */
const TEMPLATE_FILE_NAME = 'emhip-guest-import-template.csv';

/**
 * The error table stays useful at a glance, not as a scroll marathon — a bad export can fail on
 * every one of thousands of rows, and the first hundred already tell you what's wrong.
 */
const MAX_VISIBLE_ERRORS = 100;

/** Which call is in flight, so the two action buttons can label themselves independently. */
type Running = 'validate' | 'import' | null;

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

/** Saves a downloaded Blob under `fileName` — downloads come through HttpClient so the JWT is attached. */
function saveBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * "Data migration" tab of the Settings screen (spec §7) — the one-off import that lifts guest
 * records out of the previous system (InForm) into EMHIP.
 *
 * The workflow the screen enforces is download template → map your export onto it → dry run →
 * review → import. A dry run validates every row and writes nothing, and **Import stays disabled
 * until a dry run has succeeded for the file currently selected**: picking a different file (or
 * re-picking the same one) clears that clearance, so nobody can validate one export and then push
 * a different one at the live database. The live run additionally asks for confirmation.
 *
 * Everything here is gated on admin.manageusers, matching MigrationController.
 */
@Component({
  selector: 'emhip-data-migration',
  standalone: true,
  templateUrl: './data-migration.component.html',
  styleUrl: './data-migration.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataMigrationComponent {
  private readonly migrationApi = inject(MigrationApiService);
  private readonly auth = inject(AuthService);

  /** Kept so the input can be cleared — otherwise re-picking the same file fires no change event. */
  private readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  /** The importer endpoint requires admin.manageusers; without it the tab is a read-only notice. */
  readonly canManage = this.auth.hasPermission(Permissions.Admin.ManageUsers);

  readonly file = signal<File | null>(null);
  readonly dragging = signal(false);
  /** Set when something that isn't a .csv is dropped or picked. */
  readonly fileError = signal<string | null>(null);

  readonly downloading = signal(false);
  readonly downloadError = signal<string | null>(null);

  readonly running = signal<Running>(null);
  readonly result = signal<ImportResultDto | null>(null);
  /** Transport/ProblemDetails failure — distinct from a run that came back with row errors. */
  readonly requestError = signal<string | null>(null);

  /**
   * True only while the file on screen is the exact one a dry run just passed. Cleared by any file
   * change, by a failing dry run, and by a completed live import (so a second push has to be
   * re-validated rather than fired twice by a stray click).
   */
  readonly dryRunPassed = signal(false);

  readonly confirmOpen = signal(false);

  readonly busy = computed(() => this.running() !== null);

  readonly canValidate = computed(() => this.canManage && !!this.file() && !this.busy());
  readonly canImport = computed(() => this.canManage && !!this.file() && this.dryRunPassed() && !this.busy());

  readonly fileName = computed(() => this.file()?.name ?? '');
  readonly fileSize = computed(() => {
    const file = this.file();
    return file ? formatBytes(file.size) : '';
  });

  readonly errors = computed(() => this.result()?.errors ?? []);
  readonly visibleErrors = computed(() => this.errors().slice(0, MAX_VISIBLE_ERRORS));
  readonly hiddenErrorCount = computed(() => Math.max(0, this.errors().length - MAX_VISIBLE_ERRORS));

  /** The last run wrote to the database (as opposed to having been a dry run). */
  readonly lastRunWasLive = computed(() => {
    const result = this.result();
    return !!result && !result.dryRun;
  });

  // ---- Template download ----------------------------------------------------------------

  downloadTemplate(): void {
    if (!this.canManage || this.downloading()) return;

    this.downloading.set(true);
    this.downloadError.set(null);
    this.migrationApi.downloadGuestTemplate().subscribe({
      next: (blob) => {
        saveBlob(blob, TEMPLATE_FILE_NAME);
        this.downloading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.downloading.set(false);
        this.downloadError.set(problemMessage(err, 'The template could not be downloaded.'));
      },
    });
  }

  // ---- File selection -------------------------------------------------------------------

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectFile(input.files?.[0] ?? null);
  }

  onDragOver(event: DragEvent): void {
    if (!this.canManage || this.busy()) return;
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
    if (!this.canManage || this.busy()) return;
    this.selectFile(event.dataTransfer?.files?.[0] ?? null);
  }

  /** Click/keyboard on the drop zone opens the native picker. */
  openPicker(): void {
    if (!this.canManage || this.busy()) return;
    this.fileInput()?.nativeElement.click();
  }

  clearFile(): void {
    if (this.busy()) return;
    this.selectFile(null);
  }

  /**
   * Everything about the previous run belongs to the previous file, so a new selection resets the
   * result panel *and* the dry-run clearance that unlocks Import.
   */
  private selectFile(file: File | null): void {
    this.dryRunPassed.set(false);
    this.result.set(null);
    this.requestError.set(null);
    this.fileError.set(null);
    this.confirmOpen.set(false);

    // The File is held in the signal from here on, so the native input is always emptied: otherwise
    // re-picking the same path fires no change event at all and a file edited after a failed dry
    // run would silently keep its stale clearance.
    const input = this.fileInput()?.nativeElement;
    if (input) input.value = '';

    if (file && !/\.csv$/i.test(file.name)) {
      this.file.set(null);
      this.fileError.set(`“${file.name}” isn’t a CSV file. Export your data as CSV and try again.`);
      return;
    }

    this.file.set(file);
  }

  // ---- Running the import ---------------------------------------------------------------

  validate(): void {
    if (!this.canValidate()) return;
    this.run(true);
  }

  /** Import is a write — ask before it happens. */
  requestImport(): void {
    if (!this.canImport()) return;
    this.confirmOpen.set(true);
  }

  cancelImport(): void {
    this.confirmOpen.set(false);
  }

  confirmImport(): void {
    if (!this.canImport()) {
      this.confirmOpen.set(false);
      return;
    }
    this.confirmOpen.set(false);
    this.run(false);
  }

  private run(dryRun: boolean): void {
    const file = this.file();
    if (!file) return;

    this.running.set(dryRun ? 'validate' : 'import');
    this.result.set(null);
    this.requestError.set(null);

    this.migrationApi.importGuests(file, dryRun).subscribe({
      next: (result) => {
        this.result.set(result);
        this.running.set(null);
        // A clean dry run unlocks Import; anything else (a failed dry run, or a live run that has
        // now been spent) leaves it locked until the file is validated again.
        this.dryRunPassed.set(dryRun && result.succeeded);
      },
      error: (err: HttpErrorResponse) => {
        this.running.set(null);
        this.dryRunPassed.set(false);
        this.requestError.set(
          problemMessage(err, dryRun ? 'The file could not be validated.' : 'The import could not be run.'),
        );
      },
    });
  }

  dismissRequestError(): void {
    this.requestError.set(null);
  }
}

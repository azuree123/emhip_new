import { HttpErrorResponse } from '@angular/common/http';
import { Component, EventEmitter, Output, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  AddNoteRequest,
  CaseworkNoteAttachmentDto,
  CaseworkNoteCategory,
  CaseworkNoteDto,
  CaseworkRiskCheck,
  CaseworkRiskLevel,
  GuestNoteDto,
  NoteColor,
} from '../../core/api-models';
import { AuthService } from '../../core/auth.service';
import { GuestsApiService } from '../../core/guests-api.service';
import { DocumentsApiService, documentErrorMessage } from '../../core/documents-api.service';
import { Permissions } from '../../core/permissions';
import { SettingsApiService } from '../../core/settings-api.service';
import { CaseworkNoteDrawerComponent } from './casework-note-drawer.component';
import { CaseworkSbarNoteDialogComponent } from './casework-sbar-note-dialog.component';
import { StatusChip, formatDate, formatDateTime, humanize, noteColorDot } from './guest-workspace.util';

/** All six casework note categories (spec §4.6) — Meeting and Daily Log joined the original four. */
const CATEGORY_CHIPS: Record<CaseworkNoteCategory, StatusChip> = {
  Casework: { label: 'CASEWORK', bg: '#ffeaec', fg: '#e12628' },
  Activity: { label: 'ACTIVITY', bg: '#eafdee', fg: '#147129' },
  Meeting: { label: 'MEETING', bg: '#eef1f7', fg: '#384049' },
  DailyLog: { label: 'DAILY LOG', bg: '#f4efff', fg: '#5b3fa8' },
  Hospitality: { label: 'HOSPITALITY', bg: '#fff9e4', fg: '#9d852d' },
  Afa: { label: 'AFA', bg: '#f0f0f0', fg: '#646464' },
};

/** The New Casework Note's risk criteria, as the note history names them. */
const RISK_CHECK_LABELS: Record<CaseworkRiskCheck, string> = {
  NoneApply: 'No immediate risk criteria met',
  NoteConcern: 'Concern noted',
  SuicidalIdeationOrSelfHarm: 'Suicidal ideation or active self-harm',
  RiskOfHarmToOthers: 'Risk of harm to others',
  PsychosisNotUnderMhTeam: 'Signs of psychosis — not under MH team',
  ImmediateRiskOfHomelessness: 'Immediate risk of homelessness',
  NoAccessToFood: 'No access to food',
  SafeguardingConcern: 'Safeguarding concern',
};

/** The collapsible SBAR rows on a Note History card. */
export type SbarRow = 'situation' | 'background' | 'assessment' | 'recommendation';

const RISK_CHIPS: Record<CaseworkRiskLevel, StatusChip> = {
  NoRiskDetected: { label: 'No risk detected', bg: '#eafdee', fg: '#147129' },
  Low: { label: 'Low risk', bg: '#fff9e4', fg: '#9d852d' },
  Medium: { label: 'Medium risk', bg: '#fff9e4', fg: '#9d852d' },
  High: { label: 'High risk', bg: '#ffeaec', fg: '#e12628' },
};

/**
 * Notes tab — the guest's clinical notes in one place, in two cards.
 *
 * "Casework notes" lists the SBAR notes behind the design's "Add contact" flow
 * (GuestOverviewTab2, Components.bundle.js 50271-54563), newest first, each row showing its
 * date, category, author and risk level, with a Draft badge on anything not yet submitted.
 * Expanding a row reveals the full SBAR text and the actions the note produced. The red "Add
 * casework note" button opens CaseworkNoteDrawerComponent; drafts offer Resume (reopens the
 * drawer pre-filled) and Discard (drafts only — submitted notes are part of the record).
 *
 * "Quick notes" underneath is the lightweight sticky-note store (getNotes/addNote), with the
 * pin toggle that decides which notes surface on the Overview tab.
 *
 * Everything is gated on the caller's own claims: guests.notes.view to see either card, and
 * guests.notes.add to write.
 *
 * With `caseworkOnly` the same component is the workspace's "Casework Notes" tab: only notes
 * marked Casework (the clinical record), newest first, without the quick-notes card — so staff
 * can find the clinical record without scrolling past calls, activities and hospitality entries.
 * That tab follows its own design (EMHIP.fig, "Note History"): each note is a locked card with
 * collapsible SBAR rows, the actions it updated and its risk outcome, and "Write New Note" opens
 * the New Casework Note popup (CaseworkSbarNoteDialogComponent) instead of the Add Contact drawer.
 */
@Component({
  selector: 'app-guest-notes-tab',
  standalone: true,
  imports: [FormsModule, CaseworkNoteDrawerComponent, CaseworkSbarNoteDialogComponent],
  templateUrl: './guest-notes-tab.component.html',
  styleUrl: './guest-notes-tab.component.scss',
})
export class GuestNotesTabComponent {
  private readonly guestsApi = inject(GuestsApiService);
  private readonly documentsApi = inject(DocumentsApiService);
  private readonly auth = inject(AuthService);
  private readonly settingsApi = inject(SettingsApiService);

  readonly guestId = input.required<string>();
  readonly guestName = input.required<string>();
  /** "Casework Notes" tab: Casework-category notes only, no quick notes. */
  readonly caseworkOnly = input(false);
  /** Asks the workspace to reload the overview — pinned notes and contacts both live there. */
  @Output() readonly refresh = new EventEmitter<void>();

  readonly canView = this.auth.hasPermission(Permissions.Guests.NotesView);
  readonly canAdd = this.auth.hasPermission(Permissions.Guests.NotesAdd);
  /** Attachments are documents, so opening one follows the documents.view claim. */
  readonly canDownload = this.auth.hasPermission(Permissions.Documents.View);
  /** Attachment being fetched, so its button can show progress. */
  readonly downloadingId = signal<string | null>(null);
  readonly downloadError = signal<string | null>(null);

  // ---- Casework notes ----
  readonly caseworkNotes = signal<CaseworkNoteDto[] | null>(null);
  readonly caseworkLoading = signal(true);
  readonly caseworkError = signal<string | null>(null);
  /** Row currently expanded to its full SBAR detail. */
  readonly expandedId = signal<string | null>(null);
  /** Draft being discarded, so its row controls disable while the request is in flight. */
  readonly discardingId = signal<string | null>(null);

  readonly drawerOpen = signal(false);
  /** The draft the drawer is resuming, or null when writing a new note. */
  readonly drawerNote = signal<CaseworkNoteDto | null>(null);

  /** The notes this tab lists: everything on Notes, Casework-category only on "Casework Notes". */
  readonly visibleNotes = computed(() => {
    const notes = this.caseworkNotes();
    if (!notes || !this.caseworkOnly()) return notes;
    return notes.filter((n) => n.category === 'Casework' && !n.isCpnContact);
  });

  readonly drafts = computed(() => (this.visibleNotes() ?? []).filter((n) => n.status === 'Draft'));

  // ---- Note History (the "Casework Notes" tab) ----
  /** The New Casework Note popup, and the draft it is resuming (null for a new note). */
  readonly sbarOpen = signal(false);
  readonly sbarNote = signal<CaseworkNoteDto | null>(null);
  /** Expanded SBAR rows, keyed `noteId:row`. */
  readonly expandedRows = signal<ReadonlySet<string>>(new Set());
  readonly responseHours = this.settingsApi.urgentResponseHours;

  readonly submittedNotes = computed(() => (this.visibleNotes() ?? []).filter((n) => n.status === 'Submitted'));

  /** "3 notes · Last added 08 May 2025". */
  readonly historySummary = computed(() => {
    const notes = this.submittedNotes();
    if (!notes.length) return 'No notes yet';
    const count = `${notes.length} ${notes.length === 1 ? 'note' : 'notes'}`;
    return `${count} · Last added ${formatDate(notes[0].occurredAt)}`;
  });

  // ---- Quick notes ----
  readonly quickNotes = signal<GuestNoteDto[] | null>(null);
  readonly quickLoading = signal(true);
  readonly quickError = signal<string | null>(null);
  readonly quickSubmitting = signal(false);
  readonly quickSubmitError = signal<string | null>(null);
  /** Note whose pin is being toggled. */
  readonly pinningId = signal<string | null>(null);

  readonly colors: NoteColor[] = ['Yellow', 'Green', 'Orange', 'Purple'];
  quickForm: AddNoteRequest = { body: '', color: 'Yellow', isPinned: true };

  readonly formatDate = formatDate;
  readonly formatDateTime = formatDateTime;
  readonly humanize = humanize;
  readonly noteColorDot = noteColorDot;

  constructor() {
    effect((onCleanup) => {
      const id = this.guestId();
      let cancelled = false;
      onCleanup(() => (cancelled = true));
      if (!this.canView) return;
      this.loadCasework(id, () => cancelled);
      if (!this.caseworkOnly()) this.loadQuick(id, () => cancelled);
    });
  }

  /**
   * A CPN session carries no contact-type chip — the Add Contact popup only offers those when the
   * CPN toggle is off — so the note is labelled by the session it belongs to instead.
   */
  categoryChip(category: CaseworkNoteCategory | null): StatusChip {
    if (category === null) return { label: 'CPN SESSION', bg: '#fde8e6', fg: '#a8271c' };
    return CATEGORY_CHIPS[category] ?? { label: humanize(category), bg: '#f0f0f0', fg: '#646464' };
  }

  /** Activity, Hospitality and AFA contacts are short forms with no SBAR note to show. */
  isShortForm(note: CaseworkNoteDto): boolean {
    return !note.isCpnContact && (note.category === 'Activity' || note.category === 'Hospitality' || note.category === 'Afa');
  }

  riskChip(level: CaseworkRiskLevel): StatusChip {
    return RISK_CHIPS[level] ?? { label: humanize(level), bg: '#f0f0f0', fg: '#646464' };
  }

  // ---- Note History cards ----

  isRowOpen(noteId: string, row: SbarRow): boolean {
    return this.expandedRows().has(`${noteId}:${row}`);
  }

  toggleRow(noteId: string, row: SbarRow): void {
    const key = `${noteId}:${row}`;
    this.expandedRows.update((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  /** The one-line preview on a collapsed Background row: whichever part was written. */
  backgroundPreview(note: CaseworkNoteDto): string | null {
    return note.background || note.guestReportedChanges || note.serviceInvolvementChanges || null;
  }

  /**
   * "08 May 2025 · 11:22 AM · Amara Asante · In person". The contact date is date-only (stored at
   * midday), so the time shown is when the note was submitted — and only when that was the same day.
   */
  cardMeta(note: CaseworkNoteDto): string {
    const parts = [formatDate(note.occurredAt)];
    const stamped = note.submittedAt ?? note.updatedAt;
    if (stamped && new Date(stamped).toDateString() === new Date(note.occurredAt).toDateString()) {
      parts.push(new Date(stamped).toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase());
    }
    parts.push(note.authorName, humanize(note.contactMethod));
    return parts.join(' · ');
  }

  /** The card's risk outcome: from the New Casework Note's risk check, else the older YES/NO level. */
  riskOutcome(note: CaseworkNoteDto): { label: string; tone: 'ok' | 'concern' | 'urgent'; detail: string | null } {
    const check = note.riskCheck;
    if (check === 'NoneApply') return { label: 'No risk identified', tone: 'ok', detail: null };
    if (check === 'NoteConcern') return { label: 'Concern noted', tone: 'concern', detail: null };
    if (check) return { label: 'Urgent flag raised', tone: 'urgent', detail: RISK_CHECK_LABELS[check] };
    switch (note.riskLevel) {
      case 'NoRiskDetected':
        return { label: 'No risk identified', tone: 'ok', detail: null };
      case 'High':
        return { label: 'High risk', tone: 'urgent', detail: null };
      default:
        return { label: this.riskChip(note.riskLevel).label, tone: 'concern', detail: null };
    }
  }

  /** "72-hour follow-up window: deadline 13 May · 10:45 AM". */
  deadlineLabel(value: string): string {
    const at = new Date(value);
    const day = at.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    const time = at.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase();
    return `${day} · ${time}`;
  }

  toggleExpanded(noteId: string): void {
    this.expandedId.set(this.expandedId() === noteId ? null : noteId);
  }

  /** Streams the file through the API (so the JWT applies and the download is logged) and saves it. */
  downloadAttachment(attachment: CaseworkNoteAttachmentDto): void {
    if (this.downloadingId()) return;
    this.downloadingId.set(attachment.documentId);
    this.downloadError.set(null);
    this.documentsApi.download(attachment.documentId).subscribe({
      next: (blob) => {
        this.downloadingId.set(null);
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = attachment.fileName;
        anchor.click();
        URL.revokeObjectURL(url);
      },
      error: (err: unknown) => {
        this.downloadingId.set(null);
        this.downloadError.set(documentErrorMessage(err, 'Could not download this attachment.'));
      },
    });
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  // ---- Drawer ----

  openDrawer(): void {
    if (this.caseworkOnly()) {
      this.sbarNote.set(null);
      this.sbarOpen.set(true);
      return;
    }
    this.drawerNote.set(null);
    this.drawerOpen.set(true);
  }

  /** The Casework Notes tab resumes in its own popup; the Notes tab in the Add Contact drawer. */
  resumeDraft(note: CaseworkNoteDto): void {
    if (this.caseworkOnly()) {
      this.sbarNote.set(note);
      this.sbarOpen.set(true);
      return;
    }
    this.drawerNote.set(note);
    this.drawerOpen.set(true);
  }

  closeSbar(): void {
    this.sbarOpen.set(false);
    this.sbarNote.set(null);
  }

  /** A draft save refreshes the list behind the popup; a submit also closes it and the overview reloads. */
  onSbarSaved(submitted: boolean): void {
    this.loadCasework(this.guestId(), () => false);
    if (submitted) {
      this.closeSbar();
      this.refresh.emit();
    }
  }

  onSbarDiscarded(): void {
    this.closeSbar();
    this.loadCasework(this.guestId(), () => false);
  }

  closeDrawer(): void {
    this.drawerOpen.set(false);
    this.drawerNote.set(null);
  }

  /** `submitted` is false for a draft save — the list refreshes but the drawer stays open. */
  onDrawerSaved(submitted: boolean): void {
    this.loadCasework(this.guestId(), () => false);
    if (submitted) {
      this.closeDrawer();
      // A submitted note writes a contact (and possibly a follow-up), both of which the
      // workspace header and Overview tab read from the overview payload.
      this.refresh.emit();
    }
  }

  discardDraft(note: CaseworkNoteDto): void {
    if (this.discardingId()) return;
    this.discardingId.set(note.id);
    this.guestsApi.deleteCaseworkNote(this.guestId(), note.id).subscribe({
      next: () => {
        this.discardingId.set(null);
        if (this.expandedId() === note.id) this.expandedId.set(null);
        this.loadCasework(this.guestId(), () => false);
      },
      error: (err: HttpErrorResponse) => {
        this.discardingId.set(null);
        this.caseworkError.set(this.problemDetail(err) ?? 'Could not discard this draft. Please try again.');
      },
    });
  }

  // ---- Quick notes ----

  submitQuickNote(): void {
    if (this.quickSubmitting()) return;
    if (!this.quickForm.body.trim()) {
      this.quickSubmitError.set('Note text is required.');
      return;
    }
    this.quickSubmitting.set(true);
    this.quickSubmitError.set(null);
    this.guestsApi.addNote(this.guestId(), { ...this.quickForm, body: this.quickForm.body.trim() }).subscribe({
      next: () => {
        this.quickSubmitting.set(false);
        this.quickForm = { body: '', color: 'Yellow', isPinned: true };
        this.loadQuick(this.guestId(), () => false);
        this.refresh.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.quickSubmitting.set(false);
        this.quickSubmitError.set(this.problemDetail(err) ?? 'Could not save this note. Please try again.');
      },
    });
  }

  togglePinned(note: GuestNoteDto): void {
    if (this.pinningId()) return;
    this.pinningId.set(note.id);
    this.guestsApi.setNotePinned(this.guestId(), note.id, !note.isPinned).subscribe({
      next: () => {
        this.pinningId.set(null);
        this.loadQuick(this.guestId(), () => false);
        this.refresh.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.pinningId.set(null);
        this.quickError.set(this.problemDetail(err) ?? 'Could not change this note’s pin. Please try again.');
      },
    });
  }

  // ---- Loading ----

  private loadCasework(guestId: string, isCancelled: () => boolean): void {
    this.caseworkLoading.set(true);
    this.caseworkError.set(null);
    this.guestsApi.getCaseworkNotes(guestId).subscribe({
      next: (notes) => {
        if (isCancelled()) return;
        // The API returns newest first; sorting here keeps that true whatever the caller sends.
        this.caseworkNotes.set(
          [...notes].sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()),
        );
        // The Note History opens with the newest note's Situation showing, as the design does.
        const newest = this.submittedNotes()[0];
        if (newest && this.expandedRows().size === 0) this.expandedRows.set(new Set([`${newest.id}:situation`]));
        this.caseworkLoading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        if (isCancelled()) return;
        this.caseworkError.set(this.problemDetail(err) ?? 'Could not load casework notes for this guest.');
        this.caseworkLoading.set(false);
      },
    });
  }

  private loadQuick(guestId: string, isCancelled: () => boolean): void {
    this.quickLoading.set(true);
    this.quickError.set(null);
    this.guestsApi.getNotes(guestId).subscribe({
      next: (notes) => {
        if (isCancelled()) return;
        this.quickNotes.set(notes);
        this.quickLoading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        if (isCancelled()) return;
        this.quickError.set(this.problemDetail(err) ?? 'Could not load notes for this guest.');
        this.quickLoading.set(false);
      },
    });
  }

  /** ProblemDetails bodies carry the useful message in `detail`. */
  private problemDetail(err: HttpErrorResponse): string | null {
    const body = err?.error as { detail?: unknown } | null;
    return typeof body?.detail === 'string' && body.detail.trim() ? body.detail : null;
  }
}

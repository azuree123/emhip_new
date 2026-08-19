import { HttpErrorResponse } from '@angular/common/http';
import { Component, EventEmitter, Output, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  AddNoteRequest,
  CaseworkNoteCategory,
  CaseworkNoteDto,
  CaseworkRiskLevel,
  GuestNoteDto,
  NoteColor,
} from '../../core/api-models';
import { AuthService } from '../../core/auth.service';
import { GuestsApiService } from '../../core/guests-api.service';
import { Permissions } from '../../core/permissions';
import { CaseworkNoteDrawerComponent } from './casework-note-drawer.component';
import { StatusChip, formatDate, formatDateTime, humanize, noteColorDot } from './guest-workspace.util';

const CATEGORY_CHIPS: Record<CaseworkNoteCategory, StatusChip> = {
  Casework: { label: 'CASEWORK', bg: '#ffeaec', fg: '#e12628' },
  Activity: { label: 'ACTIVITY', bg: '#eafdee', fg: '#147129' },
  Hospitality: { label: 'HOSPITALITY', bg: '#fff9e4', fg: '#9d852d' },
  Afa: { label: 'AFA', bg: '#f0f0f0', fg: '#646464' },
};

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
 */
@Component({
  selector: 'app-guest-notes-tab',
  standalone: true,
  imports: [FormsModule, CaseworkNoteDrawerComponent],
  templateUrl: './guest-notes-tab.component.html',
  styleUrl: './guest-notes-tab.component.scss',
})
export class GuestNotesTabComponent {
  private readonly guestsApi = inject(GuestsApiService);
  private readonly auth = inject(AuthService);

  readonly guestId = input.required<string>();
  readonly guestName = input.required<string>();
  /** Asks the workspace to reload the overview — pinned notes and contacts both live there. */
  @Output() readonly refresh = new EventEmitter<void>();

  readonly canView = this.auth.hasPermission(Permissions.Guests.NotesView);
  readonly canAdd = this.auth.hasPermission(Permissions.Guests.NotesAdd);

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

  readonly drafts = computed(() => (this.caseworkNotes() ?? []).filter((n) => n.status === 'Draft'));

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
      this.loadQuick(id, () => cancelled);
    });
  }

  categoryChip(category: CaseworkNoteCategory): StatusChip {
    return CATEGORY_CHIPS[category] ?? { label: humanize(category), bg: '#f0f0f0', fg: '#646464' };
  }

  riskChip(level: CaseworkRiskLevel): StatusChip {
    return RISK_CHIPS[level] ?? { label: humanize(level), bg: '#f0f0f0', fg: '#646464' };
  }

  toggleExpanded(noteId: string): void {
    this.expandedId.set(this.expandedId() === noteId ? null : noteId);
  }

  // ---- Drawer ----

  openDrawer(): void {
    this.drawerNote.set(null);
    this.drawerOpen.set(true);
  }

  resumeDraft(note: CaseworkNoteDto): void {
    this.drawerNote.set(note);
    this.drawerOpen.set(true);
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

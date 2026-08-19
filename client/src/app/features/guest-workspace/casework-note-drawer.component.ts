import { HttpErrorResponse } from '@angular/common/http';
import { Component, EventEmitter, Output, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable, map } from 'rxjs';
import {
  CaseworkActionInput,
  CaseworkNoteCategory,
  CaseworkNoteDto,
  CaseworkNoteInput,
  CaseworkRiskLevel,
  ContactType,
} from '../../core/api-models';
import { AuthService } from '../../core/auth.service';
import { GuestsApiService } from '../../core/guests-api.service';
import { StaffPickerComponent } from '../../shared/staff-picker.component';
import { humanize } from './guest-workspace.util';

/** One row of "Actions arising from this note"; `key` keeps @for tracking stable across removals. */
interface ActionRow {
  key: number;
  description: string;
  dueDate: string;
  assignedToStaffId: string | null;
}

/** The drawer's edit model — string-only so it binds straight to the inputs. */
interface NoteForm {
  category: CaseworkNoteCategory;
  /** '' renders the design's "Select...." placeholder; the API field itself is not nullable. */
  contactMethod: ContactType | '';
  /** yyyy-MM-dd — the design shows a date-only "dd/mm/yyyy" field, not an instant. */
  occurredOn: string;
  situation: string;
  background: string;
  assessment: string;
  recommendation: string;
  riskLevel: CaseworkRiskLevel;
  guestReportedChanges: string;
  serviceInvolvementChanges: string;
  additionalNotes: string;
  nextContactDate: string;
  mdtDiscussionRequested: boolean;
  cpnReferralRequested: boolean;
}

/** yyyy-MM-dd for an ISO instant, in the browser's local timezone. */
function toDateInput(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => `${n}`.padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function today(): string {
  return toDateInput(new Date().toISOString());
}

/**
 * Casework note drawer — the real "Add contact" panel from GuestOverviewTab2
 * (project/screens/Components.bundle.js 50271-54563). The design's "add contact" is not a bare
 * contact row: it is a structured SBAR clinical note, and this component is a faithful build of
 * it against the casework-note API (POST/PUT /guests/{id}/casework-notes).
 *
 * Layout follows the source top-to-bottom: an "Add contact" title over the guest's name, the
 * read-only "Logged by" field pre-filled from the login session, the "Mark as:" category radios
 * (all six spec §4.6 categories), contact method + date, then the four SBAR blocks
 * (Situation · Background · Assessment · Recommendation), the actions arising from the session,
 * additional notes, the next contact date, the MDT/CPN toggles, and the "Save as draft" /
 * "Submit casework note" footer.
 *
 * Drafts: "Save as draft" posts with submit=false and keeps the panel open, remembering the id
 * the server hands back so every later save updates that same draft instead of creating another.
 * Resuming a draft from the Notes tab hydrates the form from the passed CaseworkNoteDto.
 *
 * Honest-data notes:
 * - The design's risk row offers only "YES, HIGH RISK" and "NO RISK DETECTED"; the API's
 *   CaseworkRiskLevel also has Low and Medium, which this form has no affordance for. A note
 *   already carrying one of them shows it as a read-only line rather than silently downgrading.
 * - The design marks both Situation and Assessment mandatory ("Situation and Assessment are
 *   mandatory"); the server only enforces assessment, so situation is a client-side rule.
 * - "Logged by" is display-only — the server records the calling staff member itself.
 * - CaseworkNoteActionDto carries an assignee's *name*, not their id, so a resumed draft
 *   reopens with the action assignee cleared rather than pointing at the wrong staff member.
 */
@Component({
  selector: 'emhip-casework-note-drawer',
  standalone: true,
  imports: [FormsModule, StaffPickerComponent],
  templateUrl: './casework-note-drawer.component.html',
  styleUrl: './casework-note-drawer.component.scss',
})
export class CaseworkNoteDrawerComponent {
  private readonly guestsApi = inject(GuestsApiService);
  private readonly auth = inject(AuthService);

  readonly guestId = input.required<string>();
  readonly guestName = input.required<string>();
  /** An existing draft to resume; null opens a blank note. */
  readonly note = input<CaseworkNoteDto | null>(null);

  /** Emits after every successful save; `true` when the note was submitted, `false` for a draft. */
  @Output() readonly saved = new EventEmitter<boolean>();
  @Output() readonly closed = new EventEmitter<void>();

  /** null when idle, otherwise which footer button is in flight. */
  readonly saving = signal<'draft' | 'submit' | null>(null);
  readonly saveError = signal<string | null>(null);
  /** Set once a draft has been saved in this session, so the footer can confirm it. */
  readonly draftSavedAt = signal<string | null>(null);
  /** Id of the note being edited — from a resumed draft, or from the first draft save. */
  private readonly noteId = signal<string | null>(null);

  readonly loggedBy = this.auth.current().displayName || '—';
  readonly humanize = humanize;

  /** The full spec §4.6 category set; the chip row wraps to a second line for the last two. */
  readonly categories: { value: CaseworkNoteCategory; label: string }[] = [
    { value: 'Casework', label: 'CASEWORK' },
    { value: 'Activity', label: 'ACTIVITY' },
    { value: 'Meeting', label: 'MEETING' },
    { value: 'DailyLog', label: 'DAILY LOG' },
    { value: 'Hospitality', label: 'HOSPITALITY' },
    { value: 'Afa', label: 'AFA' },
  ];

  /** Source order: "YES, HIGH RISK" sits left of "NO RISK DETECTED" in the design. */
  readonly riskChoices: { value: CaseworkRiskLevel; label: string }[] = [
    { value: 'High', label: 'YES, HIGH RISK' },
    { value: 'NoRiskDetected', label: 'NO RISK DETECTED' },
  ];

  readonly contactTypes: ContactType[] = ['PhoneCall', 'InPerson', 'VideoCall', 'TextMessage', 'Email'];

  form: NoteForm = this.emptyForm();
  actions: ActionRow[] = [];
  private nextActionKey = 1;

  /**
   * True when the note carries a Low/Medium risk level the design's two chips cannot express.
   * A getter rather than a computed — `form` is a plain object, so there is no signal to track.
   */
  get riskOutsideChoices(): boolean {
    return this.form.riskLevel === 'Low' || this.form.riskLevel === 'Medium';
  }

  readonly title = computed(() => (this.noteId() ? 'Resume casework note' : 'Add contact'));

  constructor() {
    effect(() => {
      const existing = this.note();
      this.noteId.set(existing?.id ?? null);
      this.form = existing ? this.formFrom(existing) : this.emptyForm();
      this.actions = (existing?.actions ?? []).map((a) => ({
        key: this.nextActionKey++,
        description: a.description,
        dueDate: toDateInput(a.dueDate),
        // The DTO carries the assignee's name, not their id — a resumed draft therefore
        // reopens with the picker cleared rather than pointing at the wrong staff member.
        assignedToStaffId: null,
      }));
      this.saveError.set(null);
      this.draftSavedAt.set(null);
    });
  }

  private emptyForm(): NoteForm {
    return {
      category: 'Casework',
      contactMethod: '',
      occurredOn: today(),
      situation: '',
      background: '',
      assessment: '',
      recommendation: '',
      riskLevel: 'NoRiskDetected',
      guestReportedChanges: '',
      serviceInvolvementChanges: '',
      additionalNotes: '',
      nextContactDate: '',
      mdtDiscussionRequested: false,
      cpnReferralRequested: false,
    };
  }

  private formFrom(dto: CaseworkNoteDto): NoteForm {
    return {
      category: dto.category,
      contactMethod: dto.contactMethod,
      occurredOn: toDateInput(dto.occurredAt) || today(),
      situation: dto.situation ?? '',
      background: dto.background ?? '',
      assessment: dto.assessment ?? '',
      recommendation: dto.recommendation ?? '',
      riskLevel: dto.riskLevel,
      guestReportedChanges: dto.guestReportedChanges ?? '',
      serviceInvolvementChanges: dto.serviceInvolvementChanges ?? '',
      additionalNotes: dto.additionalNotes ?? '',
      nextContactDate: toDateInput(dto.nextContactDate),
      mdtDiscussionRequested: dto.mdtDiscussionRequested,
      cpnReferralRequested: dto.cpnReferralRequested,
    };
  }

  setCategory(category: CaseworkNoteCategory): void {
    this.form.category = category;
  }

  setRisk(level: CaseworkRiskLevel): void {
    this.form.riskLevel = level;
  }

  toggleMdt(): void {
    this.form.mdtDiscussionRequested = !this.form.mdtDiscussionRequested;
  }

  toggleCpn(): void {
    this.form.cpnReferralRequested = !this.form.cpnReferralRequested;
  }

  addActionRow(): void {
    this.actions = [
      ...this.actions,
      { key: this.nextActionKey++, description: '', dueDate: today(), assignedToStaffId: null },
    ];
  }

  removeActionRow(key: number): void {
    this.actions = this.actions.filter((a) => a.key !== key);
  }

  close(): void {
    if (this.saving()) return;
    this.closed.emit();
  }

  saveDraft(): void {
    this.persist(false);
  }

  submitNote(): void {
    this.persist(true);
  }

  /**
   * Shared save path. A draft only needs the fields the API cannot default (contact method and
   * date); submitting additionally enforces the design's two mandatory SBAR sections.
   */
  private persist(submit: boolean): void {
    if (this.saving()) return;

    if (!this.form.contactMethod) {
      this.saveError.set('Choose a contact method before saving.');
      return;
    }
    if (!this.form.occurredOn) {
      this.saveError.set('Enter the date this contact happened.');
      return;
    }
    // Untouched blank rows are dropped silently; a half-filled one is a mistake worth flagging.
    const partialAction = this.actions.some((a) => {
      const described = a.description.trim().length > 0;
      return (described && !a.dueDate) || (!described && !!a.assignedToStaffId);
    });
    if (partialAction) {
      this.saveError.set('Every action arising from this note needs a description and a due date.');
      return;
    }
    if (submit) {
      if (!this.form.situation.trim()) {
        this.saveError.set('Situation is required to submit a casework note.');
        return;
      }
      if (!this.form.assessment.trim()) {
        this.saveError.set('Your assessment of what is going on is required to submit a casework note.');
        return;
      }
    }

    const input = this.toInput();
    const id = this.noteId();
    this.saving.set(submit ? 'submit' : 'draft');
    this.saveError.set(null);

    // Normalised to the saved id (null on update) so both branches share one subscriber.
    const request$: Observable<string | null> = id
      ? this.guestsApi.updateCaseworkNote(this.guestId(), id, input, submit).pipe(map(() => null))
      : this.guestsApi.saveCaseworkNote(this.guestId(), input, submit).pipe(map((res) => res.id));

    request$.subscribe({
      next: (createdId) => {
        // A create hands back the new id; keeping it means the next "Save as draft" updates
        // this draft rather than piling up duplicates.
        if (createdId) this.noteId.set(createdId);
        this.saving.set(null);
        if (submit) {
          this.saved.emit(true);
        } else {
          this.draftSavedAt.set(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
          this.saved.emit(false);
        }
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(null);
        this.saveError.set(
          this.problemDetail(err) ??
            (submit ? 'Could not submit this casework note. Please try again.' : 'Could not save this draft. Please try again.'),
        );
      },
    });
  }

  /** ProblemDetails bodies carry the useful message in `detail`. */
  private problemDetail(err: HttpErrorResponse): string | null {
    const body = err?.error as { detail?: unknown } | null;
    return typeof body?.detail === 'string' && body.detail.trim() ? body.detail : null;
  }

  private toInput(): CaseworkNoteInput {
    const actions: CaseworkActionInput[] = this.actions
      .filter((a) => a.description.trim() && a.dueDate)
      .map((a) => ({
        description: a.description.trim(),
        dueDate: a.dueDate,
        assignedToStaffId: a.assignedToStaffId,
      }));

    return {
      category: this.form.category,
      contactMethod: this.form.contactMethod as ContactType,
      // Date-only field: midday local keeps the note on the chosen day in every timezone.
      occurredAt: new Date(`${this.form.occurredOn}T12:00:00`).toISOString(),
      situation: this.trimmed(this.form.situation),
      background: this.trimmed(this.form.background),
      assessment: this.trimmed(this.form.assessment),
      recommendation: this.trimmed(this.form.recommendation),
      riskLevel: this.form.riskLevel,
      guestReportedChanges: this.trimmed(this.form.guestReportedChanges),
      serviceInvolvementChanges: this.trimmed(this.form.serviceInvolvementChanges),
      additionalNotes: this.trimmed(this.form.additionalNotes),
      nextContactDate: this.form.nextContactDate || null,
      mdtDiscussionRequested: this.form.mdtDiscussionRequested,
      cpnReferralRequested: this.form.cpnReferralRequested,
      actions,
    };
  }

  private trimmed(value: string): string | null {
    const text = value.trim();
    return text ? text : null;
  }
}

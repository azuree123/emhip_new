import { HttpErrorResponse } from '@angular/common/http';
import { Component, EventEmitter, OnDestroy, OnInit, Output, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable, map } from 'rxjs';
import {
  CaseworkNoteDto,
  CaseworkNoteInput,
  CaseworkRiskCheck,
  ContactType,
  GuestActionDto,
  LookupItemDto,
} from '../../core/api-models';
import { AuthService } from '../../core/auth.service';
import { GuestsApiService } from '../../core/guests-api.service';
import { SettingsApiService } from '../../core/settings-api.service';
import { humanize } from './guest-workspace.util';

/** The collapsible grey-bar sections, in the design's reading order. */
type SectionKey = 'situation' | 'background' | 'assessment' | 'risk' | 'recommendation' | 'next' | 'afa';

interface NewActionRow {
  key: number;
  description: string;
  dueDate: string;
}

interface NoteForm {
  /** yyyy-MM-dd — the design's date-only "dd/mm/yyyy" field. */
  occurredOn: string;
  contactMethod: ContactType | '';
  situation: string;
  background: string;
  guestReportedChanges: string;
  serviceInvolvementChanges: string;
  assessment: string;
  riskCheck: CaseworkRiskCheck | null;
  /** The crisis action notes (immediate risk) or the concern note ("Note a concern"). */
  riskNotes: string;
  recommendation: string;
  nextContactDate: string;
  noNextContactRequired: boolean;
  adviceType: string;
  afaContactMethod: ContactType | '';
  /** The AFA section's "Additional notes" — the details of the advice given. */
  afaNotes: string;
}

/** The six criteria that alert the Hub Manager, in the design's two-column order. */
const RISK_CRITERIA: { value: CaseworkRiskCheck; label: string }[] = [
  { value: 'SuicidalIdeationOrSelfHarm', label: 'Suicidal ideation or active self-harm' },
  { value: 'RiskOfHarmToOthers', label: 'Risk of harm to others' },
  { value: 'PsychosisNotUnderMhTeam', label: 'Signs of psychosis — not under MH team' },
  { value: 'ImmediateRiskOfHomelessness', label: 'Immediate risk of homelessness' },
  { value: 'NoAccessToFood', label: 'No access to food' },
  { value: 'SafeguardingConcern', label: 'Safeguarding concern' },
];

const AUTOSAVE_MS = 30_000;

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

function clockTime(value: Date | string): string {
  return new Date(value).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

/**
 * "New Casework Note" — the Casework Notes tab's own popup (EMHIP.fig, "New Casework Note"), in
 * place of the multi-type Add Contact drawer. One Casework-category SBAR note:
 *
 * - Situation, Background, Assessment and Recommendation as collapsible grey-bar sections (the
 *   design note: "drop down functionality on each question to reduce cognitive scrolling").
 * - A single-choice risk assessment ("You can select only one option"). The six criteria are
 *   immediate risks: submitting one opens (or adds to) the guest's urgent case — the Hub Manager
 *   alert and the follow-up window — with the crisis action notes as its intake notes. "Note a
 *   concern" records a monitored concern without an alert.
 * - The guest's open actions to tick off in this session, plus new actions arising from it.
 * - An optional AFA section: picking a type of advice files a separate AFA contact on submit, so it
 *   counts exactly as one logged through the AFA form ("Worker can select it from separate AFA
 *   type or from casework type").
 *
 * Drafts auto-save every 30 seconds once they can be saved (the API needs a contact method), and
 * closing the popup saves any unsaved change first. "Submit & lock note" files the note on the
 * clinical record, where it can no longer be edited.
 */
@Component({
  selector: 'emhip-casework-sbar-note-dialog',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './casework-sbar-note-dialog.component.html',
  styleUrl: './casework-sbar-note-dialog.component.scss',
})
export class CaseworkSbarNoteDialogComponent implements OnInit, OnDestroy {
  private readonly guestsApi = inject(GuestsApiService);
  private readonly settingsApi = inject(SettingsApiService);
  private readonly auth = inject(AuthService);

  readonly guestId = input.required<string>();
  readonly guestName = input.required<string>();
  /** A draft to resume; null starts a new note. */
  readonly note = input<CaseworkNoteDto | null>(null);

  /** After every successful save — `true` once the note has been submitted and locked. */
  @Output() readonly saved = new EventEmitter<boolean>();
  /** The draft was discarded (deleted), so the list should drop it. */
  @Output() readonly discarded = new EventEmitter<void>();
  @Output() readonly closed = new EventEmitter<void>();

  readonly loggedBy = this.auth.current().displayName || '—';
  readonly responseHours = this.settingsApi.urgentResponseHours;
  readonly humanize = humanize;
  readonly riskCriteria = RISK_CRITERIA;
  readonly contactTypes: ContactType[] = ['PhoneCall', 'InPerson', 'VideoCall', 'TextMessage', 'Email'];

  form: NoteForm = this.emptyForm();
  newActions: NewActionRow[] = [];
  private nextActionKey = 1;

  /** The inline "Add new action from this session" row, while it is open. */
  actionDraft: { description: string; dueDate: string } | null = null;
  readonly actionDraftError = signal<string | null>(null);

  /** The guest's open actions, soonest due first; null while loading. */
  readonly openActions = signal<GuestActionDto[] | null>(null);
  readonly actionsError = signal<string | null>(null);
  /** Open actions ticked off in this session — completed when the note is submitted. */
  readonly ticked = signal<ReadonlySet<string>>(new Set());

  readonly adviceTypes = signal<LookupItemDto[]>([]);

  readonly openSections = signal<ReadonlySet<SectionKey>>(new Set(['situation']));

  /** Id of the saved draft — from a resumed note, or from the first save in this session. */
  readonly noteId = signal<string | null>(null);
  readonly saving = signal<'draft' | 'submit' | 'auto' | null>(null);
  readonly saveError = signal<string | null>(null);
  readonly startedAt = signal<string>(new Date().toISOString());
  readonly lastSavedAt = signal<string | null>(null);
  /** When "None of the above apply" was chosen — the design's "confirmed at 15:17". */
  readonly noneConfirmedAt = signal<string | null>(null);

  /** Inline confirmations instead of browser dialogs. */
  readonly confirmingDiscard = signal(false);
  readonly confirmingClose = signal(false);
  readonly discarding = signal(false);

  /** JSON of the last saved input, so autosave and close only save what changed. */
  private savedSnapshot = '';
  private autosaveTimer: ReturnType<typeof setInterval> | null = null;

  readonly title = computed(() => (this.note() ? 'Resume Casework Note' : 'New Casework Note'));

  constructor() {
    effect(() => {
      const existing = this.note();
      // Only the input drives this; the signals read while resetting (ticked, via the snapshot)
      // must not re-run it, or ticking an action would wipe the form.
      untracked(() => {
        this.noteId.set(existing?.id ?? null);
        this.form = existing ? this.formFrom(existing) : this.emptyForm();
        this.newActions = [];
        this.ticked.set(new Set(existing?.completedActionIds ?? []));
        this.startedAt.set(existing?.createdAt ?? new Date().toISOString());
        this.lastSavedAt.set(existing ? (existing.updatedAt ?? existing.createdAt) : null);
        this.noneConfirmedAt.set(existing?.riskCheck === 'NoneApply' ? (existing.updatedAt ?? existing.createdAt) : null);
        this.saveError.set(null);
        this.savedSnapshot = this.snapshot();
        // A resumed draft opens where the worker left off: the first section still to complete.
        this.openSections.set(new Set([this.firstIncompleteSection() ?? 'situation']));
      });
    });
  }

  ngOnInit(): void {
    this.guestsApi.getActions(this.guestId()).subscribe({
      next: (actions) => {
        const open = actions
          .filter((a) => !a.isCompleted)
          .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
        this.openActions.set(open);
        // A ticked action completed elsewhere since the draft was saved has nothing left to tick.
        const openIds = new Set(open.map((a) => a.id));
        this.ticked.update((current) => new Set([...current].filter((id) => openIds.has(id))));
      },
      error: () => {
        this.openActions.set([]);
        this.actionsError.set('Could not load this guest’s open actions. New actions can still be added.');
      },
    });
    this.settingsApi.getLookups('AfaAdviceType').subscribe({
      next: (items) => this.adviceTypes.set(items),
      error: () => this.adviceTypes.set([]),
    });
    this.autosaveTimer = setInterval(() => this.autosave(), AUTOSAVE_MS);
  }

  ngOnDestroy(): void {
    if (this.autosaveTimer) clearInterval(this.autosaveTimer);
  }

  private emptyForm(): NoteForm {
    return {
      occurredOn: today(),
      contactMethod: '',
      situation: '',
      background: '',
      guestReportedChanges: '',
      serviceInvolvementChanges: '',
      assessment: '',
      riskCheck: null,
      riskNotes: '',
      recommendation: '',
      nextContactDate: '',
      noNextContactRequired: false,
      adviceType: '',
      afaContactMethod: '',
      afaNotes: '',
    };
  }

  private formFrom(dto: CaseworkNoteDto): NoteForm {
    return {
      occurredOn: toDateInput(dto.occurredAt) || today(),
      contactMethod: dto.contactMethod,
      situation: dto.situation ?? '',
      background: dto.background ?? '',
      guestReportedChanges: dto.guestReportedChanges ?? '',
      serviceInvolvementChanges: dto.serviceInvolvementChanges ?? '',
      assessment: dto.assessment ?? '',
      riskCheck: dto.riskCheck,
      riskNotes: dto.riskNotes ?? '',
      recommendation: dto.recommendation ?? '',
      nextContactDate: toDateInput(dto.nextContactDate),
      noNextContactRequired: dto.noNextContactRequired,
      adviceType: dto.adviceType ?? '',
      afaContactMethod: dto.afaContactMethod ?? '',
      afaNotes: dto.additionalNotes ?? '',
    };
  }

  // ---- Sections ----

  isOpen(section: SectionKey): boolean {
    return this.openSections().has(section);
  }

  toggleSection(section: SectionKey): void {
    this.openSections.update((current) => {
      const next = new Set(current);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  }

  get allOpen(): boolean {
    return this.openSections().size === 7;
  }

  toggleAll(): void {
    this.openSections.set(
      this.allOpen ? new Set() : new Set<SectionKey>(['situation', 'background', 'assessment', 'risk', 'recommendation', 'next', 'afa']),
    );
  }

  /** Whether a section holds what it needs — the tick on its collapsed bar. */
  isComplete(section: SectionKey): boolean {
    const f = this.form;
    switch (section) {
      case 'situation':
        return !!f.situation.trim();
      case 'background':
        return !!(f.background.trim() || f.guestReportedChanges.trim() || f.serviceInvolvementChanges.trim());
      case 'assessment':
        return !!f.assessment.trim();
      case 'risk':
        return f.riskCheck !== null && (f.riskCheck === 'NoneApply' || !!f.riskNotes.trim());
      case 'recommendation':
        return !!f.recommendation.trim() || this.ticked().size > 0 || this.newActions.length > 0;
      case 'next':
        return !!f.nextContactDate || f.noNextContactRequired;
      case 'afa':
        return !!f.adviceType && !!f.afaContactMethod;
    }
  }

  private firstIncompleteSection(): SectionKey | null {
    const required: SectionKey[] = ['situation', 'assessment', 'risk', 'next'];
    return required.find((s) => !this.isComplete(s)) ?? null;
  }

  /** Opens a section and brings it into view — used when a submit check fails inside it. */
  private reveal(section: SectionKey): void {
    this.openSections.update((current) => new Set([...current, section]));
    setTimeout(() => document.getElementById(`cw-section-${section}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  // ---- Risk assessment ----

  get isImmediateRisk(): boolean {
    const check = this.form.riskCheck;
    return check !== null && check !== 'NoneApply' && check !== 'NoteConcern';
  }

  /** Single choice: picking an option replaces the last one; picking it again clears it. */
  setRiskCheck(value: CaseworkRiskCheck): void {
    this.form.riskCheck = this.form.riskCheck === value ? null : value;
    this.noneConfirmedAt.set(this.form.riskCheck === 'NoneApply' ? new Date().toISOString() : null);
    this.saveError.set(null);
  }

  confirmedAtLabel(): string {
    const at = this.noneConfirmedAt();
    return at ? clockTime(at) : '';
  }

  // ---- Actions ----

  isTicked(id: string): boolean {
    return this.ticked().has(id);
  }

  toggleTicked(id: string): void {
    this.ticked.update((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /** "Overdue — was due 13 May", "Due today — 15 May" or "Due 20 May 2025", as the design reads. */
  dueLabel(action: GuestActionDto): { text: string; tone: 'overdue' | 'today' | 'later' } {
    const due = new Date(`${action.dueDate}T00:00:00`);
    const dayMonth = due.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    const todayIso = today();
    if (action.dueDate < todayIso) return { text: `Overdue — was due ${dayMonth}`, tone: 'overdue' };
    if (action.dueDate === todayIso) return { text: `Due today — ${dayMonth}`, tone: 'today' };
    return { text: `Due ${due.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`, tone: 'later' };
  }

  startActionDraft(): void {
    this.actionDraft = { description: '', dueDate: '' };
    this.actionDraftError.set(null);
  }

  cancelActionDraft(): void {
    this.actionDraft = null;
    this.actionDraftError.set(null);
  }

  addActionDraft(): void {
    const draft = this.actionDraft;
    if (!draft) return;
    if (!draft.description.trim()) {
      this.actionDraftError.set('Describe the action.');
      return;
    }
    if (!draft.dueDate) {
      this.actionDraftError.set('Choose a due date for the action.');
      return;
    }
    this.newActions = [...this.newActions, { key: this.nextActionKey++, description: draft.description.trim(), dueDate: draft.dueDate }];
    this.actionDraft = null;
    this.actionDraftError.set(null);
  }

  removeNewAction(key: number): void {
    this.newActions = this.newActions.filter((a) => a.key !== key);
  }

  formatDue(date: string): string {
    return new Date(`${date}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  // ---- Next contact ----

  setNoNextContact(value: boolean): void {
    this.form.noNextContactRequired = value;
    if (value) this.form.nextContactDate = '';
  }

  // ---- Draft banner, close and discard ----

  get startedLabel(): string {
    const at = new Date(this.startedAt());
    return `${at.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} · ${clockTime(at)}`;
  }

  get lastSavedLabel(): string | null {
    const at = this.lastSavedAt();
    return at ? clockTime(at) : null;
  }

  /** The API cannot store a note without a contact method and date, so neither can autosave. */
  get canSaveDraft(): boolean {
    return !!this.form.contactMethod && !!this.form.occurredOn;
  }

  get isDirty(): boolean {
    return this.snapshot() !== this.savedSnapshot;
  }

  close(): void {
    if (this.saving() || this.discarding()) return;
    if (!this.isDirty) {
      this.closed.emit();
      return;
    }
    if (!this.canSaveDraft) {
      // Nothing can be kept without a contact method — say so rather than losing the text silently.
      this.confirmingClose.set(true);
      return;
    }
    this.persist('auto', () => this.closed.emit());
  }

  closeWithoutSaving(): void {
    this.confirmingClose.set(false);
    this.closed.emit();
  }

  keepWriting(): void {
    this.confirmingClose.set(false);
  }

  /** Deletes the saved draft; a note never saved simply closes. */
  discardDraft(): void {
    const id = this.noteId();
    if (!id) {
      this.confirmingDiscard.set(false);
      this.closed.emit();
      return;
    }
    if (this.discarding()) return;
    this.discarding.set(true);
    this.guestsApi.deleteCaseworkNote(this.guestId(), id).subscribe({
      next: () => {
        this.discarding.set(false);
        this.confirmingDiscard.set(false);
        this.discarded.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.discarding.set(false);
        this.confirmingDiscard.set(false);
        this.saveError.set(this.problemDetail(err) ?? 'Could not discard this draft. Please try again.');
      },
    });
  }

  // ---- Saving ----

  private autosave(): void {
    if (this.saving() || this.discarding() || !this.canSaveDraft || !this.isDirty) return;
    this.persist('auto');
  }

  saveDraft(): void {
    if (!this.canSaveDraft) {
      this.saveError.set(this.form.contactMethod ? 'Enter the date of this contact.' : 'Choose a contact method before saving.');
      return;
    }
    this.persist('draft');
  }

  submit(): void {
    const problem = this.validateForSubmit();
    if (problem) {
      this.saveError.set(problem.message);
      if (problem.section) this.reveal(problem.section);
      return;
    }
    this.persist('submit');
  }

  /** The design's mandatory fields, checked in reading order so the first gap is the one shown. */
  private validateForSubmit(): { message: string; section: SectionKey | null } | null {
    const f = this.form;
    if (!f.occurredOn) return { message: 'Enter the date of this contact.', section: null };
    if (!f.contactMethod) return { message: 'Choose a contact method.', section: null };
    if (!f.situation.trim()) return { message: 'Describe the current presenting concerns.', section: 'situation' };
    if (!f.assessment.trim()) return { message: 'Your assessment of what is going on is required.', section: 'assessment' };
    if (!f.riskCheck) {
      return { message: 'Complete the risk assessment — choose one option, or "None of the above apply".', section: 'risk' };
    }
    if (this.isImmediateRisk && !f.riskNotes.trim()) {
      return { message: 'Crisis action notes are required before submission.', section: 'risk' };
    }
    if (f.riskCheck === 'NoteConcern' && !f.riskNotes.trim()) {
      return { message: 'Describe your concern and what you will monitor.', section: 'risk' };
    }
    if (this.actionDraft && (this.actionDraft.description.trim() || this.actionDraft.dueDate)) {
      return { message: 'Add or cancel the action you started writing.', section: 'recommendation' };
    }
    if (!f.nextContactDate && !f.noNextContactRequired) {
      return { message: 'Enter the next contact date, or tick "No next contact needed".', section: 'next' };
    }
    if (!f.adviceType && (f.afaContactMethod || f.afaNotes.trim())) {
      return { message: 'Choose the type of advice given, or clear the AFA section.', section: 'afa' };
    }
    if (f.adviceType && !f.afaContactMethod) {
      return { message: 'Choose how the AFA advice was given.', section: 'afa' };
    }
    return null;
  }

  /** `auto` is a silent background save; `after` runs once it succeeds (closing the popup). */
  private persist(mode: 'draft' | 'submit' | 'auto', after?: () => void): void {
    if (this.saving()) return;
    const submit = mode === 'submit';
    const input = this.toInput();
    const snapshot = this.snapshot();
    this.saving.set(mode);
    if (mode !== 'auto') this.saveError.set(null);

    const id = this.noteId();
    const request$: Observable<string | null> = id
      ? this.guestsApi.updateCaseworkNote(this.guestId(), id, input, submit).pipe(map(() => null))
      : this.guestsApi.saveCaseworkNote(this.guestId(), input, submit).pipe(map((res) => res.id));

    request$.subscribe({
      next: (createdId) => {
        // Keeping the new id means the next save updates this draft instead of adding another.
        if (createdId) this.noteId.set(createdId);
        this.saving.set(null);
        this.savedSnapshot = snapshot;
        this.lastSavedAt.set(new Date().toISOString());
        this.saved.emit(submit);
        after?.();
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(null);
        const fallback = submit
          ? 'Could not submit this note. Please try again.'
          : mode === 'auto'
            ? 'Auto-save failed — use "Save as draft" to try again.'
            : 'Could not save this draft. Please try again.';
        this.saveError.set(this.problemDetail(err) ?? fallback);
      },
    });
  }

  private toInput(): CaseworkNoteInput {
    const f = this.form;
    const hasAfa = !!f.adviceType;
    const riskNotesApply = f.riskCheck !== null && f.riskCheck !== 'NoneApply';
    return {
      category: 'Casework',
      contactMethod: f.contactMethod as ContactType,
      // Date-only field: midday local keeps the note on the chosen day in every timezone.
      occurredAt: new Date(`${f.occurredOn}T12:00:00`).toISOString(),
      situation: this.trimmed(f.situation),
      background: this.trimmed(f.background),
      guestReportedChanges: this.trimmed(f.guestReportedChanges),
      serviceInvolvementChanges: this.trimmed(f.serviceInvolvementChanges),
      assessment: this.trimmed(f.assessment),
      recommendation: this.trimmed(f.recommendation),
      // The server derives the level from the risk check; this is only its fallback.
      riskLevel: 'NoRiskDetected',
      riskCheck: f.riskCheck,
      riskNotes: riskNotesApply ? this.trimmed(f.riskNotes) : null,
      isCpnContact: false,
      cpnSessionType: null,
      nextContactDate: f.noNextContactRequired ? null : f.nextContactDate || null,
      noNextContactRequired: f.noNextContactRequired,
      mdtDiscussionRequested: false,
      cpnReferralRequested: false,
      actions: this.newActions.map((a) => ({ description: a.description, dueDate: a.dueDate, assignedToStaffId: null })),
      completedActionIds: [...this.ticked()],
      adviceType: hasAfa ? f.adviceType : null,
      afaContactMethod: hasAfa && f.afaContactMethod ? f.afaContactMethod : null,
      additionalNotes: this.trimmed(f.afaNotes),
    };
  }

  /**
   * What a save would send, minus the new-action rows' keys — compared against the last save so
   * autosave and close only write when something changed. New actions are not stored on a draft
   * (they become guest actions on submit), so they do not make the note dirty either.
   */
  private snapshot(): string {
    const input = this.toInput();
    return JSON.stringify({ ...input, actions: [] });
  }

  private trimmed(value: string): string | null {
    const text = value.trim();
    return text ? text : null;
  }

  /** ProblemDetails bodies carry the useful message in `detail`. */
  private problemDetail(err: HttpErrorResponse): string | null {
    const body = err?.error as { detail?: unknown; errors?: Record<string, string[]> } | null;
    if (typeof body?.detail === 'string' && body.detail.trim()) return body.detail;
    const first = body?.errors ? Object.values(body.errors).flat()[0] : null;
    return typeof first === 'string' && first.trim() ? first : null;
  }
}

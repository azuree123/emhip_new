import { Component, EventEmitter, Output, computed, effect, inject, input, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import {
  GuestInitialConversationDto,
  GuestOverviewDto,
  GuestPathway,
  InitialConversationActionInput,
} from '../../core/api-models';
import { GuestsApiService } from '../../core/guests-api.service';
import { StaffPickerComponent } from '../../shared/staff-picker.component';
import { formatDate, formatDateTime, statusChip } from './guest-workspace.util';

interface PathwayOption {
  key: GuestPathway;
  label: string;
  /** Long-form label for the record form's option cards. */
  formLabel: string;
  description: string;
}

/** One "Actions arising" row; `key` keeps @for tracking stable across removals. */
interface ActionRow {
  key: number;
  description: string;
  dueDate: string;
}

/** Local (not UTC) yyyy-MM-dd, so "today" matches the worker's calendar day. */
function isoToday(): string {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/**
 * Initial Conversation tab — two states, both pixel-sourced from the bundle:
 * - Completed: GuestInitialConversationTab (Components.bundle.js 18990-21382) — a locked,
 *   read-only intake record ("Who conducted it", "What the guest presented with", "Pathway
 *   decision at intake", "Record status") under a "Permanent record" banner.
 * - Not completed: GuestInitialConversationNotCompleted (21382-22923) — an amber notice, an
 *   empty-state panel and a "Start Initial Conversation" action that opens the record form
 *   (the API returns 404 until a conversation is recorded).
 *
 * The record form carries the full spec §4.2 field set: presenting issues and notes, the
 * mandatory immediate-risk Yes/No (a Yes raises the guest's urgent flag server-side), the
 * mandatory pathway decision plus the AFA checkbox, and — for the two one-to-one pathways
 * (Mental Wellbeing and Clinical Support) — a named CMHW and a next contact date. Actions
 * arising are captured as repeatable description + due date rows. The server enforces all of
 * these and answers with ProblemDetails; every rule is mirrored here as a field-level message
 * so the worker sees the problem before they submit rather than after.
 *
 * Honest-data notes: the bundle's "Job title", "Place of interview", interview time range and
 * the audit trail have no backing fields on GuestInitialConversationDto and are omitted, as is
 * "Schedule for Later" (no endpoint). The completed view's pathway tiles reflect
 * overview.pathway (the guest's real allocation) — the DTO does not echo back the decision
 * fields the form posts.
 */
@Component({
  selector: 'app-guest-initial-conversation-tab',
  standalone: true,
  imports: [FormsModule, StaffPickerComponent],
  templateUrl: './guest-initial-conversation-tab.component.html',
  styleUrl: './guest-initial-conversation-tab.component.scss',
})
export class GuestInitialConversationTabComponent {
  private readonly guestsApi = inject(GuestsApiService);

  readonly guestId = input.required<string>();
  /** Pathway allocation / status / CMHW context from the workspace (optional so the tab
   *  still renders without the shell). */
  readonly overview = input<GuestOverviewDto | null>(null);
  /** Recording the conversation moves the guest on (New → Active) and can raise the urgent flag. */
  @Output() readonly refresh = new EventEmitter<void>();

  readonly conversation = signal<GuestInitialConversationDto | null>(null);
  /** True when the API answered 404 — the conversation has simply not happened yet. */
  readonly notCompleted = signal(false);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  // --- Record form state (not-completed state only) ---
  readonly showForm = signal(false);
  readonly submitting = signal(false);
  readonly submitError = signal<string | null>(null);
  /** Set on the first submit attempt so field errors stay hidden until the worker tries. */
  readonly submitted = signal(false);

  readonly presentingIssues = signal('');
  readonly notes = signal('');
  readonly consentConfirmed = signal(false);
  /** null = not answered yet; the API needs a real Yes/No. */
  readonly immediateRisk = signal<boolean | null>(null);
  readonly selectedPathway = signal<GuestPathway | null>(null);
  readonly afaSupportNeeded = signal(false);
  readonly assignedCmhwId = signal<string | null>(null);
  readonly nextContactDate = signal('');
  readonly actions = signal<ActionRow[]>([]);
  private nextActionKey = 1;

  readonly today = isoToday();

  readonly pathwayOptions: PathwayOption[] = [
    {
      key: 'MentalWellbeing',
      label: 'Wellbeing',
      formLabel: 'Mental Wellbeing',
      description: 'Early intervention and general wellbeing support.',
    },
    {
      key: 'ClinicalSupport',
      label: 'Clinical',
      formLabel: 'Clinical Support',
      description: 'Intense support for complex mental health needs.',
    },
    {
      key: 'CommunityRecovery',
      label: 'Recovery',
      formLabel: 'Community Recovery',
      description: 'Community-focused recovery and group support.',
    },
  ];

  readonly currentPathway = computed(() => this.overview()?.pathway ?? null);
  readonly guestStatusChip = computed(() => {
    const o = this.overview();
    return o ? statusChip(o.status) : null;
  });
  readonly guestFirstName = computed(() => this.overview()?.firstName ?? 'This guest');

  /** Wellbeing and Clinical are one-to-one pathways: both need a named worker and a next date. */
  readonly needsNamedWorker = computed(() => {
    const pathway = this.selectedPathway();
    return pathway === 'MentalWellbeing' || pathway === 'ClinicalSupport';
  });

  // ---- Client-side mirror of the server's §4.2 rules ----

  readonly riskFieldError = computed(() =>
    this.immediateRisk() === null ? 'Record whether there is an immediate risk.' : null,
  );

  readonly pathwayFieldError = computed(() =>
    this.selectedPathway() ? null : 'Choose the pathway agreed at this conversation.',
  );

  readonly cmhwFieldError = computed(() => {
    if (!this.needsNamedWorker()) return null;
    return this.assignedCmhwId() ? null : 'This pathway needs a named CMHW.';
  });

  readonly nextContactFieldError = computed(() => {
    if (!this.needsNamedWorker()) return null;
    const value = this.nextContactDate();
    if (!value) return 'This pathway needs a next contact date.';
    if (value < this.today) return 'The next contact date cannot be in the past.';
    return null;
  });

  readonly consentFieldError = computed(() =>
    this.consentConfirmed() ? null : 'Consent must be confirmed before the record can be completed.',
  );

  /** Half-filled action rows are a mistake worth flagging; wholly blank ones are dropped. */
  readonly actionsFieldError = computed(() => {
    const partial = this.actions().some((a) => {
      const described = a.description.trim().length > 0;
      return described !== !!a.dueDate;
    });
    return partial ? 'Every action needs both a description and a due date.' : null;
  });

  readonly formValid = computed(
    () =>
      !this.riskFieldError() &&
      !this.pathwayFieldError() &&
      !this.cmhwFieldError() &&
      !this.nextContactFieldError() &&
      !this.consentFieldError() &&
      !this.actionsFieldError(),
  );

  readonly formatDate = formatDate;
  readonly formatDateTime = formatDateTime;

  constructor() {
    effect((onCleanup) => {
      const id = this.guestId();
      let cancelled = false;
      onCleanup(() => (cancelled = true));
      this.load(id, () => cancelled);
    });
  }

  private load(guestId: string, isCancelled: () => boolean): void {
    this.loading.set(true);
    this.error.set(null);
    this.notCompleted.set(false);
    this.guestsApi.getInitialConversation(guestId).subscribe({
      next: (dto) => {
        if (isCancelled()) return;
        this.conversation.set(dto);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        if (isCancelled()) return;
        if (err.status === 404) {
          this.notCompleted.set(true);
        } else {
          this.error.set('Could not load the initial conversation record.');
        }
        this.loading.set(false);
      },
    });
  }

  startConversation(): void {
    this.submitError.set(null);
    this.submitted.set(false);
    this.presentingIssues.set('');
    this.notes.set('');
    this.consentConfirmed.set(false);
    this.immediateRisk.set(null);
    // Pre-select the guest's live allocation when there is one — intake usually confirms it.
    this.selectedPathway.set(this.currentPathway());
    this.afaSupportNeeded.set(this.overview()?.afaSupportNeeded ?? false);
    this.assignedCmhwId.set(null);
    this.nextContactDate.set('');
    this.actions.set([]);
    this.showForm.set(true);
  }

  cancelForm(): void {
    this.showForm.set(false);
    this.submitError.set(null);
  }

  setImmediateRisk(value: boolean): void {
    this.immediateRisk.set(value);
  }

  selectPathway(pathway: GuestPathway): void {
    this.selectedPathway.set(pathway);
  }

  addActionRow(): void {
    this.actions.update((rows) => [...rows, { key: this.nextActionKey++, description: '', dueDate: '' }]);
  }

  removeActionRow(key: number): void {
    this.actions.update((rows) => rows.filter((r) => r.key !== key));
  }

  setActionDescription(key: number, description: string): void {
    this.actions.update((rows) => rows.map((r) => (r.key === key ? { ...r, description } : r)));
  }

  setActionDueDate(key: number, dueDate: string): void {
    this.actions.update((rows) => rows.map((r) => (r.key === key ? { ...r, dueDate } : r)));
  }

  submit(): void {
    this.submitted.set(true);
    const pathway = this.selectedPathway();
    const immediateRisk = this.immediateRisk();
    if (!this.formValid() || !pathway || immediateRisk === null || this.submitting()) return;

    const actions: InitialConversationActionInput[] = this.actions()
      .filter((a) => a.description.trim() && a.dueDate)
      .map((a) => ({ description: a.description.trim(), dueDate: a.dueDate }));

    // Only the one-to-one pathways carry a worker and a next date — sending them for Community
    // Recovery would record an allocation the conversation never agreed.
    const oneToOne = this.needsNamedWorker();

    this.submitting.set(true);
    this.submitError.set(null);
    this.guestsApi
      .recordInitialConversation(this.guestId(), {
        presentingIssues: this.presentingIssues().trim() || null,
        notes: this.notes().trim() || null,
        consentConfirmed: this.consentConfirmed(),
        immediateRisk,
        pathway,
        afaSupportNeeded: this.afaSupportNeeded(),
        assignedCmhwId: oneToOne ? this.assignedCmhwId() : null,
        nextContactDate: oneToOne ? this.nextContactDate() || null : null,
        actions: actions.length ? actions : null,
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.showForm.set(false);
          this.load(this.guestId(), () => false);
          this.refresh.emit();
        },
        error: (err: HttpErrorResponse) => {
          this.submitting.set(false);
          this.submitError.set(
            this.problemDetail(err) ?? 'Could not save the initial conversation. Please try again.',
          );
        },
      });
  }

  /** ProblemDetails bodies carry the useful message in `detail`. */
  private problemDetail(err: HttpErrorResponse): string | null {
    const body = err?.error as { detail?: unknown } | null;
    return typeof body?.detail === 'string' && body.detail.trim() ? body.detail : null;
  }
}

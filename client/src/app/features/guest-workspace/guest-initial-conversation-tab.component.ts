import { Component, EventEmitter, Output, computed, effect, inject, input, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { GuestInitialConversationDto, GuestOverviewDto, GuestPathway } from '../../core/api-models';
import { GuestsApiService } from '../../core/guests-api.service';
import { formatDate, formatDateTime, statusChip } from './guest-workspace.util';

interface PathwayOption {
  key: GuestPathway;
  label: string;
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
 * Honest-data notes: the bundle's "Job title", "Place of interview", interview time range,
 * "Risk at intake", "Next contact agreed", "Pathway recorded" timestamp and the audit trail
 * have no backing fields on GuestInitialConversationDto and are omitted. The pathway tiles
 * reflect overview.pathway (the guest's real allocation); "Schedule for Later" from the
 * bundle has no backing endpoint and is omitted.
 */
@Component({
  selector: 'app-guest-initial-conversation-tab',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './guest-initial-conversation-tab.component.html',
  styleUrl: './guest-initial-conversation-tab.component.scss',
})
export class GuestInitialConversationTabComponent {
  private readonly guestsApi = inject(GuestsApiService);

  readonly guestId = input.required<string>();
  /** Pathway allocation / status / CMHW context from the workspace (optional so the tab
   *  still renders without the shell). */
  readonly overview = input<GuestOverviewDto | null>(null);
  /** Recording the conversation can flip the guest's status (PendingConversation → Active). */
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
  presentingIssues = '';
  notes = '';
  consentConfirmed = false;

  readonly pathwayOptions: PathwayOption[] = [
    { key: 'MentalWellbeing', label: 'Wellbeing' },
    { key: 'ClinicalSupport', label: 'Clinical' },
    { key: 'CommunityRecovery', label: 'Recovery' },
  ];

  readonly currentPathway = computed(() => this.overview()?.pathway ?? null);
  readonly guestStatusChip = computed(() => {
    const o = this.overview();
    return o ? statusChip(o.status) : null;
  });
  readonly guestFirstName = computed(() => this.overview()?.firstName ?? 'This guest');

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
    this.showForm.set(true);
  }

  cancelForm(): void {
    this.showForm.set(false);
    this.submitError.set(null);
  }

  submit(): void {
    if (!this.consentConfirmed || this.submitting()) return;
    this.submitting.set(true);
    this.submitError.set(null);
    this.guestsApi
      .recordInitialConversation(this.guestId(), {
        presentingIssues: this.presentingIssues || null,
        notes: this.notes || null,
        consentConfirmed: this.consentConfirmed,
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.showForm.set(false);
          this.load(this.guestId(), () => false);
          this.refresh.emit();
        },
        error: () => {
          this.submitting.set(false);
          this.submitError.set('Could not save the initial conversation. Please try again.');
        },
      });
  }
}

import { Component, EventEmitter, Output, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GuestClinicalDto, RecordRiskAssessmentRequest } from '../../core/api-models';
import { GuestsApiService } from '../../core/guests-api.service';
import { formatDateTime } from './guest-workspace.util';

/**
 * Risk-assessment history panel — a clean list over GuestClinicalDto's versioned history,
 * plus a form to record a new assessment across the five risk flags (suicidal ideation,
 * self-harm, risk to others, severe deterioration, safeguarding concern).
 *
 * Superseded by GuestClinicalDetailsTabComponent (emhip-guest-clinical-details-tab), the
 * pixel-sourced Clinical Details tab that embeds the same risk form inside its
 * "Risk & complexity" card; keep this component only while the shell still routes the
 * legacy "Clinical" tab here.
 */
@Component({
  selector: 'app-guest-clinical-tab',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './guest-clinical-tab.component.html',
  styleUrl: './guest-clinical-tab.component.scss',
})
export class GuestClinicalTabComponent {
  private readonly guestsApi = inject(GuestsApiService);

  readonly guestId = input.required<string>();
  /** When true (header "Raise urgent flag" button), the risk-assessment form starts expanded. */
  readonly openForm = input(false);
  @Output() readonly refresh = new EventEmitter<void>();

  readonly clinical = signal<GuestClinicalDto | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly showForm = signal(false);
  readonly submitting = signal(false);
  readonly submitError = signal<string | null>(null);

  readonly formatDateTime = formatDateTime;

  form: RecordRiskAssessmentRequest = this.emptyForm();

  constructor() {
    effect((onCleanup) => {
      const id = this.guestId();
      let cancelled = false;
      onCleanup(() => (cancelled = true));
      this.load(id, () => cancelled);
    });
    effect(() => {
      if (this.openForm()) this.showForm.set(true);
    });
  }

  private emptyForm(): RecordRiskAssessmentRequest {
    return {
      suicidalIdeation: false,
      selfHarm: false,
      riskToOthers: false,
      severeDeterioration: false,
      safeguardingConcern: false,
      notes: null,
    };
  }

  private load(guestId: string, isCancelled: () => boolean): void {
    this.loading.set(true);
    this.error.set(null);
    this.guestsApi.getClinical(guestId).subscribe({
      next: (dto) => {
        if (isCancelled()) return;
        this.clinical.set(dto);
        this.loading.set(false);
      },
      error: () => {
        if (isCancelled()) return;
        this.error.set('Could not load clinical history for this guest.');
        this.loading.set(false);
      },
    });
  }

  toggleForm(): void {
    this.showForm.update((v) => !v);
    this.form = this.emptyForm();
    this.submitError.set(null);
  }

  submit(): void {
    this.submitting.set(true);
    this.submitError.set(null);
    this.guestsApi.recordRiskAssessment(this.guestId(), this.form).subscribe({
      next: () => {
        this.submitting.set(false);
        this.showForm.set(false);
        this.load(this.guestId(), () => false);
        this.refresh.emit();
      },
      error: () => {
        this.submitting.set(false);
        this.submitError.set('Could not record this assessment. Please try again.');
      },
    });
  }

  hasAnyFlag(a: { suicidalIdeation: boolean; selfHarm: boolean; riskToOthers: boolean; severeDeterioration: boolean; safeguardingConcern: boolean }): boolean {
    return a.suicidalIdeation || a.selfHarm || a.riskToOthers || a.severeDeterioration || a.safeguardingConcern;
  }
}

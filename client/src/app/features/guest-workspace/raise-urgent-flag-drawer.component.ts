import { Component, EventEmitter, HostListener, Output, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RecordRiskAssessmentRequest } from '../../core/api-models';
import { GuestsApiService } from '../../core/guests-api.service';
import { formatDate } from './guest-workspace.util';

type RiskFlagKey = 'suicidalIdeation' | 'selfHarm' | 'riskToOthers' | 'severeDeterioration' | 'safeguardingConcern' | 'otherRisk';

interface RiskFlagOption {
  key: RiskFlagKey;
  label: string;
  bg: string;
  fg: string;
}

/** Same labels and pill colours as the Urgent Cases list, so a flag reads the same on both screens. */
const RISK_FLAGS: RiskFlagOption[] = [
  { key: 'suicidalIdeation', label: 'Suicidal Ideation', bg: 'rgb(255,237,237)', fg: 'rgb(225,38,40)' },
  { key: 'selfHarm', label: 'Self Harm', bg: 'rgb(255,237,213)', fg: 'rgb(194,65,12)' },
  { key: 'riskToOthers', label: 'Risk to Others', bg: 'rgb(243,232,255)', fg: 'rgb(126,34,206)' },
  { key: 'severeDeterioration', label: 'Severe Deterioration', bg: 'rgb(255,249,228)', fg: 'rgb(157,133,45)' },
  { key: 'safeguardingConcern', label: 'Safeguarding Concern', bg: 'rgb(236,242,255)', fg: 'rgb(52,91,177)' },
  { key: 'otherRisk', label: 'Other', bg: 'rgb(240,240,240)', fg: 'rgb(70,70,70)' },
];

/**
 * "Raise Urgent Case" quick popup — a right-hand drawer opened from the Guest Workspace header,
 * and the only place staff raise an urgent case (the Clinical Details form was removed in Oct
 * 2026 so there is one route in). It records a risk assessment with the ticked risks
 * (POST guests/{id}/risk-assessments), which puts the guest on the Urgent Cases dashboard and
 * opens (or adds to) their urgent case — so the risk history and the Urgent Case Record stay one
 * record. Notes are compulsory, and "Other" needs a description of the risk; the API enforces both.
 */
@Component({
  selector: 'emhip-raise-urgent-flag-drawer',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './raise-urgent-flag-drawer.component.html',
  styleUrl: './raise-urgent-flag-drawer.component.scss',
})
export class RaiseUrgentFlagDrawerComponent {
  private readonly guestsApi = inject(GuestsApiService);

  readonly guestId = input.required<string>();
  readonly guestName = input.required<string>();
  readonly guestRef = input<string | null>(null);
  /** When the guest already has an open episode, a new flag adds to it rather than starting one. */
  readonly urgentSince = input<string | null>(null);
  readonly alreadyUrgent = input(false);

  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly raised = new EventEmitter<void>();

  readonly flags = RISK_FLAGS;
  readonly selected = signal<ReadonlySet<RiskFlagKey>>(new Set());
  /** Signals so canSubmit() re-evaluates as the worker types. */
  readonly notes = signal('');
  readonly otherDetails = signal('');

  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  readonly otherSelected = computed(() => this.selected().has('otherRisk'));
  readonly canSubmit = computed(
    () =>
      this.selected().size > 0 &&
      this.notes().trim().length > 0 &&
      (!this.otherSelected() || this.otherDetails().trim().length > 0) &&
      !this.saving(),
  );
  /** Nothing typed or ticked yet — only then may a backdrop click close the drawer. */
  readonly pristine = computed(() => this.selected().size === 0 && !this.notes().trim() && !this.otherDetails().trim());
  readonly urgentSinceLabel = computed(() => formatDate(this.urgentSince()));

  isSelected(key: RiskFlagKey): boolean {
    return this.selected().has(key);
  }

  toggle(key: RiskFlagKey): void {
    this.selected.update((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    this.error.set(null);
  }

  @HostListener('document:keydown.escape')
  close(): void {
    if (this.saving()) return;
    this.closed.emit();
  }

  submit(): void {
    if (this.saving()) return;
    const chosen = this.selected();
    if (chosen.size === 0) {
      this.error.set('Select at least one risk to raise the urgent case.');
      return;
    }
    const otherDetails = this.otherDetails().trim();
    if (chosen.has('otherRisk') && !otherDetails) {
      this.error.set("Describe the risk you selected as 'Other'.");
      return;
    }
    const notes = this.notes().trim();
    if (!notes) {
      this.error.set('Urgent case notes are required — describe what happened before raising the case.');
      return;
    }
    const request: RecordRiskAssessmentRequest = {
      suicidalIdeation: chosen.has('suicidalIdeation'),
      selfHarm: chosen.has('selfHarm'),
      riskToOthers: chosen.has('riskToOthers'),
      severeDeterioration: chosen.has('severeDeterioration'),
      safeguardingConcern: chosen.has('safeguardingConcern'),
      otherRisk: chosen.has('otherRisk'),
      otherRiskDetails: chosen.has('otherRisk') ? otherDetails : null,
      notes,
    };
    this.saving.set(true);
    this.error.set(null);
    this.guestsApi.recordRiskAssessment(this.guestId(), request).subscribe({
      next: () => {
        this.saving.set(false);
        this.raised.emit();
      },
      error: () => {
        this.saving.set(false);
        this.error.set('Could not raise the urgent case. Please try again.');
      },
    });
  }
}

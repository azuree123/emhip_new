import { Component, EventEmitter, Output, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import {
  ClinicalProfileDto,
  GuestClinicalDto,
  RecordRiskAssessmentRequest,
  RiskAssessmentDto,
  UpdateClinicalProfileRequest,
} from '../../core/api-models';
import { GuestsApiService } from '../../core/guests-api.service';
import { formatDate } from './guest-workspace.util';

/**
 * Clinical Details tab — pixel-sourced from GuestClinicalDetailsTab in
 * project/screens/Components.bundle.js (lines 22923–24837): two columns of white cards —
 * "Presenting problem", "Mental health history" and "Medication" on the left;
 * "Current service involvement" and "Risk & complexity" on the right, the latter closing
 * with the green/red "Last risk assessment" banner. Data comes from the versioned clinical
 * profile (getClinicalProfile) plus the risk-assessment history (getClinical); the
 * risk-assessment form lives inside the "Risk & complexity" card so the header's
 * "Raise Urgent Flag" action can deep-link into it via the openForm input.
 */
@Component({
  selector: 'emhip-guest-clinical-details-tab',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './guest-clinical-details-tab.component.html',
  styleUrl: './guest-clinical-details-tab.component.scss',
})
export class GuestClinicalDetailsTabComponent {
  private readonly guestsApi = inject(GuestsApiService);

  readonly guestId = input.required<string>();
  /** When true (header "Raise Urgent Flag" button), the risk-assessment form starts expanded. */
  readonly openForm = input(false);
  @Output() readonly refresh = new EventEmitter<void>();

  readonly profile = signal<ClinicalProfileDto | null>(null);
  readonly clinical = signal<GuestClinicalDto | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly editing = signal(false);
  readonly savingProfile = signal(false);
  readonly profileError = signal<string | null>(null);

  readonly showRiskForm = signal(false);
  readonly savingRisk = signal(false);
  readonly riskError = signal<string | null>(null);

  readonly formatDate = formatDate;

  profileForm: UpdateClinicalProfileRequest = this.emptyProfileForm();
  riskForm: RecordRiskAssessmentRequest = this.emptyRiskForm();

  constructor() {
    effect((onCleanup) => {
      const id = this.guestId();
      let cancelled = false;
      onCleanup(() => (cancelled = true));
      this.load(id, () => cancelled);
    });
    effect(() => {
      if (this.openForm()) this.showRiskForm.set(true);
    });
  }

  private emptyProfileForm(): UpdateClinicalProfileRequest {
    return {
      previousMhDiagnosis: false,
      diagnosisGroups: null,
      presentingProblem: null,
      pastMhDifficulties: null,
      familyMhHistory: null,
      longTermHealthCondition: null,
      physicalIllness: null,
      currentMedications: null,
      mhTeamClinician: null,
      socialServicesCoordinator: null,
      cpnInvolved: false,
      trustInvolvement: false,
      smiIndicator: false,
    };
  }

  private emptyRiskForm(): RecordRiskAssessmentRequest {
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
    forkJoin({
      profile: this.guestsApi.getClinicalProfile(guestId),
      clinical: this.guestsApi.getClinical(guestId),
    }).subscribe({
      next: ({ profile, clinical }) => {
        if (isCancelled()) return;
        this.profile.set(profile);
        this.clinical.set(clinical);
        this.loading.set(false);
      },
      error: () => {
        if (isCancelled()) return;
        this.error.set('Could not load clinical details for this guest.');
        this.loading.set(false);
      },
    });
  }

  /** Latest assessment by version — the API does not guarantee ordering. */
  latestAssessment(): RiskAssessmentDto | null {
    const history = this.clinical()?.history ?? [];
    if (!history.length) return null;
    return history.reduce((a, b) => (b.version > a.version ? b : a));
  }

  hasAnyFlag(a: RiskAssessmentDto): boolean {
    return a.suicidalIdeation || a.selfHarm || a.riskToOthers || a.severeDeterioration || a.safeguardingConcern;
  }

  latestHasFlags(): boolean {
    const latest = this.latestAssessment();
    return latest !== null && this.hasAnyFlag(latest);
  }

  /** "Urgent episodes" — lifetime count of assessments that carried at least one flag. */
  urgentEpisodeCount(): number {
    return (this.clinical()?.history ?? []).filter((a) => this.hasAnyFlag(a)).length;
  }

  toggleEdit(): void {
    if (this.editing()) {
      this.editing.set(false);
      return;
    }
    const p = this.profile();
    if (!p) return;
    this.profileForm = {
      previousMhDiagnosis: p.previousMhDiagnosis,
      diagnosisGroups: p.diagnosisGroups,
      presentingProblem: p.presentingProblem,
      pastMhDifficulties: p.pastMhDifficulties,
      familyMhHistory: p.familyMhHistory,
      longTermHealthCondition: p.longTermHealthCondition,
      physicalIllness: p.physicalIllness,
      currentMedications: p.currentMedications,
      mhTeamClinician: p.mhTeamClinician,
      socialServicesCoordinator: p.socialServicesCoordinator,
      cpnInvolved: p.cpnInvolved,
      trustInvolvement: p.trustInvolvement,
      smiIndicator: p.smiIndicator,
    };
    this.profileError.set(null);
    this.editing.set(true);
  }

  saveProfile(): void {
    this.savingProfile.set(true);
    this.profileError.set(null);
    this.guestsApi.updateClinicalProfile(this.guestId(), this.profileForm).subscribe({
      next: () => {
        this.savingProfile.set(false);
        this.editing.set(false);
        this.load(this.guestId(), () => false);
        this.refresh.emit();
      },
      error: () => {
        this.savingProfile.set(false);
        this.profileError.set('Could not save the clinical details. Please try again.');
      },
    });
  }

  toggleRiskForm(): void {
    this.showRiskForm.update((v) => !v);
    this.riskForm = this.emptyRiskForm();
    this.riskError.set(null);
  }

  saveRisk(): void {
    this.savingRisk.set(true);
    this.riskError.set(null);
    this.guestsApi.recordRiskAssessment(this.guestId(), this.riskForm).subscribe({
      next: () => {
        this.savingRisk.set(false);
        this.showRiskForm.set(false);
        this.riskForm = this.emptyRiskForm();
        this.load(this.guestId(), () => false);
        this.refresh.emit();
      },
      error: () => {
        this.savingRisk.set(false);
        this.riskError.set('Could not record this assessment. Please try again.');
      },
    });
  }
}

import { Component, EventEmitter, Output, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  ClinicalProfileDto,
  GuestClinicalDto,
  RiskAssessmentDto,
  UpdateClinicalProfileRequest,
  UrgentEpisodeSummaryDto,
} from '../../core/api-models';
import { GuestsApiService } from '../../core/guests-api.service';
import { UrgentCasesApiService } from '../../core/urgent-cases-api.service';
import { formatDate, formatDateTime } from './guest-workspace.util';

/**
 * Clinical Details tab — pixel-sourced from GuestClinicalDetailsTab in
 * project/screens/Components.bundle.js (lines 22923–24837): two columns of white cards —
 * "Presenting problem", "Mental health history" and "Medication" on the left;
 * "Current service involvement" and "Risk & complexity" on the right, the latter closing
 * with the green/red "Last risk assessment" banner. Data comes from the versioned clinical
 * profile (getClinicalProfile) plus the risk-assessment history (getClinical).
 *
 * Urgent cases are raised only from the header's "Raise Urgent Case" popup, which starts the
 * 72-hour clock; this tab used to carry its own risk-assessment form, removed in Oct 2026 so
 * there is one route in. "Immediate risk flag" is read-only here: it shows whether an urgent case
 * is open and when it was raised (or when the last one was). Raising one bumps reloadToken so
 * this tab re-reads it.
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
  private readonly urgentApi = inject(UrgentCasesApiService);

  readonly guestId = input.required<string>();
  /** Bumped by the workspace when the header's "Raise Urgent Flag" popup records an assessment. */
  readonly reloadToken = input(0);
  /** From the workspace overview: an urgent case is open, and since when. */
  readonly isUrgent = input(false);
  readonly urgentSince = input<string | null>(null);
  @Output() readonly refresh = new EventEmitter<void>();

  readonly profile = signal<ClinicalProfileDto | null>(null);
  readonly clinical = signal<GuestClinicalDto | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly editing = signal(false);
  readonly savingProfile = signal(false);
  readonly profileError = signal<string | null>(null);

  /** The guest's urgent cases; null when they could not be read (e.g. no urgent-cases access). */
  readonly urgentCases = signal<UrgentEpisodeSummaryDto[] | null>(null);

  readonly formatDate = formatDate;
  readonly formatDateTime = formatDateTime;

  profileForm: UpdateClinicalProfileRequest = this.emptyProfileForm();

  /** "Immediate risk flag" (read-only): the open urgent case, else the most recent one. */
  readonly immediateRisk = computed<{ tone: 'risk' | 'ok' | 'muted'; text: string; detail: string | null }>(() => {
    const cases = this.urgentCases() ?? [];
    const latest = cases.length ? cases[cases.length - 1] : null;
    if (this.isUrgent()) {
      const raisedAt = this.urgentSince() ?? latest?.raisedAt ?? null;
      return { tone: 'risk', text: 'Yes — urgent case open', detail: raisedAt ? `Raised ${formatDateTime(raisedAt)}` : null };
    }
    if (latest) {
      return {
        tone: 'ok',
        text: 'No open urgent case',
        detail: `Last raised ${formatDateTime(latest.raisedAt)}${latest.resolvedAt ? ` · resolved ${formatDate(latest.resolvedAt)}` : ''}`,
      };
    }
    const flagged = this.lastFlaggedAssessment();
    return flagged
      ? { tone: 'ok', text: 'No open urgent case', detail: `Last raised ${formatDateTime(flagged.assessedAt)}` }
      : { tone: 'muted', text: 'No urgent case raised', detail: null };
  });

  constructor() {
    effect((onCleanup) => {
      const id = this.guestId();
      this.reloadToken();
      let cancelled = false;
      onCleanup(() => (cancelled = true));
      this.load(id, () => cancelled);
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

  private load(guestId: string, isCancelled: () => boolean): void {
    this.loading.set(true);
    this.error.set(null);
    forkJoin({
      profile: this.guestsApi.getClinicalProfile(guestId),
      clinical: this.guestsApi.getClinical(guestId),
      // Optional: the risk history still answers the question if this read is not allowed.
      urgentCases: this.urgentApi.getEpisodes(guestId).pipe(catchError(() => of(null))),
    }).subscribe({
      next: ({ profile, clinical, urgentCases }) => {
        if (isCancelled()) return;
        this.profile.set(profile);
        this.clinical.set(clinical);
        this.urgentCases.set(urgentCases);
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
    return a.suicidalIdeation || a.selfHarm || a.riskToOthers || a.severeDeterioration || a.safeguardingConcern || a.otherRisk;
  }

  private lastFlaggedAssessment(): RiskAssessmentDto | null {
    const flagged = (this.clinical()?.history ?? []).filter((a) => this.hasAnyFlag(a));
    return flagged.length ? flagged.reduce((a, b) => (b.version > a.version ? b : a)) : null;
  }

  latestHasFlags(): boolean {
    const latest = this.latestAssessment();
    return latest !== null && this.hasAnyFlag(latest);
  }

  /** "Urgent cases" — lifetime count; falls back to flagged assessments when the cases can't be read. */
  urgentCaseCount(): number {
    const cases = this.urgentCases();
    return cases ? cases.length : (this.clinical()?.history ?? []).filter((a) => this.hasAnyFlag(a)).length;
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
}

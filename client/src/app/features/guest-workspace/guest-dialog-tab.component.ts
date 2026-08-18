import { Component, EventEmitter, Output, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogAssessmentDto, DialogScores, GuestDialogDto } from '../../core/api-models';
import { GuestsApiService } from '../../core/guests-api.service';
import { formatDate } from './guest-workspace.util';

/** The 11 DIALOG domains in the order the design table lists them. */
export interface DialogDomain {
  key: keyof DialogScores;
  label: string;
}

export const DIALOG_DOMAINS: DialogDomain[] = [
  { key: 'mentalHealth', label: 'Mental health' },
  { key: 'physicalHealth', label: 'Physical health' },
  { key: 'jobSituation', label: 'Job situation' },
  { key: 'accommodation', label: 'Accommodation' },
  { key: 'leisureActivities', label: 'Leisure activities' },
  { key: 'friendshipsSocialLife', label: 'Friendships & social life' },
  { key: 'relationshipWithFamily', label: 'Relationship with family' },
  { key: 'personalSafety', label: 'Personal safety' },
  { key: 'practicalHelp', label: 'Practical help' },
  { key: 'medication', label: 'Medication' },
  { key: 'meetingsWithMhStaff', label: 'Meetings with MH staff' },
];

/**
 * DIALOG Scores tab — pixel-sourced from GuestDIALOGTab in
 * project/screens/Components.bundle.js (lines 24837–27147): a blue info banner while only
 * the baseline exists, the "Score history" Domain/Baseline/Latest table (11 domains + a
 * bold Total row out of 77), and a right-hand column with the "Total DIALOG score" hero
 * card and the "Next DIALOG assessment due" card carrying the "Record new" action.
 */
@Component({
  selector: 'emhip-guest-dialog-tab',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './guest-dialog-tab.component.html',
  styleUrl: './guest-dialog-tab.component.scss',
})
export class GuestDialogTabComponent {
  private readonly guestsApi = inject(GuestsApiService);

  readonly guestId = input.required<string>();
  @Output() readonly refresh = new EventEmitter<void>();

  readonly dialog = signal<GuestDialogDto | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly showForm = signal(false);
  readonly submitting = signal(false);
  readonly submitError = signal<string | null>(null);

  readonly domains = DIALOG_DOMAINS;
  readonly scoreOptions = [1, 2, 3, 4, 5, 6, 7];
  readonly formatDate = formatDate;

  form: DialogScores = this.emptyForm();

  constructor() {
    effect((onCleanup) => {
      const id = this.guestId();
      let cancelled = false;
      onCleanup(() => (cancelled = true));
      this.load(id, () => cancelled);
    });
  }

  private emptyForm(): DialogScores {
    return {
      mentalHealth: 4,
      physicalHealth: 4,
      jobSituation: 4,
      accommodation: 4,
      leisureActivities: 4,
      friendshipsSocialLife: 4,
      relationshipWithFamily: 4,
      personalSafety: 4,
      practicalHelp: 4,
      medication: 4,
      meetingsWithMhStaff: 4,
    };
  }

  private load(guestId: string, isCancelled: () => boolean): void {
    this.loading.set(true);
    this.error.set(null);
    this.guestsApi.getDialog(guestId).subscribe({
      next: (dto) => {
        if (isCancelled()) return;
        this.dialog.set(dto);
        this.loading.set(false);
      },
      error: () => {
        if (isCancelled()) return;
        this.error.set('Could not load DIALOG assessments for this guest.');
        this.loading.set(false);
      },
    });
  }

  score(assessment: DialogAssessmentDto | null, key: keyof DialogScores): string {
    return assessment ? String(assessment[key]) : '-';
  }

  /** True while only the baseline exists — drives the blue comparison banner. */
  baselineOnly(): boolean {
    const d = this.dialog();
    return !!d?.baseline && (d.latest === null || d.latest.version === d.baseline.version);
  }

  /** The most recent assessment (latest, falling back to baseline) for the hero card. */
  current(): DialogAssessmentDto | null {
    const d = this.dialog();
    if (!d) return null;
    return this.baselineOnly() ? d.baseline : d.latest;
  }

  toggleForm(): void {
    this.showForm.update((v) => !v);
    this.form = this.emptyForm();
    this.submitError.set(null);
  }

  submit(): void {
    this.submitting.set(true);
    this.submitError.set(null);
    this.guestsApi.recordDialogAssessment(this.guestId(), this.form).subscribe({
      next: () => {
        this.submitting.set(false);
        this.showForm.set(false);
        this.load(this.guestId(), () => false);
        this.refresh.emit();
      },
      error: () => {
        this.submitting.set(false);
        this.submitError.set('Could not record this DIALOG assessment. Please try again.');
      },
    });
  }
}

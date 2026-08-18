import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

/**
 * The 11 DIALOG life areas in the Desktop80 row order, keyed by the camelCase DialogScores
 * fields (core/api-models.ts). `question` is the row text verbatim from the mock; `area` is
 * the short name used in summaries.
 */
export const DIALOG_DOMAINS = [
  { key: 'mentalHealth', sr: 1, area: 'Mental health', question: 'How satisfied are you with your mental health?' },
  { key: 'physicalHealth', sr: 2, area: 'Physical health', question: 'How satisfied are you with your Physical health' },
  { key: 'jobSituation', sr: 3, area: 'Job situation', question: 'How satisfied are you with your job situation?' },
  { key: 'accommodation', sr: 4, area: 'Accommodation', question: 'How satisfied are you with your accommodation?' },
  { key: 'leisureActivities', sr: 5, area: 'Leisure activities', question: 'How satisfied are you with your leisure?' },
  { key: 'friendshipsSocialLife', sr: 6, area: 'Friendships', question: 'How satisfied are you with your friendships?' },
  {
    key: 'relationshipWithFamily',
    sr: 7,
    area: 'Relationship with partner / family',
    question: 'How satisfied are you with your relationship with partner / family?',
  },
  { key: 'personalSafety', sr: 8, area: 'Personal safety', question: 'How satisfied are you with your personal safety?' },
  { key: 'medication', sr: 9, area: 'Medication', question: 'How satisfied are you with your medication?' },
  {
    key: 'practicalHelp',
    sr: 10,
    area: 'Practical help',
    question: 'How satisfied are you with the practical help you receive?',
  },
  {
    key: 'meetingsWithMhStaff',
    sr: 11,
    area: 'Meetings with MH professionals',
    question: 'How satisfied are you with meetings with mental health professionals?',
  },
] as const;

/**
 * Step 3 of the Register Guest wizard — "DIALOG scale", ported from the Desktop80 screen
 * (project/screens/Components.bundle.js lines 37844-42794): a gray header band (Sr / Life
 * area / the seven satisfaction labels / Score / Need help?), 11 rows of 1-7 score circles
 * (selected = rgb(201,167,35) with white digit), a rgb(247,247,247) results band (Total
 * score / 77 · Areas needing help · High concern ≤3 — auto-calculated as the mock's
 * annotation asks) and an additional-notes box.
 *
 * Honest-data notes: the 11 scores map 1:1 onto DialogScores (POST dialog-assessments). The
 * per-row "Need help?" toggle and the additional notes have no field on that endpoint, so
 * the wizard shell folds them into the initial-conversation notes instead.
 */
@Component({
  selector: 'app-dialog-step',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './dialog-step.component.html',
  styleUrls: ['./dialog-step.component.scss', './_form-shared.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogStepComponent {
  @Input({ required: true }) form!: FormGroup;

  protected readonly domains = DIALOG_DOMAINS;
  protected readonly scale = [1, 2, 3, 4, 5, 6, 7];
  protected readonly scaleLabels = [
    'totally dissatisfied',
    'very dissatisfied',
    'fairly dissatisfied',
    'in the middle',
    'fairly satisfied',
    'very satisfied',
    'totally satisfied',
  ];

  protected scoreOf(key: string): number | null {
    return this.form.get(['scores', key])?.value ?? null;
  }

  protected setScore(key: string, value: number): void {
    const control = this.form.get(['scores', key]);
    control?.setValue(value);
    control?.markAsTouched();
  }

  protected needHelpOf(key: string): boolean | null {
    return this.form.get(['needHelp', key])?.value ?? null;
  }

  protected setNeedHelp(key: string, value: boolean): void {
    this.form.get(['needHelp', key])?.setValue(value);
  }

  protected scoreMissing(key: string): boolean {
    const control = this.form.get(['scores', key]);
    return !!control && control.invalid && control.touched;
  }

  // ---- Auto-calculated results (per the mock's "Auto results calculate…" annotation) ----

  protected totalScore(): number {
    return DIALOG_DOMAINS.reduce((sum, d) => sum + (this.scoreOf(d.key) ?? 0), 0);
  }

  protected areasNeedingHelp(): number {
    return DIALOG_DOMAINS.filter((d) => this.needHelpOf(d.key) === true).length;
  }

  protected highConcern(): number {
    return DIALOG_DOMAINS.filter((d) => {
      const score = this.scoreOf(d.key);
      return score !== null && score <= 3;
    }).length;
  }

  protected pad(value: number): string {
    return value < 10 ? `0${value}` : `${value}`;
  }
}

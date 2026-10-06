import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  CarePlanDto,
  CarePlanGoalInput,
  CarePlanGoalStatus,
  CarePlanStatus,
  GuestCarePlansDto,
  SaveCarePlanRequest,
} from '../../core/api-models';
import { AuthService } from '../../core/auth.service';
import { GuestsApiService } from '../../core/guests-api.service';
import { Permissions } from '../../core/permissions';
import { StatusChip, formatDate, formatDateTime } from './guest-workspace.util';

const GOAL_STATUS_CHIPS: Record<CarePlanGoalStatus, StatusChip> = {
  NotStarted: { label: 'Not started', bg: '#f0f0f0', fg: '#646464' },
  InProgress: { label: 'In progress', bg: '#fff9e4', fg: '#9d852d' },
  Achieved: { label: 'Achieved', bg: '#eafdee', fg: '#147129' },
  Discontinued: { label: 'Discontinued', bg: '#ffeaec', fg: '#e12628' },
};

const PLAN_STATUS_CHIPS: Record<CarePlanStatus, StatusChip> = {
  Active: { label: 'Active', bg: '#eafdee', fg: '#147129' },
  Completed: { label: 'Completed', bg: '#f0f0f0', fg: '#646464' },
  Superseded: { label: 'Superseded', bg: '#f0f0f0', fg: '#646464' },
};

/** One row of the goal editor. `key` is client-side only — it keeps @for tracking stable
 *  while goals are reordered, so the bound inputs move with their row. */
interface GoalDraft {
  key: number;
  /** null for a goal that does not exist server-side yet — saved without an id. */
  id: string | null;
  description: string;
  status: CarePlanGoalStatus;
  targetDate: string;
  progressNote: string;
}

interface PlanForm {
  summary: string;
  guestVoice: string;
  supportArrangements: string;
  reviewDueOn: string;
  goals: GoalDraft[];
}

/**
 * Care Plan tab — the guest's single active care plan (summary, the guest's own words, the
 * agreed support arrangements and the goal list), with closed plans listed underneath as
 * read-only history.
 *
 * The API is a whole-plan PUT: saveCarePlan creates the plan when none exists and otherwise
 * updates the active one, and **goals left out of the request are deleted**, so the editor
 * always posts the full list. A goal's position in the array is its sort order, which is why
 * the editor offers move-up/move-down rather than a sortOrder field. Closed plans are refused
 * by the server on edit, so they render as history only — one collapsed row per plan (dates,
 * outcome, goal count, author) that expands to the full plan.
 *
 * Everything that writes is gated on guests.edit; without it the tab is a read-only view.
 */
@Component({
  selector: 'emhip-guest-care-plan-tab',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './guest-care-plan-tab.component.html',
  styleUrl: './guest-care-plan-tab.component.scss',
})
export class GuestCarePlanTabComponent {
  private readonly guestsApi = inject(GuestsApiService);
  private readonly auth = inject(AuthService);

  readonly guestId = input.required<string>();

  readonly canEdit = this.auth.hasPermission(Permissions.Guests.Edit);

  readonly plans = signal<GuestCarePlansDto | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly current = computed<CarePlanDto | null>(() => this.plans()?.current ?? null);
  readonly history = computed<CarePlanDto[]>(() => this.plans()?.history ?? []);
  /** Previous care plans opened in the accordion (several can be open to compare them). */
  readonly expandedHistory = signal<ReadonlySet<string>>(new Set());

  /** True while the inline editor is open — either for a brand-new plan or the active one. */
  readonly editing = signal(false);
  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);

  /** The close-plan confirmation strip. */
  readonly closingOpen = signal(false);
  readonly closing = signal(false);
  readonly closeError = signal<string | null>(null);

  readonly goalStatuses: CarePlanGoalStatus[] = ['NotStarted', 'InProgress', 'Achieved', 'Discontinued'];

  form: PlanForm = this.emptyForm();
  private nextGoalKey = 1;

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

  goalChip(status: CarePlanGoalStatus | string): StatusChip {
    return GOAL_STATUS_CHIPS[status as CarePlanGoalStatus] ?? GOAL_STATUS_CHIPS.NotStarted;
  }

  planChip(status: CarePlanStatus | string): StatusChip {
    return PLAN_STATUS_CHIPS[status as CarePlanStatus] ?? PLAN_STATUS_CHIPS.Completed;
  }

  isHistoryOpen(planId: string): boolean {
    return this.expandedHistory().has(planId);
  }

  toggleHistory(planId: string): void {
    this.expandedHistory.update((open) => {
      const next = new Set(open);
      if (next.has(planId)) next.delete(planId);
      else next.add(planId);
      return next;
    });
  }

  /** "3 goals · 2 achieved" — the collapsed row's one-line view of a closed plan's goals. */
  goalSummary(plan: CarePlanDto): string {
    const total = plan.goals.length;
    if (total === 0) return 'No goals';
    const achieved = plan.goals.filter((g) => g.status === 'Achieved').length;
    return `${total} goal${total === 1 ? '' : 's'} · ${achieved} achieved`;
  }

  /** Goals in stored order — the array position is the sort order the server round-trips. */
  orderedGoals(plan: CarePlanDto): CarePlanDto['goals'] {
    return [...plan.goals].sort((a, b) => a.sortOrder - b.sortOrder);
  }

  private emptyForm(): PlanForm {
    return { summary: '', guestVoice: '', supportArrangements: '', reviewDueOn: '', goals: [] };
  }

  /** yyyy-MM-dd for <input type="date">; the API sends DateOnly (or an ISO instant). */
  private toDateInput(value: string | null): string {
    return value ? value.slice(0, 10) : '';
  }

  private load(guestId: string, isCancelled: () => boolean): void {
    this.loading.set(true);
    this.error.set(null);
    this.guestsApi.getCarePlan(guestId).subscribe({
      next: (dto) => {
        if (isCancelled()) return;
        this.plans.set(dto);
        this.editing.set(false);
        this.closingOpen.set(false);
        this.loading.set(false);
      },
      error: () => {
        if (isCancelled()) return;
        this.error.set('Could not load the care plan for this guest.');
        this.loading.set(false);
      },
    });
  }

  retry(): void {
    this.load(this.guestId(), () => false);
  }

  /** Empty-state action — opens the editor with a blank plan and one starter goal row. */
  startPlan(): void {
    if (!this.canEdit) return;
    this.form = this.emptyForm();
    this.form.goals = [this.newGoal()];
    this.saveError.set(null);
    this.editing.set(true);
  }

  editPlan(): void {
    const plan = this.current();
    if (!this.canEdit || !plan) return;
    this.form = {
      summary: plan.summary ?? '',
      guestVoice: plan.guestVoice ?? '',
      supportArrangements: plan.supportArrangements ?? '',
      reviewDueOn: this.toDateInput(plan.reviewDueOn),
      goals: this.orderedGoals(plan).map((g) => ({
        key: this.nextGoalKey++,
        id: g.id,
        description: g.description,
        status: g.status,
        targetDate: this.toDateInput(g.targetDate),
        progressNote: g.progressNote ?? '',
      })),
    };
    this.saveError.set(null);
    this.closingOpen.set(false);
    this.editing.set(true);
  }

  cancelEdit(): void {
    if (this.saving()) return;
    this.editing.set(false);
    this.saveError.set(null);
    this.form = this.emptyForm();
  }

  private newGoal(): GoalDraft {
    return { key: this.nextGoalKey++, id: null, description: '', status: 'NotStarted', targetDate: '', progressNote: '' };
  }

  addGoal(): void {
    this.form.goals = [...this.form.goals, this.newGoal()];
  }

  /** Removing a goal here removes it from the plan on save — omitted goals are deleted. */
  removeGoal(index: number): void {
    this.form.goals = this.form.goals.filter((_, i) => i !== index);
  }

  moveGoal(index: number, delta: number): void {
    const target = index + delta;
    const goals = [...this.form.goals];
    if (target < 0 || target >= goals.length) return;
    [goals[index], goals[target]] = [goals[target], goals[index]];
    this.form.goals = goals;
  }

  save(): void {
    if (this.saving() || !this.canEdit) return;
    const goals = this.form.goals.filter((g) => g.description.trim().length > 0);
    if (goals.length !== this.form.goals.length) {
      this.saveError.set('Every goal needs a description. Remove any blank rows before saving.');
      return;
    }
    const request: SaveCarePlanRequest = {
      summary: this.trimmed(this.form.summary),
      guestVoice: this.trimmed(this.form.guestVoice),
      supportArrangements: this.trimmed(this.form.supportArrangements),
      reviewDueOn: this.form.reviewDueOn || null,
      goals: goals.map<CarePlanGoalInput>((g) => ({
        id: g.id,
        description: g.description.trim(),
        status: g.status,
        targetDate: g.targetDate || null,
        progressNote: this.trimmed(g.progressNote),
      })),
    };
    this.saving.set(true);
    this.saveError.set(null);
    this.guestsApi.saveCarePlan(this.guestId(), request).subscribe({
      next: () => {
        this.saving.set(false);
        this.editing.set(false);
        this.form = this.emptyForm();
        this.load(this.guestId(), () => false);
      },
      error: () => {
        this.saving.set(false);
        this.saveError.set('Could not save the care plan. Please try again.');
      },
    });
  }

  private trimmed(value: string): string | null {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }

  openClose(): void {
    if (!this.canEdit || !this.current()) return;
    this.closeError.set(null);
    this.closingOpen.set(true);
  }

  cancelClose(): void {
    if (this.closing()) return;
    this.closingOpen.set(false);
    this.closeError.set(null);
  }

  /** Closing moves the plan into read-only history; the server refuses later edits to it. */
  closePlan(status: 'Completed' | 'Superseded'): void {
    if (this.closing() || !this.canEdit) return;
    this.closing.set(true);
    this.closeError.set(null);
    this.guestsApi.closeCarePlan(this.guestId(), status).subscribe({
      next: () => {
        this.closing.set(false);
        this.closingOpen.set(false);
        this.load(this.guestId(), () => false);
      },
      error: () => {
        this.closing.set(false);
        this.closeError.set('Could not close the care plan. Please try again.');
      },
    });
  }
}

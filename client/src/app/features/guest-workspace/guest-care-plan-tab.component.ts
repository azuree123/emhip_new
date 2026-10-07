import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  CarePlanDto,
  CarePlanGoalInput,
  CarePlanGoalStatus,
  CarePlanNhsReferral,
  GuestCarePlansDto,
  GuestPathway,
  SaveCarePlanRequest,
} from '../../core/api-models';
import { AuthService } from '../../core/auth.service';
import { clinicalPathwayLabel } from '../../core/demographic-options';
import { GuestsApiService } from '../../core/guests-api.service';
import { Permissions } from '../../core/permissions';
import { StatusChip, formatDate } from './guest-workspace.util';

const GOAL_STATUS_CHIPS: Record<CarePlanGoalStatus, StatusChip> = {
  NotStarted: { label: 'Not started', bg: '#f0f0f0', fg: '#646464' },
  InProgress: { label: 'In progress', bg: '#fff9e4', fg: '#9d852d' },
  Achieved: { label: 'Achieved', bg: '#eafdee', fg: '#147129' },
  Discontinued: { label: 'Discontinued', bg: '#ffeaec', fg: '#e12628' },
};

/** Select options for "Has a referral to NHS services been made or discussed?" — mirrors CarePlanLabels on the server. */
const NHS_REFERRAL_OPTIONS: { value: CarePlanNhsReferral; label: string; short: string }[] = [
  { value: 'NotAppropriate', label: 'No — not appropriate', short: 'Not appropriate' },
  { value: 'Discussed', label: 'Discussed — not yet referred', short: 'Discussed, not yet referred' },
  { value: 'Made', label: 'Yes — referral made', short: 'Referral made' },
  { value: 'Declined', label: 'Offered — guest declined', short: 'Guest declined' },
];

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

/** The Create / Edit Care Plan form. Selects hold '' until answered so a required answer is never assumed. */
interface PlanForm {
  guestVoice: string;
  supportArrangements: string;
  betweenSessions: string;
  referrals: string;
  goals: GoalDraft[];
  nextContactOn: string;
  reviewDueOn: string;
  cpnInvolvementRequired: '' | 'yes' | 'no';
  nhsReferral: '' | CarePlanNhsReferral;
  otherNotes: string;
}

type RequiredField = 'guestVoice' | 'supportArrangements' | 'nextContactOn' | 'reviewDueOn' | 'cpnInvolvementRequired' | 'nhsReferral';

/**
 * Care Plan tab — "Care Plan History": every plan the guest has had, newest first, as an
 * accordion. The active plan opens by default; each row's ⋮ menu edits, closes or exports it.
 * "Create New Plan" opens the Create New Care Plan dialog; when a plan is already active the
 * server closes it as superseded in the same save, so the guest only ever has one active plan.
 *
 * The plan carries the form's prose answers, the review & next steps, and a goal list. Goals are
 * saved with the whole plan — **goals left out of the request are deleted**, so the editor
 * always posts the full list, and a goal's position in the array is its sort order. Closed plans
 * are refused by the server on edit, so they are read-only.
 *
 * Everything that writes is gated on guests.edit; without it the tab is a read-only view.
 */
@Component({
  selector: 'emhip-guest-care-plan-tab',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './guest-care-plan-tab.component.html',
  styleUrl: './guest-care-plan-tab.component.scss',
  host: {
    '(document:keydown.escape)': 'onEscape()',
  },
})
export class GuestCarePlanTabComponent {
  private readonly guestsApi = inject(GuestsApiService);
  private readonly auth = inject(AuthService);

  readonly guestId = input.required<string>();
  /** The guest's allocated pathway — the plan is agreed against it. */
  readonly pathway = input<GuestPathway | null>(null);
  /** For the exported file's name (G-number). */
  readonly guestNumber = input<number | null>(null);

  readonly canEdit = this.auth.hasPermission(Permissions.Guests.Edit);

  readonly plans = signal<GuestCarePlansDto | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly current = computed<CarePlanDto | null>(() => this.plans()?.current ?? null);
  /** Active plan first, then closed plans newest first. */
  readonly allPlans = computed<CarePlanDto[]>(() => {
    const plans = this.plans();
    if (!plans) return [];
    return plans.current ? [plans.current, ...plans.history] : plans.history;
  });
  /** Plans opened in the accordion (several can be open to compare them). */
  readonly expanded = signal<ReadonlySet<string>>(new Set());
  /** The plan whose ⋮ menu is open. */
  readonly openMenuId = signal<string | null>(null);

  readonly pathwayLabel = computed(() => {
    const pathway = this.pathway();
    return pathway ? clinicalPathwayLabel(pathway) : null;
  });

  // ---- Create / Edit dialog ----
  /** null = closed; 'create' = Create New Care Plan; 'edit' = editing the active plan. */
  readonly dialogMode = signal<'create' | 'edit' | null>(null);
  readonly submitted = signal(false);
  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);

  // ---- Close Plan confirmation ----
  readonly closeConfirmOpen = signal(false);
  readonly closing = signal(false);
  readonly closeError = signal<string | null>(null);

  readonly exportingId = signal<string | null>(null);
  readonly exportError = signal<string | null>(null);

  readonly goalStatuses: CarePlanGoalStatus[] = ['NotStarted', 'InProgress', 'Achieved', 'Discontinued'];
  readonly nhsReferralOptions = NHS_REFERRAL_OPTIONS;

  form: PlanForm = this.emptyForm();
  private nextGoalKey = 1;

  readonly formatDate = formatDate;

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

  /** The design shows every closed plan as "Closed"; the meta line says whether it was superseded. */
  planChipLabel(plan: CarePlanDto): string {
    return plan.status === 'Active' ? 'Active' : 'Closed';
  }

  /** "Created 13 May 2025 · by Amara Asante", plus when it closed for history rows. */
  planMeta(plan: CarePlanDto): string {
    const created = `Created ${formatDate(plan.startedOn)} · by ${plan.createdByName || '—'}`;
    if (plan.status === 'Active' || !plan.closedOn) return created;
    return `${created} · ${plan.status === 'Superseded' ? 'Superseded' : 'Closed'} ${formatDate(plan.closedOn)}`;
  }

  cpnLabel(value: boolean | null): string {
    return value === null ? 'Not recorded' : value ? 'Yes' : 'No';
  }

  nhsReferralLabel(value: CarePlanNhsReferral | null): string {
    return NHS_REFERRAL_OPTIONS.find((o) => o.value === value)?.short ?? 'Not recorded';
  }

  /** Goals in stored order — the array position is the sort order the server round-trips. */
  orderedGoals(plan: CarePlanDto): CarePlanDto['goals'] {
    return [...plan.goals].sort((a, b) => a.sortOrder - b.sortOrder);
  }

  // ---- Accordion + row menu ----

  isOpen(planId: string): boolean {
    return this.expanded().has(planId);
  }

  toggle(planId: string): void {
    this.expanded.update((open) => {
      const next = new Set(open);
      if (next.has(planId)) next.delete(planId);
      else next.add(planId);
      return next;
    });
  }

  toggleMenu(planId: string): void {
    this.openMenuId.update((open) => (open === planId ? null : planId));
  }

  closeMenu(): void {
    this.openMenuId.set(null);
  }

  onEscape(): void {
    if (this.openMenuId()) this.closeMenu();
    else if (this.closeConfirmOpen()) this.cancelClose();
    else if (this.dialogMode()) this.closeDialog();
  }

  // ---- Loading ----

  private load(guestId: string, isCancelled: () => boolean): void {
    this.loading.set(true);
    this.error.set(null);
    this.guestsApi.getCarePlan(guestId).subscribe({
      next: (dto) => {
        if (isCancelled()) return;
        this.plans.set(dto);
        // The active plan opens by default, as in the design; closed plans start collapsed.
        this.expanded.set(new Set(dto.current ? [dto.current.id] : []));
        this.loading.set(false);
      },
      error: () => {
        if (isCancelled()) return;
        this.error.set('Could not load the care plans for this guest.');
        this.loading.set(false);
      },
    });
  }

  retry(): void {
    this.load(this.guestId(), () => false);
  }

  // ---- Create / Edit dialog ----

  private emptyForm(): PlanForm {
    return {
      guestVoice: '',
      supportArrangements: '',
      betweenSessions: '',
      referrals: '',
      goals: [],
      nextContactOn: '',
      reviewDueOn: '',
      cpnInvolvementRequired: '',
      nhsReferral: '',
      otherNotes: '',
    };
  }

  /** yyyy-MM-dd for <input type="date">; the API sends DateOnly (or an ISO instant). */
  private toDateInput(value: string | null): string {
    return value ? value.slice(0, 10) : '';
  }

  openCreate(): void {
    if (!this.canEdit) return;
    this.form = this.emptyForm();
    this.form.goals = [this.newGoal()];
    this.openDialog('create');
  }

  openEdit(): void {
    const plan = this.current();
    this.closeMenu();
    if (!this.canEdit || !plan) return;
    this.form = {
      guestVoice: plan.guestVoice ?? '',
      supportArrangements: plan.supportArrangements ?? '',
      betweenSessions: plan.betweenSessions ?? '',
      referrals: plan.referrals ?? '',
      goals: this.orderedGoals(plan).map((g) => ({
        key: this.nextGoalKey++,
        id: g.id,
        description: g.description,
        status: g.status,
        targetDate: this.toDateInput(g.targetDate),
        progressNote: g.progressNote ?? '',
      })),
      nextContactOn: this.toDateInput(plan.nextContactOn),
      reviewDueOn: this.toDateInput(plan.reviewDueOn),
      cpnInvolvementRequired: plan.cpnInvolvementRequired === null ? '' : plan.cpnInvolvementRequired ? 'yes' : 'no',
      nhsReferral: plan.nhsReferral ?? '',
      otherNotes: plan.otherNotes ?? '',
    };
    this.openDialog('edit');
  }

  private openDialog(mode: 'create' | 'edit'): void {
    this.submitted.set(false);
    this.saveError.set(null);
    this.dialogMode.set(mode);
  }

  closeDialog(): void {
    if (this.saving()) return;
    this.dialogMode.set(null);
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

  /** True when a required answer is missing — shown once the user has tried to save. */
  missing(field: RequiredField): boolean {
    return this.submitted() && !this.form[field].trim();
  }

  /** A started goal row needs its description; a fully blank row is simply dropped on save. */
  goalMissingDescription(goal: GoalDraft): boolean {
    return this.submitted() && !goal.description.trim() && this.goalHasDetail(goal);
  }

  private goalHasDetail(goal: GoalDraft): boolean {
    return !!(goal.targetDate || goal.progressNote.trim() || goal.id || goal.status !== 'NotStarted');
  }

  save(): void {
    const mode = this.dialogMode();
    if (this.saving() || !this.canEdit || !mode) return;
    this.submitted.set(true);
    this.saveError.set(null);

    const required: RequiredField[] = ['guestVoice', 'supportArrangements', 'nextContactOn', 'reviewDueOn', 'cpnInvolvementRequired', 'nhsReferral'];
    const goals = this.form.goals.filter((g) => g.description.trim() || this.goalHasDetail(g));
    if (required.some((field) => !this.form[field].trim()) || goals.some((g) => !g.description.trim())) {
      this.saveError.set('Fill in the required fields marked * before saving.');
      return;
    }

    const request: SaveCarePlanRequest = {
      guestVoice: this.trimmed(this.form.guestVoice),
      supportArrangements: this.trimmed(this.form.supportArrangements),
      betweenSessions: this.trimmed(this.form.betweenSessions),
      referrals: this.trimmed(this.form.referrals),
      otherNotes: this.trimmed(this.form.otherNotes),
      nextContactOn: this.form.nextContactOn || null,
      reviewDueOn: this.form.reviewDueOn || null,
      cpnInvolvementRequired: this.form.cpnInvolvementRequired === 'yes',
      nhsReferral: this.form.nhsReferral || null,
      goals: goals.map<CarePlanGoalInput>((g) => ({
        id: g.id,
        description: g.description.trim(),
        status: g.status,
        targetDate: g.targetDate || null,
        progressNote: this.trimmed(g.progressNote),
      })),
    };

    this.saving.set(true);
    const call =
      mode === 'create'
        ? this.guestsApi.createCarePlan(this.guestId(), request)
        : this.guestsApi.saveCarePlan(this.guestId(), request);
    call.subscribe({
      next: () => {
        this.saving.set(false);
        this.closeDialog();
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

  // ---- Close Plan ----

  openClose(): void {
    this.closeMenu();
    if (!this.canEdit || !this.current()) return;
    this.closeError.set(null);
    this.closeConfirmOpen.set(true);
  }

  cancelClose(): void {
    if (this.closing()) return;
    this.closeConfirmOpen.set(false);
    this.closeError.set(null);
  }

  /** Closing moves the plan into history; the server refuses later edits to it. */
  confirmClose(): void {
    if (this.closing() || !this.canEdit) return;
    this.closing.set(true);
    this.closeError.set(null);
    this.guestsApi.closeCarePlan(this.guestId(), 'Completed').subscribe({
      next: () => {
        this.closing.set(false);
        this.closeConfirmOpen.set(false);
        this.load(this.guestId(), () => false);
      },
      error: () => {
        this.closing.set(false);
        this.closeError.set('Could not close the care plan. Please try again.');
      },
    });
  }

  // ---- Export Plan ----

  /** Downloads the plan as text through the API, which logs the export against the guest. */
  exportPlan(plan: CarePlanDto): void {
    this.closeMenu();
    if (this.exportingId()) return;
    this.exportingId.set(plan.id);
    this.exportError.set(null);
    this.guestsApi.exportCarePlan(this.guestId(), plan.id).subscribe({
      next: (blob) => {
        this.exportingId.set(null);
        const number = this.guestNumber();
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `care-plan-${number ? `G-${number}-` : ''}${plan.startedOn.slice(0, 10)}.txt`;
        anchor.click();
        URL.revokeObjectURL(url);
      },
      error: () => {
        this.exportingId.set(null);
        this.exportError.set('Could not export the care plan. Please try again.');
      },
    });
  }
}

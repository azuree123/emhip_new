import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LookupItemDto } from '../../core/api-models';
import { AuthService } from '../../core/auth.service';
import { Permissions } from '../../core/permissions';
import { LookupCategories, SettingsApiService } from '../../core/settings-api.service';

/** A left-hand nav entry: friendly name plus a line saying where the options actually surface. */
interface CategoryTab {
  key: string;
  name: string;
  hint: string;
}

/**
 * Friendly names/hints for the categories LookupSeeder ships (SettingsApiService.LookupCategories).
 * Anything the server adds later still shows up — see `categories`, which falls back to splitting
 * the PascalCase key rather than hiding rows the editor can't name.
 */
const CATEGORY_META: Record<string, { name: string; hint: string }> = {
  [LookupCategories.DocumentCategory]: {
    name: 'Document categories',
    hint: 'Filing categories offered when a document is uploaded.',
  },
  [LookupCategories.ReferralSource]: {
    name: 'Referral sources',
    hint: 'Where a guest referral came from, captured at registration.',
  },
  [LookupCategories.Ethnicity]: {
    name: 'Ethnicity',
    hint: 'Ethnicity options on the demographics form.',
  },
  [LookupCategories.HousingStatus]: {
    name: 'Housing status',
    hint: 'Housing situations recorded against a guest.',
  },
  [LookupCategories.EmploymentStatus]: {
    name: 'Employment status',
    hint: 'Employment situations recorded against a guest.',
  },
  [LookupCategories.PreferredLanguage]: {
    name: 'Preferred languages',
    hint: 'Languages offered for interpreting and correspondence.',
  },
  [LookupCategories.DiagnosisGroup]: {
    name: 'Diagnosis groups',
    hint: 'Broad groupings used in clinical details and reporting.',
  },
  [LookupCategories.CmhtTeam]: {
    name: 'CMHT teams',
    hint: 'Community mental health teams a guest can be allocated to.',
  },
  [LookupCategories.EscalationReason]: {
    name: 'Escalation reasons',
    hint: 'Reasons offered when a case is escalated.',
  },
  [LookupCategories.EscalationUrgency]: {
    name: 'Escalation urgency',
    hint: 'Urgency levels offered when a case is escalated.',
  },
  [LookupCategories.FollowUpCadence]: {
    name: 'Follow-up cadences',
    hint: 'How often a scheduled follow-up repeats.',
  },
  [LookupCategories.ContactRelationship]: {
    name: 'Emergency contact relationships',
    hint: 'Relationship options for a guest’s emergency contacts.',
  },
};

/** Display order of the nav — same order the server seeds them in. */
const CATEGORY_ORDER: string[] = Object.values(LookupCategories);

/** "GP referral" → "gp-referral". Used to pre-fill the code box; the user can still override it. */
function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
}

/**
 * Keystroke-level tidy-up for a hand-edited code. Deliberately gentler than slugify(): it keeps
 * trailing hyphens so "gp-" doesn't collapse to "gp" mid-word. Ends get trimmed on submit.
 */
function normaliseCode(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .slice(0, 60);
}

/** PascalCase → "Pascal case", for a category the server knows about but this build doesn't. */
function humanise(key: string): string {
  const words = key.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
  return words.charAt(0).toUpperCase() + words.slice(1).toLowerCase();
}

/** ProblemDetails carries the useful sentence in `detail`; validation failures use `errors`. */
function problemMessage(error: unknown, fallback: string): string {
  const body = (error as HttpErrorResponse | undefined)?.error;
  if (typeof body === 'string' && body.trim()) return body.trim();

  if (body && typeof body === 'object') {
    const detail = (body as { detail?: string }).detail;
    if (detail?.trim()) return detail.trim();

    const errors = (body as { errors?: Record<string, string[]> }).errors;
    if (errors) {
      const messages = Object.values(errors).flat().filter(Boolean);
      if (messages.length) return messages.join(' ');
    }

    const title = (body as { title?: string }).title;
    if (title?.trim()) return title.trim();
  }

  return fallback;
}

/**
 * Reference-data editor for the Settings screen — one pane of categories, one pane of the selected
 * category's options (LookupsController). Items are always fetched with includeInactive=true so the
 * component holds the *complete* order for a category: the reorder endpoint renumbers exactly the
 * ids it is given, so sending only the visible (active) rows would leave hidden rows sitting on
 * stale sort orders. "Show inactive items" is therefore a view filter over that full set.
 *
 * Everything mutating is gated on settings.lookups.manage; without it the screen is a read-only
 * reference list, matching the controller (GET is open to any signed-in user).
 */
@Component({
  selector: 'emhip-lookups-manager',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './lookups-manager.component.html',
  styleUrl: './lookups-manager.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LookupsManagerComponent implements OnInit {
  private readonly settingsApi = inject(SettingsApiService);
  private readonly auth = inject(AuthService);

  /** Every lookup item in every category, active and inactive. */
  private readonly allItems = signal<LookupItemDto[]>([]);

  readonly selectedCategory = signal<string>(LookupCategories.DocumentCategory);
  readonly showInactive = signal(false);

  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  /** Set while one category is being refetched after a create/delete. */
  readonly refreshing = signal(false);

  // --- Add form -----------------------------------------------------------
  readonly addOpen = signal(false);
  readonly addLabel = signal('');
  readonly addCode = signal('');
  readonly codeEdited = signal(false);
  readonly creating = signal(false);
  readonly addError = signal<string | null>(null);

  // --- Per-row state ------------------------------------------------------
  readonly editingId = signal<string | null>(null);
  readonly editLabel = signal('');
  /** Id of the row with an in-flight save/toggle/delete/move. */
  readonly busyId = signal<string | null>(null);
  readonly rowError = signal<{ id: string; message: string } | null>(null);
  readonly reorderError = signal<string | null>(null);

  readonly canManage = computed(() => this.auth.hasPermission(Permissions.Settings.ManageLookups));

  /** Seeded categories first, then anything unexpected the API returned, so nothing is hidden. */
  readonly categories = computed<CategoryTab[]>(() => {
    const keys = [...CATEGORY_ORDER];
    for (const item of this.allItems()) {
      if (!keys.includes(item.category)) keys.push(item.category);
    }
    return keys.map((key) => ({
      key,
      name: CATEGORY_META[key]?.name ?? humanise(key),
      hint: CATEGORY_META[key]?.hint ?? 'Configurable options for this category.',
    }));
  });

  readonly selectedTab = computed(
    () => this.categories().find((c) => c.key === this.selectedCategory()) ?? this.categories()[0] ?? null,
  );

  /** Badge counts follow the visibility filter, so they always match what the right pane lists. */
  readonly countsByCategory = computed(() => {
    const includeInactive = this.showInactive();
    const counts = new Map<string, number>();
    for (const item of this.allItems()) {
      if (!includeInactive && !item.isActive) continue;
      counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
    }
    return counts;
  });

  /** The selected category in full server order — the list the reorder endpoint gets. */
  readonly categoryItems = computed(() => this.ordered(this.selectedCategory()));

  readonly visibleItems = computed(() =>
    this.showInactive() ? this.categoryItems() : this.categoryItems().filter((i) => i.isActive),
  );

  readonly hiddenInactiveCount = computed(() =>
    this.showInactive() ? 0 : this.categoryItems().filter((i) => !i.isActive).length,
  );

  /** Live preview of the code that will be sent, so the user sees the slug before saving. */
  readonly derivedCode = computed(() => slugify(this.addCode() || this.addLabel()));

  ngOnInit(): void {
    this.loadAll();
  }

  // --- Loading ------------------------------------------------------------

  loadAll(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.settingsApi.getLookups(undefined, true).subscribe({
      next: (items) => {
        this.allItems.set(items);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loadError.set(problemMessage(err, 'Could not load the lookup lists.'));
        this.loading.set(false);
      },
    });
  }

  /** Refetches one category after a change that shifts ids or sort orders (create/delete). */
  private refreshCategory(category: string, done?: () => void): void {
    this.refreshing.set(true);
    this.settingsApi.getLookups(category, true).subscribe({
      next: (items) => {
        this.allItems.update((all) => [...all.filter((i) => i.category !== category), ...items]);
        this.refreshing.set(false);
        done?.();
      },
      error: (err: HttpErrorResponse) => {
        this.refreshing.set(false);
        this.loadError.set(problemMessage(err, 'Saved, but the list could not be refreshed.'));
        done?.();
      },
    });
  }

  private ordered(category: string): LookupItemDto[] {
    return this.allItems()
      .filter((i) => i.category === category)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
  }

  private patchItem(id: string, changes: Partial<LookupItemDto>): void {
    this.allItems.update((all) => all.map((i) => (i.id === id ? { ...i, ...changes } : i)));
  }

  // --- Navigation ---------------------------------------------------------

  selectCategory(key: string): void {
    if (key === this.selectedCategory()) return;
    this.selectedCategory.set(key);
    this.cancelEdit();
    this.closeAdd();
    this.rowError.set(null);
    this.reorderError.set(null);
  }

  toggleShowInactive(): void {
    this.showInactive.update((v) => !v);
  }

  countFor(key: string): number {
    return this.countsByCategory().get(key) ?? 0;
  }

  // --- Add ----------------------------------------------------------------

  openAdd(): void {
    this.addLabel.set('');
    this.addCode.set('');
    this.codeEdited.set(false);
    this.addError.set(null);
    this.addOpen.set(true);
  }

  closeAdd(): void {
    this.addOpen.set(false);
    this.addError.set(null);
  }

  onLabelInput(value: string): void {
    this.addLabel.set(value);
    // The code tracks the label until the user takes it over.
    if (!this.codeEdited()) this.addCode.set(slugify(value));
  }

  onCodeInput(value: string): void {
    this.codeEdited.set(true);
    this.addCode.set(normaliseCode(value));
  }

  createItem(): void {
    if (this.creating() || !this.canManage()) return;

    const label = this.addLabel().trim();
    const code = slugify(this.addCode() || label);
    if (!label) {
      this.addError.set('Enter a label.');
      return;
    }
    if (!code) {
      this.addError.set('Enter a code — letters and numbers only.');
      return;
    }

    const category = this.selectedCategory();
    // Appended at the end of the current order.
    const sortOrder = this.categoryItems().reduce((max, i) => Math.max(max, i.sortOrder), 0) + 1;

    this.creating.set(true);
    this.addError.set(null);
    this.settingsApi.createLookup({ category, code, label, sortOrder }).subscribe({
      next: () => {
        this.creating.set(false);
        this.closeAdd();
        this.refreshCategory(category);
      },
      error: (err: HttpErrorResponse) => {
        this.creating.set(false);
        // Duplicate codes come back as a 400 ProblemDetails: "'gp-referral' already exists in ...".
        this.addError.set(problemMessage(err, 'Could not add this option.'));
      },
    });
  }

  // --- Inline edit --------------------------------------------------------

  startEdit(item: LookupItemDto): void {
    if (!this.canManage()) return;
    this.editingId.set(item.id);
    this.editLabel.set(item.label);
    this.rowError.set(null);
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.editLabel.set('');
  }

  saveEdit(item: LookupItemDto): void {
    const label = this.editLabel().trim();
    if (!label) {
      this.rowError.set({ id: item.id, message: 'A label is required.' });
      return;
    }
    if (label === item.label) {
      this.cancelEdit();
      return;
    }

    this.busyId.set(item.id);
    this.rowError.set(null);
    this.settingsApi.updateLookup(item.id, { label, sortOrder: item.sortOrder, isActive: item.isActive }).subscribe({
      next: () => {
        this.patchItem(item.id, { label });
        this.busyId.set(null);
        this.cancelEdit();
      },
      error: (err: HttpErrorResponse) => {
        this.busyId.set(null);
        this.rowError.set({ id: item.id, message: problemMessage(err, 'Could not rename this option.') });
      },
    });
  }

  // --- Activate / deactivate ---------------------------------------------

  toggleActive(item: LookupItemDto): void {
    if (!this.canManage() || this.busyId()) return;

    const isActive = !item.isActive;
    this.busyId.set(item.id);
    this.rowError.set(null);
    this.settingsApi.updateLookup(item.id, { label: item.label, sortOrder: item.sortOrder, isActive }).subscribe({
      next: () => {
        this.patchItem(item.id, { isActive });
        this.busyId.set(null);
      },
      error: (err: HttpErrorResponse) => {
        this.busyId.set(null);
        this.rowError.set({
          id: item.id,
          message: problemMessage(err, `Could not ${isActive ? 'activate' : 'deactivate'} this option.`),
        });
      },
    });
  }

  // --- Delete -------------------------------------------------------------

  deleteItem(item: LookupItemDto): void {
    if (!this.canManage() || item.isSystem || this.busyId()) return;
    if (!confirm(`Delete "${item.label}"? Existing records that use it will keep the stored code.`)) return;

    this.busyId.set(item.id);
    this.rowError.set(null);
    this.settingsApi.deleteLookup(item.id).subscribe({
      next: () => {
        this.allItems.update((all) => all.filter((i) => i.id !== item.id));
        this.busyId.set(null);
      },
      error: (err: HttpErrorResponse) => {
        this.busyId.set(null);
        this.rowError.set({ id: item.id, message: problemMessage(err, 'Could not delete this option.') });
      },
    });
  }

  // --- Reordering ---------------------------------------------------------

  canMoveUp(item: LookupItemDto): boolean {
    return this.visibleItems().findIndex((i) => i.id === item.id) > 0;
  }

  canMoveDown(item: LookupItemDto): boolean {
    const visible = this.visibleItems();
    const index = visible.findIndex((i) => i.id === item.id);
    return index >= 0 && index < visible.length - 1;
  }

  /**
   * Moves an item past its neighbour *in the visible list* but reorders the full category list, so
   * hiding inactive rows never silently reshuffles them. Applied optimistically and rolled back if
   * the server rejects the new order.
   */
  move(item: LookupItemDto, direction: -1 | 1): void {
    if (!this.canManage() || this.busyId()) return;

    const visible = this.visibleItems();
    const visibleIndex = visible.findIndex((i) => i.id === item.id);
    const neighbour = visible[visibleIndex + direction];
    if (!neighbour) return;

    const category = this.selectedCategory();
    const snapshot = this.allItems();
    const next = this.categoryItems().filter((i) => i.id !== item.id);
    const neighbourIndex = next.findIndex((i) => i.id === neighbour.id);
    next.splice(direction === 1 ? neighbourIndex + 1 : neighbourIndex, 0, item);

    // Mirror the server's renumbering (ReorderLookupItemsCommand assigns index + 1).
    const reordered = next.map((i, index) => ({ ...i, sortOrder: index + 1 }));
    this.allItems.set([...snapshot.filter((i) => i.category !== category), ...reordered]);

    this.busyId.set(item.id);
    this.reorderError.set(null);
    this.settingsApi.reorderLookups(
      category,
      reordered.map((i) => i.id),
    ).subscribe({
      next: () => this.busyId.set(null),
      error: (err: HttpErrorResponse) => {
        this.allItems.set(snapshot); // roll back to the order the server still holds
        this.busyId.set(null);
        this.reorderError.set(problemMessage(err, 'Could not save the new order.'));
      },
    });
  }

  dismissReorderError(): void {
    this.reorderError.set(null);
  }

  rowErrorFor(id: string): string | null {
    const error = this.rowError();
    return error?.id === id ? error.message : null;
  }
}

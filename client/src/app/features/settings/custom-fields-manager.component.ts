import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CustomFieldDefinitionDto, CustomFieldEntityType, CustomFieldType } from '../../core/api-models';
import { AuthService } from '../../core/auth.service';
import { CustomFieldsApiService } from '../../core/custom-fields-api.service';
import { Permissions } from '../../core/permissions';

/** A left-hand nav entry: the form the fields attach to, plus a line saying where they surface. */
interface ScopeTab {
  key: CustomFieldEntityType;
  name: string;
  hint: string;
}

/**
 * The five forms the server accepts custom fields for (CustomFieldEntityType). This list is closed
 * on purpose — it mirrors the enum, and the standardised clinical instruments are not in it.
 */
const SCOPES: readonly ScopeTab[] = [
  {
    key: 'Guest',
    name: 'Guest record',
    hint: 'Extra details captured on the guest’s own record, alongside demographics.',
  },
  {
    key: 'Document',
    name: 'Documents',
    hint: 'Extra details captured when a document is uploaded or edited.',
  },
  {
    key: 'Contact',
    name: 'Contact log',
    hint: 'Extra details captured against a logged contact with a guest.',
  },
  {
    key: 'FollowUp',
    name: 'Follow-ups',
    hint: 'Extra details captured on a scheduled follow-up.',
  },
  {
    key: 'GuestAction',
    name: 'Actions & reminders',
    hint: 'Extra details captured on an action or reminder raised for a guest.',
  },
];

/** Friendly names for CustomFieldType, in the order the add form offers them. */
const FIELD_TYPES: readonly { value: CustomFieldType; name: string; hint: string }[] = [
  { value: 'Text', name: 'Text', hint: 'A single line of free text.' },
  { value: 'MultilineText', name: 'Long text', hint: 'A multi-line note.' },
  { value: 'Number', name: 'Number', hint: 'A numeric value.' },
  { value: 'Date', name: 'Date', hint: 'A calendar date.' },
  { value: 'Boolean', name: 'Yes / no', hint: 'A single tick box.' },
  { value: 'Select', name: 'Choose one', hint: 'A drop-down of the options you list below.' },
  { value: 'MultiSelect', name: 'Choose several', hint: 'Tick boxes; more than one option can be chosen.' },
];

const TYPE_NAMES = new Map<CustomFieldType, string>(FIELD_TYPES.map((t) => [t.value, t.name]));

/** Select/MultiSelect are the only types whose options list means anything. */
function usesOptions(type: CustomFieldType): boolean {
  return type === 'Select' || type === 'MultiSelect';
}

/**
 * Mirrors the server's key derivation (CreateCustomFieldCommandHandler.UniqueKeyAsync): lower-case,
 * every non-alphanumeric run collapsed to a single hyphen, ends trimmed. Preview only — the server
 * has the last word, and appends "-2", "-3"… when the slug is already taken on that form.
 */
function previewKey(label: string): string {
  const slug = label
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'field';
}

/** Textarea → the options array the API wants: one per line, trimmed, blanks and duplicates dropped. */
function parseOptions(text: string): string[] {
  const seen = new Set<string>();
  const options: string[] = [];
  for (const line of text.split('\n')) {
    const option = line.trim();
    if (!option) continue;
    const fingerprint = option.toLowerCase();
    // The server matches choices case-insensitively, so two casings of one option is a trap.
    if (seen.has(fingerprint)) continue;
    seen.add(fingerprint);
    options.push(option);
  }
  return options;
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
 * Custom fields editor for the Settings screen — sibling of the Lookups tab and deliberately built
 * to the same shape: one pane of form scopes, one pane of that scope's field definitions.
 *
 * Definitions are always fetched with includeInactive=true so the component holds the *complete*
 * order for a scope: ReorderCustomFieldsCommand renumbers exactly the ids it is given, so sending
 * only the visible (active) rows would leave hidden rows sitting on stale sort orders. "Show
 * inactive fields" is therefore a view filter over that full set.
 *
 * Two server rules are enforced up front rather than left to fail on submit:
 *  - a field with answers (valueCount > 0) can't change type, so that control is disabled;
 *  - deleting such a field deactivates it instead, and the server's explanation is shown verbatim.
 *
 * Everything mutating is gated on settings.manage; without it the tab is a read-only reference list.
 */
@Component({
  selector: 'emhip-custom-fields-manager',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './custom-fields-manager.component.html',
  styleUrl: './custom-fields-manager.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomFieldsManagerComponent implements OnInit {
  private readonly customFieldsApi = inject(CustomFieldsApiService);
  private readonly auth = inject(AuthService);

  readonly scopes = SCOPES;
  readonly fieldTypes = FIELD_TYPES;

  /** Every definition on every form, active and inactive. */
  private readonly allFields = signal<CustomFieldDefinitionDto[]>([]);

  readonly selectedScope = signal<CustomFieldEntityType>('Guest');
  readonly showInactive = signal(false);

  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  /** Set while one scope is being refetched after a create/delete. */
  readonly refreshing = signal(false);

  // --- Add / edit form ----------------------------------------------------
  /** null = closed, 'add' = new field, otherwise the id of the field being edited. */
  readonly editorId = signal<string | null>(null);
  readonly editorOpen = signal(false);
  readonly formLabel = signal('');
  readonly formType = signal<CustomFieldType>('Text');
  readonly formRequired = signal(false);
  readonly formHelpText = signal('');
  readonly formOptions = signal('');
  readonly saving = signal(false);
  readonly formError = signal<string | null>(null);

  // --- Per-row state ------------------------------------------------------
  /** Id of the row with an in-flight toggle/delete/move. */
  readonly busyId = signal<string | null>(null);
  readonly rowError = signal<{ id: string; message: string } | null>(null);
  readonly reorderError = signal<string | null>(null);
  /** The server's own sentence after a delete — it explains deactivation, so it's shown verbatim. */
  readonly deleteNotice = signal<string | null>(null);

  readonly canManage = computed(() => this.auth.hasPermission(Permissions.Settings.Manage));

  readonly selectedTab = computed(() => SCOPES.find((s) => s.key === this.selectedScope()) ?? SCOPES[0]);

  /** Badge counts follow the visibility filter, so they always match what the right pane lists. */
  readonly countsByScope = computed(() => {
    const includeInactive = this.showInactive();
    const counts = new Map<CustomFieldEntityType, number>();
    for (const field of this.allFields()) {
      if (!includeInactive && !field.isActive) continue;
      counts.set(field.entityType, (counts.get(field.entityType) ?? 0) + 1);
    }
    return counts;
  });

  /** The selected scope in full server order — the list the reorder endpoint gets. */
  readonly scopeFields = computed(() => this.ordered(this.selectedScope()));

  readonly visibleFields = computed(() =>
    this.showInactive() ? this.scopeFields() : this.scopeFields().filter((f) => f.isActive),
  );

  readonly hiddenInactiveCount = computed(() =>
    this.showInactive() ? 0 : this.scopeFields().filter((f) => !f.isActive).length,
  );

  /** The definition currently open in the editor, or null when adding. */
  readonly editingField = computed<CustomFieldDefinitionDto | null>(() => {
    const id = this.editorId();
    if (!id || id === 'add') return null;
    return this.allFields().find((f) => f.id === id) ?? null;
  });

  readonly isAdding = computed(() => this.editorOpen() && this.editorId() === 'add');

  /** True when the editor shows a field the server would refuse a type change on. */
  readonly typeLocked = computed(() => (this.editingField()?.valueCount ?? 0) > 0);

  readonly formNeedsOptions = computed(() => usesOptions(this.formType()));

  /** Live preview of the slug the server will derive, so the "it's permanent" warning is concrete. */
  readonly derivedKey = computed(() => previewKey(this.formLabel().trim()));

  readonly selectedTypeHint = computed(
    () => FIELD_TYPES.find((t) => t.value === this.formType())?.hint ?? '',
  );

  ngOnInit(): void {
    this.loadAll();
  }

  // --- Loading ------------------------------------------------------------

  loadAll(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.customFieldsApi.getDefinitions(undefined, true).subscribe({
      next: (fields) => {
        this.allFields.set(fields);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loadError.set(problemMessage(err, 'Could not load the custom field definitions.'));
        this.loading.set(false);
      },
    });
  }

  /** Refetches one scope after a change that shifts ids or sort orders (create/delete). */
  private refreshScope(entityType: CustomFieldEntityType): void {
    this.refreshing.set(true);
    this.customFieldsApi.getDefinitions(entityType, true).subscribe({
      next: (fields) => {
        this.allFields.update((all) => [...all.filter((f) => f.entityType !== entityType), ...fields]);
        this.refreshing.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.refreshing.set(false);
        this.loadError.set(problemMessage(err, 'Saved, but the list could not be refreshed.'));
      },
    });
  }

  private ordered(entityType: CustomFieldEntityType): CustomFieldDefinitionDto[] {
    return this.allFields()
      .filter((f) => f.entityType === entityType)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
  }

  private patchField(id: string, changes: Partial<CustomFieldDefinitionDto>): void {
    this.allFields.update((all) => all.map((f) => (f.id === id ? { ...f, ...changes } : f)));
  }

  // --- Navigation ---------------------------------------------------------

  selectScope(key: CustomFieldEntityType): void {
    if (key === this.selectedScope()) return;
    this.selectedScope.set(key);
    this.closeEditor();
    this.rowError.set(null);
    this.reorderError.set(null);
    this.deleteNotice.set(null);
  }

  toggleShowInactive(): void {
    this.showInactive.update((v) => !v);
  }

  countFor(key: CustomFieldEntityType): number {
    return this.countsByScope().get(key) ?? 0;
  }

  typeName(type: CustomFieldType): string {
    return TYPE_NAMES.get(type) ?? type;
  }

  // --- Editor -------------------------------------------------------------

  openAdd(): void {
    if (!this.canManage()) return;
    this.editorId.set('add');
    this.formLabel.set('');
    this.formType.set('Text');
    this.formRequired.set(false);
    this.formHelpText.set('');
    this.formOptions.set('');
    this.formError.set(null);
    this.editorOpen.set(true);
  }

  startEdit(field: CustomFieldDefinitionDto): void {
    if (!this.canManage() || this.busyId()) return;
    this.editorId.set(field.id);
    this.formLabel.set(field.label);
    this.formType.set(field.fieldType);
    this.formRequired.set(field.isRequired);
    this.formHelpText.set(field.helpText ?? '');
    this.formOptions.set(field.options.join('\n'));
    this.formError.set(null);
    this.editorOpen.set(true);
  }

  closeEditor(): void {
    this.editorOpen.set(false);
    this.editorId.set(null);
    this.formError.set(null);
  }

  onTypeChange(value: string): void {
    const type = FIELD_TYPES.find((t) => t.value === value)?.value ?? 'Text';
    this.formType.set(type);
  }

  /**
   * Create or update, depending on what the editor was opened for. Choice fields are validated for
   * at least one option here so the round trip isn't spent on something we already know is wrong.
   */
  saveField(): void {
    if (this.saving() || !this.canManage()) return;

    const label = this.formLabel().trim();
    if (!label) {
      this.formError.set('Enter a label.');
      return;
    }

    const fieldType = this.formType();
    const options = usesOptions(fieldType) ? parseOptions(this.formOptions()) : null;
    if (options && options.length === 0) {
      this.formError.set('List at least one option — one per line.');
      return;
    }

    const helpText = this.formHelpText().trim() || null;
    const isRequired = this.formRequired();
    const existing = this.editingField();

    this.saving.set(true);
    this.formError.set(null);

    if (!existing) {
      const entityType = this.selectedScope();
      this.customFieldsApi.create({ entityType, label, fieldType, options, helpText, isRequired }).subscribe({
        next: () => {
          this.saving.set(false);
          this.closeEditor();
          // The server assigns the key and the trailing sort order, so re-read rather than guess.
          this.refreshScope(entityType);
        },
        error: (err: HttpErrorResponse) => {
          this.saving.set(false);
          this.formError.set(problemMessage(err, 'Could not add this field.'));
        },
      });
      return;
    }

    this.customFieldsApi
      .update(existing.id, {
        label,
        fieldType,
        options,
        helpText,
        isRequired,
        sortOrder: existing.sortOrder,
        isActive: existing.isActive,
      })
      .subscribe({
        next: () => {
          this.patchField(existing.id, { label, fieldType, options: options ?? [], helpText, isRequired });
          this.saving.set(false);
          this.closeEditor();
        },
        error: (err: HttpErrorResponse) => {
          this.saving.set(false);
          this.formError.set(problemMessage(err, 'Could not save this field.'));
        },
      });
  }

  // --- Activate / deactivate ---------------------------------------------

  toggleActive(field: CustomFieldDefinitionDto): void {
    if (!this.canManage() || this.busyId()) return;

    const isActive = !field.isActive;
    this.busyId.set(field.id);
    this.rowError.set(null);
    this.customFieldsApi
      .update(field.id, {
        label: field.label,
        fieldType: field.fieldType,
        options: field.options,
        helpText: field.helpText,
        isRequired: field.isRequired,
        sortOrder: field.sortOrder,
        isActive,
      })
      .subscribe({
        next: () => {
          this.patchField(field.id, { isActive });
          this.busyId.set(null);
        },
        error: (err: HttpErrorResponse) => {
          this.busyId.set(null);
          this.rowError.set({
            id: field.id,
            message: problemMessage(err, `Could not ${isActive ? 'show' : 'hide'} this field.`),
          });
        },
      });
  }

  // --- Delete -------------------------------------------------------------

  /**
   * The server deletes an unused field but only deactivates one that already holds answers, and
   * says which it did — so the result message is surfaced as-is rather than assumed.
   */
  deleteField(field: CustomFieldDefinitionDto): void {
    if (!this.canManage() || this.busyId()) return;

    const warning =
      field.valueCount > 0
        ? `“${field.label}” holds data on ${field.valueCount} record(s). It will be hidden from the form instead of deleted, and existing answers are kept. Continue?`
        : `Delete “${field.label}”? It has no answers stored, so it will be removed outright.`;
    if (!confirm(warning)) return;

    const entityType = field.entityType;
    this.busyId.set(field.id);
    this.rowError.set(null);
    this.deleteNotice.set(null);
    this.customFieldsApi.delete(field.id).subscribe({
      next: (result) => {
        this.busyId.set(null);
        this.deleteNotice.set(result.message);
        if (this.editorId() === field.id) this.closeEditor();
        // Refresh either way: a deleted field disappears, a deactivated one stays in the inactive state.
        this.refreshScope(entityType);
      },
      error: (err: HttpErrorResponse) => {
        this.busyId.set(null);
        this.rowError.set({ id: field.id, message: problemMessage(err, 'Could not delete this field.') });
      },
    });
  }

  dismissDeleteNotice(): void {
    this.deleteNotice.set(null);
  }

  // --- Reordering ---------------------------------------------------------

  canMoveUp(field: CustomFieldDefinitionDto): boolean {
    return this.visibleFields().findIndex((f) => f.id === field.id) > 0;
  }

  canMoveDown(field: CustomFieldDefinitionDto): boolean {
    const visible = this.visibleFields();
    const index = visible.findIndex((f) => f.id === field.id);
    return index >= 0 && index < visible.length - 1;
  }

  /**
   * Moves a field past its neighbour *in the visible list* but reorders the full scope, so hiding
   * inactive rows never silently reshuffles them. Applied optimistically and rolled back if the
   * server rejects the new order.
   */
  move(field: CustomFieldDefinitionDto, direction: -1 | 1): void {
    if (!this.canManage() || this.busyId()) return;

    const visible = this.visibleFields();
    const visibleIndex = visible.findIndex((f) => f.id === field.id);
    const neighbour = visible[visibleIndex + direction];
    if (!neighbour) return;

    const entityType = this.selectedScope();
    const snapshot = this.allFields();
    const next = this.scopeFields().filter((f) => f.id !== field.id);
    const neighbourIndex = next.findIndex((f) => f.id === neighbour.id);
    next.splice(direction === 1 ? neighbourIndex + 1 : neighbourIndex, 0, field);

    // Mirror the server's renumbering (ReorderCustomFieldsCommand assigns index + 1).
    const reordered = next.map((f, index) => ({ ...f, sortOrder: index + 1 }));
    this.allFields.set([...snapshot.filter((f) => f.entityType !== entityType), ...reordered]);

    this.busyId.set(field.id);
    this.reorderError.set(null);
    this.customFieldsApi.reorder(
      entityType,
      reordered.map((f) => f.id),
    ).subscribe({
      next: () => this.busyId.set(null),
      error: (err: HttpErrorResponse) => {
        this.allFields.set(snapshot); // roll back to the order the server still holds
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

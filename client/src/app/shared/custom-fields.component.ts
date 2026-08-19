import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable, map, of } from 'rxjs';
import { CustomFieldEntityType, CustomFieldEntry, CustomFieldValueDto } from '../core/api-models';
import { CustomFieldsApiService } from '../core/custom-fields-api.service';

/**
 * Renders the admin-defined extra fields for a form, as an "Additional information" panel.
 *
 * Two modes:
 *  - **Existing record** — pass `entityId`; the panel loads current answers and saves them itself
 *    via its own Save button (or the host can call `save()`).
 *  - **New record** — leave `entityId` null; the host collects answers as the user types and calls
 *    `saveFor(newId)` once the record exists, since values need something to hang off.
 *
 * Hosts should hide their surrounding section when `hasFields()` is false, so a form with no
 * configured extras looks exactly as it did before.
 */
@Component({
  selector: 'emhip-custom-fields',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading()) {
      <p class="cf__state">Loading additional fields…</p>
    } @else if (fields().length) {
      <div class="cf">
        @if (heading()) {
          <h3 class="cf__heading">{{ heading() }}</h3>
        }

        <div class="cf__grid">
          @for (field of fields(); track field.definitionId) {
            <div class="cf__field" [class.cf__field--wide]="isWide(field)">
              <label class="cf__label" [attr.for]="'cf-' + field.definitionId">
                {{ field.label }}
                @if (field.isRequired) {
                  <span class="cf__required" aria-hidden="true">*</span>
                }
              </label>

              @switch (field.fieldType) {
                @case ('MultilineText') {
                  <textarea
                    class="cf__input cf__input--area"
                    [id]="'cf-' + field.definitionId"
                    rows="3"
                    [disabled]="readonly()"
                    [ngModel]="field.text"
                    [ngModelOptions]="{ standalone: true }"
                    (ngModelChange)="setText(field, $event)"
                  ></textarea>
                }
                @case ('Number') {
                  <input
                    class="cf__input"
                    type="number"
                    [id]="'cf-' + field.definitionId"
                    [disabled]="readonly()"
                    [ngModel]="field.number"
                    [ngModelOptions]="{ standalone: true }"
                    (ngModelChange)="setNumber(field, $event)"
                  />
                }
                @case ('Date') {
                  <input
                    class="cf__input"
                    type="date"
                    [id]="'cf-' + field.definitionId"
                    [disabled]="readonly()"
                    [ngModel]="field.date"
                    [ngModelOptions]="{ standalone: true }"
                    (ngModelChange)="setDate(field, $event)"
                  />
                }
                @case ('Boolean') {
                  <label class="cf__check">
                    <input
                      type="checkbox"
                      [id]="'cf-' + field.definitionId"
                      [disabled]="readonly()"
                      [ngModel]="field.boolean === true"
                      [ngModelOptions]="{ standalone: true }"
                      (ngModelChange)="setBoolean(field, $event)"
                    />
                    <span>Yes</span>
                  </label>
                }
                @case ('Select') {
                  <select
                    class="cf__input"
                    [id]="'cf-' + field.definitionId"
                    [disabled]="readonly()"
                    [ngModel]="field.text"
                    [ngModelOptions]="{ standalone: true }"
                    (ngModelChange)="setText(field, $event)"
                  >
                    <option [ngValue]="null">Not specified</option>
                    @for (option of field.options; track option) {
                      <option [ngValue]="option">{{ option }}</option>
                    }
                  </select>
                }
                @case ('MultiSelect') {
                  <div class="cf__choices">
                    @for (option of field.options; track option) {
                      <label class="cf__check">
                        <input
                          type="checkbox"
                          [disabled]="readonly()"
                          [checked]="isChosen(field, option)"
                          (change)="toggleChoice(field, option, $event)"
                        />
                        <span>{{ option }}</span>
                      </label>
                    }
                  </div>
                }
                @default {
                  <input
                    class="cf__input"
                    type="text"
                    [id]="'cf-' + field.definitionId"
                    [disabled]="readonly()"
                    [ngModel]="field.text"
                    [ngModelOptions]="{ standalone: true }"
                    (ngModelChange)="setText(field, $event)"
                  />
                }
              }

              @if (field.helpText) {
                <span class="cf__help">{{ field.helpText }}</span>
              }
              @if (showErrors() && field.isRequired && isBlank(field)) {
                <span class="cf__error">{{ field.label }} is required.</span>
              }
            </div>
          }
        </div>

        @if (errorMessage(); as message) {
          <p class="cf__error cf__error--banner">{{ message }}</p>
        }
        @if (savedAt()) {
          <p class="cf__saved">Additional information saved.</p>
        }

        @if (showSaveButton() && !readonly() && entityId()) {
          <div class="cf__actions">
            <button type="button" class="cf__save" [disabled]="saving()" (click)="save()">
              {{ saving() ? 'Saving…' : 'Save additional information' }}
            </button>
          </div>
        }
      </div>
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .cf__heading {
        margin: 0 0 14px;
        font-size: 14px;
        font-weight: 700;
        color: #1a1a1a;
      }
      .cf__grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: 14px 18px;
      }
      .cf__field {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .cf__field--wide {
        grid-column: 1 / -1;
      }
      .cf__label {
        font-size: 12px;
        font-weight: 600;
        color: #4b4b4b;
      }
      .cf__required {
        color: #e12628;
        margin-left: 2px;
      }
      .cf__input {
        width: 100%;
        min-height: 38px;
        padding: 8px 12px;
        border: 1px solid #dcdcdc;
        border-radius: 8px;
        font: inherit;
        font-size: 13px;
        background: #ffffff;
        color: #1a1a1a;
      }
      .cf__input:focus {
        outline: none;
        border-color: #e12628;
        box-shadow: 0 0 0 3px rgba(225, 38, 40, 0.1);
      }
      .cf__input:disabled {
        background: #f6f6f6;
        color: #6b6b6b;
      }
      .cf__input--area {
        min-height: 76px;
        resize: vertical;
      }
      .cf__choices {
        display: flex;
        flex-wrap: wrap;
        gap: 8px 16px;
      }
      .cf__check {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        color: #1a1a1a;
      }
      .cf__help {
        font-size: 11px;
        color: #8f8f8f;
      }
      .cf__error {
        font-size: 12px;
        color: #d02537;
      }
      .cf__error--banner {
        margin: 12px 0 0;
      }
      .cf__saved {
        margin: 12px 0 0;
        font-size: 12px;
        color: #147129;
      }
      .cf__state {
        margin: 0;
        font-size: 13px;
        color: #8f8f8f;
      }
      .cf__actions {
        margin-top: 14px;
      }
      .cf__save {
        border: none;
        border-radius: 8px;
        background: #e12628;
        color: #ffffff;
        font: inherit;
        font-size: 13px;
        font-weight: 600;
        padding: 9px 18px;
        cursor: pointer;
      }
      .cf__save:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    `,
  ],
})
export class CustomFieldsComponent {
  private readonly api = inject(CustomFieldsApiService);

  readonly entityType = input.required<CustomFieldEntityType>();
  /** Null while the record is still being created — call `saveFor(id)` once it exists. */
  readonly entityId = input<string | null>(null);
  readonly readonly = input(false);
  readonly showSaveButton = input(true);
  readonly heading = input<string | null>('Additional information');

  readonly saved = output<void>();

  readonly fields = signal<CustomFieldValueDto[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly savedAt = signal<number | null>(null);
  readonly showErrors = signal(false);

  /** Hosts use this to hide their section entirely when no extras are configured. */
  readonly hasFields = computed(() => this.fields().length > 0);

  /** True when every required field has an answer. */
  readonly isValid = computed(() => !this.fields().some((f) => f.isRequired && this.isBlank(f)));

  readonly entries = computed<CustomFieldEntry[]>(() =>
    this.fields().map((f) => ({
      definitionId: f.definitionId,
      text: f.text,
      number: f.number,
      date: f.date,
      boolean: f.boolean,
    })),
  );

  constructor() {
    effect(() => {
      const type = this.entityType();
      const id = this.entityId();
      this.load(type, id);
    });
  }

  private load(entityType: CustomFieldEntityType, entityId: string | null): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    const request$: Observable<CustomFieldValueDto[]> = entityId
      ? this.api.getValues(entityType, entityId)
      : // New record: render the definitions with empty answers until it exists.
        this.api.getActiveDefinitions(entityType).pipe(
          map((defs) =>
            defs.map((d) => ({
              definitionId: d.id,
              key: d.key,
              label: d.label,
              fieldType: d.fieldType,
              options: d.options,
              helpText: d.helpText,
              isRequired: d.isRequired,
              sortOrder: d.sortOrder,
              text: null,
              number: null,
              date: null,
              boolean: null,
            })),
          ),
        );

    request$.subscribe({
      next: (fields) => {
        this.fields.set(fields);
        this.loading.set(false);
      },
      error: () => {
        // A form must still work when the extras can't be fetched.
        this.fields.set([]);
        this.loading.set(false);
      },
    });
  }

  isWide(field: CustomFieldValueDto): boolean {
    return field.fieldType === 'MultilineText' || field.fieldType === 'MultiSelect';
  }

  isBlank(field: CustomFieldValueDto): boolean {
    return (
      (field.text === null || field.text === undefined || field.text.trim() === '') &&
      field.number === null &&
      field.date === null &&
      field.boolean === null
    );
  }

  isChosen(field: CustomFieldValueDto, option: string): boolean {
    return (field.text ?? '').split('\n').includes(option);
  }

  setText(field: CustomFieldValueDto, value: string | null): void {
    this.patch(field, { text: value === '' ? null : value });
  }

  setNumber(field: CustomFieldValueDto, value: number | string | null): void {
    const parsed = value === null || value === '' ? null : Number(value);
    this.patch(field, { number: Number.isFinite(parsed as number) ? (parsed as number) : null });
  }

  setDate(field: CustomFieldValueDto, value: string | null): void {
    this.patch(field, { date: value || null });
  }

  setBoolean(field: CustomFieldValueDto, value: boolean): void {
    // Unchecked means "no answer" rather than "no", so the field can stay genuinely empty.
    this.patch(field, { boolean: value ? true : null });
  }

  toggleChoice(field: CustomFieldValueDto, option: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const current = (field.text ?? '').split('\n').filter(Boolean);
    const next = checked ? [...new Set([...current, option])] : current.filter((c) => c !== option);
    this.patch(field, { text: next.length ? next.join('\n') : null });
  }

  private patch(field: CustomFieldValueDto, changes: Partial<CustomFieldValueDto>): void {
    this.fields.update((fields) => fields.map((f) => (f.definitionId === field.definitionId ? { ...f, ...changes } : f)));
    this.savedAt.set(null);
  }

  /** Saves against the bound entityId. Returns false when a required field is empty. */
  save(): void {
    const id = this.entityId();
    if (!id) return;

    this.saveFor(id).subscribe();
  }

  /**
   * Saves the current answers against the given record id — the hook a host uses after creating
   * a new record. Completes immediately when there are no fields configured.
   */
  saveFor(entityId: string): Observable<void> {
    if (!this.fields().length) return of(void 0);

    this.showErrors.set(true);
    if (!this.isValid()) {
      this.errorMessage.set('Complete the required additional fields.');
      return new Observable<void>((subscriber) => subscriber.error(new Error('Required custom fields are empty.')));
    }

    this.saving.set(true);
    this.errorMessage.set(null);

    return new Observable<void>((subscriber) => {
      this.api.saveValues(this.entityType(), entityId, this.entries()).subscribe({
        next: () => {
          this.saving.set(false);
          this.savedAt.set(Date.now());
          this.saved.emit();
          subscriber.next();
          subscriber.complete();
        },
        error: (err) => {
          this.saving.set(false);
          this.errorMessage.set(
            (err?.error as { detail?: string } | null)?.detail ?? 'Could not save the additional information.',
          );
          subscriber.error(err);
        },
      });
    });
  }
}

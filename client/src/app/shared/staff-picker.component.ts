import { ChangeDetectionStrategy, Component, ElementRef, forwardRef, HostListener, computed, inject, input, signal, viewChild } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { CmhwOptionDto } from '../core/api-models';
import { StaffDirectoryService } from './staff-directory.service';

/**
 * Searchable staff picker — replaces raw GUID inputs and long unfiltered `<select>`s anywhere a
 * staff member is chosen (follow-up assignee, action owner, CMHW allocation, filters).
 *
 * Implements ControlValueAccessor, so it works with `formControlName`, `[(ngModel)]` and
 * template-driven forms exactly like a native control. The hub's staff list is small and
 * cached, so filtering happens client-side with no request per keystroke.
 */
@Component({
  selector: 'emhip-staff-picker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => StaffPickerComponent), multi: true }],
  template: `
    <div class="picker" [class.picker--open]="open()" [class.picker--disabled]="disabled()">
      <button
        type="button"
        class="picker__control"
        [disabled]="disabled()"
        [attr.aria-expanded]="open()"
        aria-haspopup="listbox"
        (click)="toggle()"
      >
        <span class="picker__value" [class.picker__value--empty]="!selectedLabel()">
          {{ selectedLabel() || placeholder() }}
        </span>
        @if (selectedLabel() && allowClear()) {
          <span class="picker__clear" role="button" tabindex="0" aria-label="Clear selection"
                (click)="clear($event)" (keydown.enter)="clear($event)">×</span>
        }
        <svg class="picker__chevron" width="10" height="6" viewBox="0 0 10 6" aria-hidden="true">
          <path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" />
        </svg>
      </button>

      @if (open()) {
        <div class="picker__panel">
          <input
            #search
            type="text"
            class="picker__search"
            [placeholder]="searchPlaceholder()"
            [value]="query()"
            (input)="onQuery($event)"
            (keydown)="onKeydown($event)"
            aria-label="Search staff"
          />
          <ul class="picker__list" role="listbox">
            @for (option of filtered(); track option.id; let i = $index) {
              <li
                role="option"
                class="picker__option"
                [class.picker__option--active]="i === activeIndex()"
                [attr.aria-selected]="option.id === value()"
                (mouseenter)="activeIndex.set(i)"
                (mousedown)="$event.preventDefault()"
                (click)="select(option)"
              >
                <span class="picker__option-name">{{ option.displayName }}</span>
                @if (option.id === value()) {
                  <span class="picker__option-check">✓</span>
                }
              </li>
            } @empty {
              <li class="picker__empty">{{ loading() ? 'Loading staff…' : 'No matching staff' }}</li>
            }
          </ul>
        </div>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .picker {
        position: relative;
      }
      .picker__control {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 8px;
        min-height: 38px;
        padding: 8px 12px;
        border: 1px solid #dcdcdc;
        border-radius: 8px;
        background: #ffffff;
        font: inherit;
        font-size: 13px;
        color: #1a1a1a;
        cursor: pointer;
        text-align: left;
      }
      .picker__control:disabled {
        background: #f6f6f6;
        color: #8f8f8f;
        cursor: not-allowed;
      }
      .picker--open .picker__control {
        border-color: #e12628;
        box-shadow: 0 0 0 3px rgba(225, 38, 40, 0.1);
      }
      .picker__value {
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .picker__value--empty {
        color: #8f8f8f;
      }
      .picker__clear {
        color: #8f8f8f;
        font-size: 16px;
        line-height: 1;
        padding: 0 2px;
      }
      .picker__clear:hover {
        color: #e12628;
      }
      .picker__chevron {
        color: #6b6b6b;
        flex-shrink: 0;
      }
      .picker__panel {
        position: absolute;
        z-index: 40;
        top: calc(100% + 4px);
        left: 0;
        right: 0;
        background: #ffffff;
        border: 1px solid #e5e5e5;
        border-radius: 10px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
        overflow: hidden;
      }
      .picker__search {
        width: 100%;
        border: none;
        border-bottom: 1px solid #ededed;
        padding: 10px 12px;
        font: inherit;
        font-size: 13px;
        outline: none;
      }
      .picker__list {
        list-style: none;
        margin: 0;
        padding: 4px;
        max-height: 240px;
        overflow-y: auto;
      }
      .picker__option {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding: 8px 10px;
        border-radius: 6px;
        font-size: 13px;
        cursor: pointer;
      }
      .picker__option--active {
        background: #f6f6f6;
      }
      .picker__option-check {
        color: #e12628;
        font-weight: 700;
      }
      .picker__empty {
        padding: 12px;
        text-align: center;
        color: #8f8f8f;
        font-size: 13px;
      }
    `,
  ],
})
export class StaffPickerComponent implements ControlValueAccessor {
  private readonly directory = inject(StaffDirectoryService);
  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('search');

  readonly placeholder = input('Select a staff member');
  readonly searchPlaceholder = input('Search staff…');
  readonly allowClear = input(true);
  /**
   * Fallback label for a staff id that isn't in the directory — e.g. a worker who has since
   * been deactivated. Without it the control would show its placeholder while a value is
   * actually set, which reads as "nothing selected".
   */
  readonly initialLabel = input<string | null>(null);

  readonly value = signal<string | null>(null);
  readonly disabled = signal(false);
  readonly open = signal(false);
  readonly query = signal('');
  readonly activeIndex = signal(0);

  readonly options = this.directory.options;
  readonly loading = this.directory.loading;

  readonly filtered = computed(() => {
    const term = this.query().trim().toLowerCase();
    const all = this.options();
    return term ? all.filter((o) => o.displayName.toLowerCase().includes(term)) : all;
  });

  readonly selectedLabel = computed(() => {
    const id = this.value();
    if (!id) return '';
    const match = this.options().find((o) => o.id === id);
    if (match) return match.displayName;
    // Value set but unknown to the directory: show the caller's label, or a neutral marker
    // while the directory is still loading, rather than implying nothing is selected.
    return this.initialLabel() ?? (this.loading() ? 'Loading…' : 'Unknown staff member');
  });

  private onChange: (value: string | null) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(private readonly host: ElementRef<HTMLElement>) {
    this.directory.ensureLoaded();
  }

  writeValue(value: string | null): void {
    this.value.set(value ?? null);
  }

  registerOnChange(fn: (value: string | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  toggle(): void {
    if (this.disabled()) return;
    const next = !this.open();
    this.open.set(next);
    if (next) {
      this.query.set('');
      this.activeIndex.set(0);
      // Focus the search box once the panel has rendered.
      queueMicrotask(() => this.searchInput()?.nativeElement.focus());
    } else {
      this.onTouched();
    }
  }

  onQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
    this.activeIndex.set(0);
  }

  onKeydown(event: KeyboardEvent): void {
    const options = this.filtered();
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.activeIndex.set(options.length ? (this.activeIndex() + 1) % options.length : 0);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.activeIndex.set(options.length ? (this.activeIndex() - 1 + options.length) % options.length : 0);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const option = options[this.activeIndex()];
      if (option) this.select(option);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
    }
  }

  select(option: CmhwOptionDto): void {
    this.value.set(option.id);
    this.onChange(option.id);
    this.close();
  }

  clear(event: Event): void {
    event.stopPropagation();
    this.value.set(null);
    this.onChange(null);
  }

  private close(): void {
    this.open.set(false);
    this.onTouched();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) {
      this.close();
    }
  }
}

import { ChangeDetectionStrategy, Component, ElementRef, forwardRef, HostListener, effect, inject, input, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { catchError, debounceTime, distinctUntilChanged, of, switchMap, tap } from 'rxjs';
import { GuestStatus, GuestSuggestionDto } from '../core/api-models';
import { GuestsApiService } from '../core/guests-api.service';

/**
 * Type-ahead guest picker — the searchable replacement for any field that takes a guest id.
 * Queries GET /guests/suggest (name or "G-1042" reference) with debouncing, and keeps the
 * chosen guest's label so the control reads as a name, never a GUID.
 *
 * Implements ControlValueAccessor so it drops into reactive and template-driven forms. When a
 * form loads with an existing guest id, pass `initialLabel` to show its name without a lookup.
 */
@Component({
  selector: 'emhip-guest-picker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => GuestPickerComponent), multi: true }],
  template: `
    <div class="gpicker" [class.gpicker--disabled]="disabled()">
      @if (value() && selectedLabel()) {
        <div class="gpicker__selected">
          <span class="gpicker__selected-name">{{ selectedLabel() }}</span>
          @if (!disabled()) {
            <button type="button" class="gpicker__remove" aria-label="Change guest" (click)="clear()">×</button>
          }
        </div>
      } @else {
        <input
          #search
          type="text"
          class="gpicker__input"
          [placeholder]="placeholder()"
          [disabled]="disabled()"
          [value]="query()"
          (input)="onQuery($event)"
          (keydown)="onKeydown($event)"
          (focus)="open.set(true)"
          role="combobox"
          [attr.aria-expanded]="showPanel()"
          aria-autocomplete="list"
        />
      }

      @if (showPanel()) {
        <ul class="gpicker__list" role="listbox">
          @if (searching()) {
            <li class="gpicker__hint">Searching…</li>
          } @else {
            @for (guest of results(); track guest.id; let i = $index) {
              <li
                role="option"
                class="gpicker__option"
                [class.gpicker__option--active]="i === activeIndex()"
                [attr.aria-selected]="i === activeIndex()"
                (mouseenter)="activeIndex.set(i)"
                (mousedown)="$event.preventDefault()"
                (click)="select(guest)"
              >
                <span class="gpicker__option-name">{{ guest.fullName }}</span>
                <span class="gpicker__option-meta">
                  <span class="gpicker__ref">G-{{ guest.guestNumber }}</span>
                  <span class="gpicker__status" [class]="'gpicker__status--' + guest.status.toLowerCase()">
                    {{ statusLabel(guest.status) }}
                  </span>
                </span>
              </li>
            } @empty {
              <li class="gpicker__hint">No guests match “{{ query() }}”</li>
            }
          }
        </ul>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .gpicker {
        position: relative;
      }
      .gpicker__input {
        width: 100%;
        min-height: 38px;
        padding: 8px 12px;
        border: 1px solid #dcdcdc;
        border-radius: 8px;
        font: inherit;
        font-size: 13px;
        outline: none;
      }
      .gpicker__input:focus {
        border-color: #e12628;
        box-shadow: 0 0 0 3px rgba(225, 38, 40, 0.1);
      }
      .gpicker__input:disabled {
        background: #f6f6f6;
        color: #8f8f8f;
      }
      .gpicker__selected {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        min-height: 38px;
        padding: 8px 12px;
        border: 1px solid #dcdcdc;
        border-radius: 8px;
        background: #fafafa;
        font-size: 13px;
      }
      .gpicker__selected-name {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .gpicker__remove {
        border: none;
        background: none;
        color: #8f8f8f;
        font-size: 17px;
        line-height: 1;
        cursor: pointer;
      }
      .gpicker__remove:hover {
        color: #e12628;
      }
      .gpicker__list {
        position: absolute;
        z-index: 40;
        top: calc(100% + 4px);
        left: 0;
        right: 0;
        list-style: none;
        margin: 0;
        padding: 4px;
        max-height: 260px;
        overflow-y: auto;
        background: #ffffff;
        border: 1px solid #e5e5e5;
        border-radius: 10px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
      }
      .gpicker__option {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 8px 10px;
        border-radius: 6px;
        font-size: 13px;
        cursor: pointer;
      }
      .gpicker__option--active {
        background: #f6f6f6;
      }
      .gpicker__option-name {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .gpicker__option-meta {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-shrink: 0;
      }
      .gpicker__ref {
        color: #8f8f8f;
        font-size: 12px;
      }
      .gpicker__status {
        font-size: 11px;
        font-weight: 600;
        padding: 2px 8px;
        border-radius: 200px;
        background: #f1f1f1;
        color: #4b4b4b;
      }
      .gpicker__status--active {
        background: #eafdee;
        color: #147129;
      }
      .gpicker__status--new {
        background: #fff9e4;
        color: #9d852d;
      }
      .gpicker__status--onhold {
        background: #e7eeff;
        color: #345bb1;
      }
      .gpicker__hint {
        padding: 12px;
        text-align: center;
        color: #8f8f8f;
        font-size: 13px;
      }
    `,
  ],
})
export class GuestPickerComponent implements ControlValueAccessor {
  private readonly guestsApi = inject(GuestsApiService);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('search');

  readonly placeholder = input('Search guests by name or reference…');
  /** Shows the guest's name when the form loads with an id already selected. */
  readonly initialLabel = input<string | null>(null);

  readonly value = signal<string | null>(null);
  readonly selectedLabel = signal('');
  readonly disabled = signal(false);
  readonly open = signal(false);
  readonly query = signal('');
  readonly results = signal<GuestSuggestionDto[]>([]);
  readonly searching = signal(false);
  readonly activeIndex = signal(0);

  private onChange: (value: string | null) => void = () => {};
  private onTouched: () => void = () => {};

  constructor() {
    // The server returns nothing under two characters, so don't even ask.
    toObservable(this.query)
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        tap((term) => this.searching.set(term.trim().length >= 2)),
        switchMap((term) =>
          term.trim().length < 2
            ? of<GuestSuggestionDto[]>([])
            : this.guestsApi.suggest(term.trim()).pipe(catchError(() => of<GuestSuggestionDto[]>([]))),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((results) => {
        this.results.set(results);
        this.searching.set(false);
        this.activeIndex.set(0);
      });

    effect(() => {
      const label = this.initialLabel();
      if (label && this.value() && !this.selectedLabel()) this.selectedLabel.set(label);
    });
  }

  readonly showPanel = () => this.open() && !this.value() && this.query().trim().length >= 2;

  writeValue(value: string | null): void {
    this.value.set(value ?? null);
    if (!value) this.selectedLabel.set('');
    else if (this.initialLabel()) this.selectedLabel.set(this.initialLabel()!);
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

  onQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
    this.open.set(true);
  }

  onKeydown(event: KeyboardEvent): void {
    const options = this.results();
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.activeIndex.set(options.length ? (this.activeIndex() + 1) % options.length : 0);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.activeIndex.set(options.length ? (this.activeIndex() - 1 + options.length) % options.length : 0);
    } else if (event.key === 'Enter') {
      const option = options[this.activeIndex()];
      if (option) {
        event.preventDefault();
        this.select(option);
      }
    } else if (event.key === 'Escape') {
      this.open.set(false);
    }
  }

  select(guest: GuestSuggestionDto): void {
    this.value.set(guest.id);
    this.selectedLabel.set(`${guest.fullName} · G-${guest.guestNumber}`);
    this.query.set('');
    this.results.set([]);
    this.open.set(false);
    this.onChange(guest.id);
    this.onTouched();
  }

  clear(): void {
    this.value.set(null);
    this.selectedLabel.set('');
    this.query.set('');
    this.onChange(null);
    // Return focus to the search box so the user can immediately type again.
    queueMicrotask(() => this.searchInput()?.nativeElement.focus());
  }

  statusLabel(status: GuestStatus): string {
    return status === 'OnHold' ? 'On hold' : status;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
      this.onTouched();
    }
  }
}

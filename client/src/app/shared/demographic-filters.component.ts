import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  Injector,
  WritableSignal,
  afterNextRender,
  computed,
  inject,
  model,
  signal,
  viewChild,
} from '@angular/core';
import { AGE_BANDS, LookupItemDto } from '../core/api-models';
import { LookupCategories, SettingsApiService } from '../core/settings-api.service';

/** The four demographic filters the guest endpoint accepts; '' means "not filtered". */
export interface DemographicFilterValue {
  ethnicity: string;
  /** An AGE_BANDS label, resolved to ageMin/ageMax by demographicFilterParams(). */
  ageBand: string;
  gender: string;
  countryOfOrigin: string;
}

export const EMPTY_DEMOGRAPHIC_FILTERS: DemographicFilterValue = {
  ethnicity: '',
  ageBand: '',
  gender: '',
  countryOfOrigin: '',
};

/** Which demographic filter a toolbar chip removes. */
export type DemographicFilterKey = keyof DemographicFilterValue;

/** Translates the drawer's value into the GET /guests query params it maps to. */
export function demographicFilterParams(value: DemographicFilterValue): {
  ethnicity?: string;
  gender?: string;
  countryOfOrigin?: string;
  ageMin?: number;
  ageMax?: number;
} {
  const band = AGE_BANDS.find((b) => b.label === value.ageBand);
  return {
    ethnicity: value.ethnicity || undefined,
    gender: value.gender || undefined,
    countryOfOrigin: value.countryOfOrigin || undefined,
    ageMin: band?.ageMin,
    ageMax: band?.ageMax,
  };
}

export function demographicFilterCount(value: DemographicFilterValue): number {
  return (value.ethnicity ? 1 : 0) + (value.ageBand ? 1 : 0) + (value.gender ? 1 : 0) + (value.countryOfOrigin ? 1 : 0);
}

/** Load state of one admin-maintained lookup list backing a drawer dropdown. */
type LookupState = 'loading' | 'ready' | 'empty' | 'error';

/** Must match .filter-drawer's width in the stylesheet. */
const PANEL_WIDTH = 280;
const PANEL_GUTTER = 8;

/**
 * The "Additional Filters" drawer from the Guest Report tab (Desktop66), lifted into a shared
 * control so the Guest page filters on the same demographics — ethnicity, age group, gender and
 * country of origin — through the same GET /guests query params.
 *
 * Renders a "Filters" trigger (with an applied-count badge), the anchored drawer, and the
 * removable chips for whatever is applied. `value` is a two-way model: the host reads it to
 * build its query and re-queries whenever it changes. Drafts inside the drawer only reach the
 * model on "Apply", so a half-finished selection never re-queries the list.
 */
@Component({
  selector: 'emhip-demographic-filters',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './demographic-filters.component.html',
  styleUrl: './demographic-filters.component.scss',
})
export class DemographicFiltersComponent {
  private readonly settingsApi = inject(SettingsApiService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly drawerPanel = viewChild<ElementRef<HTMLElement>>('drawerPanel');

  readonly value = model<DemographicFilterValue>(EMPTY_DEMOGRAPHIC_FILTERS);

  readonly ageBands = AGE_BANDS;
  readonly open = signal(false);
  /**
   * Which edge of the trigger the panel lines up with. 'end' (the default) grows the panel to the
   * left; when the filter row wraps and the trigger sits near the left of the page, that pushes it
   * under the side navigation, where the content area clips it — so it opens to the right instead.
   */
  readonly align = signal<'start' | 'end'>('end');

  readonly draftEthnicity = signal('');
  readonly draftAgeBand = signal('');
  readonly draftGender = signal('');
  readonly draftCountryOfOrigin = signal('');

  readonly ethnicityOptions = signal<LookupItemDto[]>([]);
  readonly genderOptions = signal<LookupItemDto[]>([]);
  readonly countryOptions = signal<LookupItemDto[]>([]);
  readonly ethnicityState = signal<LookupState>('loading');
  readonly genderState = signal<LookupState>('loading');
  readonly countryState = signal<LookupState>('loading');

  readonly activeCount = computed(() => demographicFilterCount(this.value()));

  readonly chips = computed<{ key: DemographicFilterKey; caption: string; value: string }[]>(() => {
    const v = this.value();
    const chips: { key: DemographicFilterKey; caption: string; value: string }[] = [];
    if (v.ethnicity) chips.push({ key: 'ethnicity', caption: 'Ethnicity', value: v.ethnicity });
    if (v.ageBand) chips.push({ key: 'ageBand', caption: 'Age', value: v.ageBand });
    if (v.gender) chips.push({ key: 'gender', caption: 'Gender', value: v.gender });
    if (v.countryOfOrigin) chips.push({ key: 'countryOfOrigin', caption: 'Country of origin', value: v.countryOfOrigin });
    return chips;
  });

  constructor() {
    this.loadLookup(LookupCategories.Ethnicity, this.ethnicityOptions, this.ethnicityState);
    this.loadLookup(LookupCategories.Gender, this.genderOptions, this.genderState);
    this.loadLookup(LookupCategories.CountryOfOrigin, this.countryOptions, this.countryState);
  }

  toggle(): void {
    if (this.open()) {
      this.close();
      return;
    }
    // Re-seed the drafts from what's applied, so reopening never shows stale edits.
    const v = this.value();
    this.draftEthnicity.set(v.ethnicity);
    this.draftAgeBand.set(v.ageBand);
    this.draftGender.set(v.gender);
    this.draftCountryOfOrigin.set(v.countryOfOrigin);
    this.align.set(this.pickAlignment());
    this.open.set(true);
    // The app runs zoneless, so wait for the render that adds the panel before focusing it.
    afterNextRender(() => this.drawerPanel()?.nativeElement.querySelector('select')?.focus(), {
      injector: this.injector,
    });
  }

  close(): void {
    this.open.set(false);
  }

  /** Anchor on the side with room for the whole panel inside the nearest clipping container. */
  private pickAlignment(): 'start' | 'end' {
    const trigger = this.host.nativeElement.querySelector<HTMLElement>('.filter-menu__trigger');
    if (!trigger) return 'end';
    const t = trigger.getBoundingClientRect();
    const bounds = this.clippingBounds(trigger);
    const roomLeft = t.right - bounds.left;
    const roomRight = bounds.right - t.left;
    if (roomLeft >= PANEL_WIDTH + PANEL_GUTTER) return 'end';
    return roomRight >= roomLeft ? 'start' : 'end';
  }

  /** The closest ancestor that clips overflow (the page's scrolling content area), else the viewport. */
  private clippingBounds(from: HTMLElement): { left: number; right: number } {
    for (let el = from.parentElement; el && el !== document.body; el = el.parentElement) {
      const style = getComputedStyle(el);
      if (style.overflowX !== 'visible' || style.overflow !== 'visible') {
        const r = el.getBoundingClientRect();
        return { left: r.left, right: r.right };
      }
    }
    return { left: 0, right: window.innerWidth };
  }

  onDraftChange(key: DemographicFilterKey, event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (key === 'ethnicity') this.draftEthnicity.set(value);
    else if (key === 'ageBand') this.draftAgeBand.set(value);
    else if (key === 'gender') this.draftGender.set(value);
    else this.draftCountryOfOrigin.set(value);
  }

  /** "Apply" — commits the drafts to the model (the host re-queries). */
  apply(): void {
    this.value.set({
      ethnicity: this.draftEthnicity(),
      ageBand: this.draftAgeBand(),
      gender: this.draftGender(),
      countryOfOrigin: this.draftCountryOfOrigin(),
    });
    this.close();
  }

  /** "Clear all" — drops every demographic filter, drafts included. */
  clearAll(): void {
    this.draftEthnicity.set('');
    this.draftAgeBand.set('');
    this.draftGender.set('');
    this.draftCountryOfOrigin.set('');
    if (this.activeCount() > 0) this.value.set(EMPTY_DEMOGRAPHIC_FILTERS);
    this.close();
  }

  /** Chip "×" — removes one applied filter. */
  remove(key: DemographicFilterKey): void {
    this.value.set({ ...this.value(), [key]: '' });
  }

  lookupHint(state: LookupState): string | null {
    if (state === 'loading') return 'Loading options…';
    if (state === 'empty') return 'Not configured in Settings → Lookups.';
    if (state === 'error') return "Couldn't load options — check Settings → Lookups.";
    return null;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open()) this.close();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.open()) return;
    const menu = this.host.nativeElement.querySelector('.filter-menu');
    if (menu && !menu.contains(event.target as Node)) this.close();
  }

  /** Active lookup options only — deactivated ones stay out of the filter dropdowns. */
  private loadLookup(category: string, target: WritableSignal<LookupItemDto[]>, state: WritableSignal<LookupState>): void {
    state.set('loading');
    this.settingsApi.getLookups(category).subscribe({
      next: (items) => {
        const active = items.filter((item) => item.isActive);
        target.set(active);
        state.set(active.length ? 'ready' : 'empty');
      },
      error: () => {
        target.set([]);
        state.set('error');
      },
    });
  }
}

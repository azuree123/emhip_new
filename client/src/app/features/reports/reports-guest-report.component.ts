import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  Injector,
  OnDestroy,
  OnInit,
  WritableSignal,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  AGE_BANDS,
  GuestListItemDto,
  GuestStatus,
  LookupItemDto,
  PathwayCategory,
} from '../../core/api-models';
import { GuestsApiService } from '../../core/guests-api.service';
import { LookupCategories, SettingsApiService } from '../../core/settings-api.service';
import { StaffPickerComponent } from '../../shared/staff-picker.component';
import { CATEGORY_META, STATUS_META, pathwayCategoryLabel, shortDay } from './report-meta';

const PAGE_SIZE = 10;

/** Which demographic filter a toolbar chip removes. */
type DemographicKey = 'ethnicity' | 'ageBand' | 'gender' | 'countryOfOrigin';

/** Load state of one admin-maintained lookup list backing a drawer dropdown. */
type LookupState = 'loading' | 'ready' | 'empty' | 'error';

/**
 * "Guest Report" tab — the searchable/filterable guest table from Desktop66
 * (project/screens/Components.bundle.js lines 92043-95267), backed by the real
 * keyset-paged GET /guests endpoint. The source draws numbered pagination
 * (pages 1..8); keyset paging has no page addresses, so honest Prev/Next paging
 * is rendered instead — the endpoint does return a filtered total on the first
 * page, so the design's "Showing 1 to 10 of 11 entries" caption is kept.
 *
 * The design's "Filters" button opens the "Additional Filters" drawer, which
 * carries the demographic filters (ethnicity, age group, gender, country of
 * origin) that the endpoint accepts alongside the inline status/pathway/CMHW/date
 * dropdowns.
 */
@Component({
  selector: 'app-reports-guest-report',
  standalone: true,
  imports: [RouterLink, FormsModule, StaffPickerComponent],
  templateUrl: './reports-guest-report.component.html',
  styleUrl: './reports-guest-report.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportsGuestReportComponent implements OnInit, OnDestroy {
  private readonly guestsApi = inject(GuestsApiService);
  private readonly settingsApi = inject(SettingsApiService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly drawerPanel = viewChild<ElementRef<HTMLElement>>('drawerPanel');

  /** Preselected CMHW filter — set by the Caseload tab's "View" drill-down. */
  readonly initialCmhw = input('');

  /** Engagement statuses only (spec §4.7) — urgency is a separate flag, not a status. */
  readonly statusOptions: { value: GuestStatus; label: string }[] = [
    { value: 'New', label: 'New' },
    { value: 'Active', label: 'Active' },
    { value: 'OnHold', label: 'On hold' },
  ];

  readonly pathwayOptions: { value: PathwayCategory; label: string }[] = (
    Object.keys(CATEGORY_META) as PathwayCategory[]
  ).map((value) => ({ value, label: CATEGORY_META[value].label }));

  readonly activityOptions = [
    { value: '7', label: 'Last 7 days' },
    { value: '30', label: 'Last 30 days' },
    { value: '90', label: 'Last 90 days' },
  ];

  /** Age bands offered by the drawer — the shared constant, so client and server agree. */
  readonly ageBands = AGE_BANDS;

  // Filters (all map 1:1 to real GET /guests query params).
  readonly q = signal('');
  readonly status = signal<'' | GuestStatus>('');
  readonly pathway = signal<'' | PathwayCategory>('');
  readonly cmhw = signal('');
  readonly lastActivityDays = signal('');

  // ---- "Additional filters" drawer (Desktop66) -----------------------------
  // Applied values drive the query; drafts hold what's typed in the open drawer until
  // "Apply" is pressed, so a half-finished selection never re-queries the list.
  readonly ethnicity = signal('');
  readonly ageBand = signal('');
  readonly gender = signal('');
  readonly countryOfOrigin = signal('');

  readonly draftEthnicity = signal('');
  readonly draftAgeBand = signal('');
  readonly draftGender = signal('');
  readonly draftCountryOfOrigin = signal('');

  readonly drawerOpen = signal(false);

  // Admin-maintained option lists (Settings → Lookups). Each keeps its own load state so a
  // missing or failing category only disables its own dropdown.
  readonly ethnicityOptions = signal<LookupItemDto[]>([]);
  readonly genderOptions = signal<LookupItemDto[]>([]);
  readonly countryOptions = signal<LookupItemDto[]>([]);
  readonly ethnicityState = signal<LookupState>('loading');
  readonly genderState = signal<LookupState>('loading');
  readonly countryState = signal<LookupState>('loading');

  /** Badge on the red "Filters" button — how many demographic filters are applied. */
  readonly activeFilterCount = computed(
    () =>
      (this.ethnicity() ? 1 : 0) +
      (this.ageBand() ? 1 : 0) +
      (this.gender() ? 1 : 0) +
      (this.countryOfOrigin() ? 1 : 0),
  );

  /** Removable toolbar chips, so what's applied stays visible with the drawer closed. */
  readonly activeChips = computed<{ key: DemographicKey; caption: string; value: string }[]>(() => {
    const chips: { key: DemographicKey; caption: string; value: string }[] = [];
    if (this.ethnicity()) chips.push({ key: 'ethnicity', caption: 'Ethnicity', value: this.ethnicity() });
    if (this.ageBand()) chips.push({ key: 'ageBand', caption: 'Age', value: this.ageBand() });
    if (this.gender()) chips.push({ key: 'gender', caption: 'Gender', value: this.gender() });
    if (this.countryOfOrigin())
      chips.push({ key: 'countryOfOrigin', caption: 'Country of origin', value: this.countryOfOrigin() });
    return chips;
  });

  readonly items = signal<GuestListItemDto[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly hasMore = signal(false);
  readonly pageIndex = signal(0);
  /** Server-side total for the applied filters; only the first page carries it. */
  readonly totalCount = signal<number | null>(null);

  /** "Showing X to Y of Z entries" (Desktop66) — 1-based, over the applied filters. */
  readonly rangeStart = computed(() => (this.items().length === 0 ? 0 : this.pageIndex() * PAGE_SIZE + 1));
  readonly rangeEnd = computed(() => this.pageIndex() * PAGE_SIZE + this.items().length);

  private nextCursor: string | null = null;
  private currentCursor: string | undefined;
  private prevCursors: (string | undefined)[] = [];
  private searchTimer: ReturnType<typeof setTimeout> | undefined;

  ngOnInit(): void {
    // The Caseload drill-down hands over a staff id; the shared picker resolves it to that
    // person's name from the cached staff directory, so no options are fetched here.
    if (this.initialCmhw()) this.cmhw.set(this.initialCmhw());
    this.loadLookup(LookupCategories.Ethnicity, this.ethnicityOptions, this.ethnicityState);
    this.loadLookup(LookupCategories.Gender, this.genderOptions, this.genderState);
    this.loadLookup(LookupCategories.CountryOfOrigin, this.countryOptions, this.countryState);
    this.load();
  }

  ngOnDestroy(): void {
    if (this.searchTimer !== undefined) clearTimeout(this.searchTimer);
  }

  onSearchInput(event: Event): void {
    this.q.set((event.target as HTMLInputElement).value.trim());
    if (this.searchTimer !== undefined) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.resetAndLoad(), 300);
  }

  onStatusChange(event: Event): void {
    this.status.set((event.target as HTMLSelectElement).value as '' | GuestStatus);
    this.resetAndLoad();
  }

  onPathwayChange(event: Event): void {
    this.pathway.set((event.target as HTMLSelectElement).value as '' | PathwayCategory);
    this.resetAndLoad();
  }

  /** The staff picker emits null when cleared, which is the "All CMHW" state. */
  onCmhwChange(staffId: string | null): void {
    this.cmhw.set(staffId ?? '');
    this.resetAndLoad();
  }

  onActivityChange(event: Event): void {
    this.lastActivityDays.set((event.target as HTMLSelectElement).value);
    this.resetAndLoad();
  }

  // ---- Drawer ---------------------------------------------------------------

  toggleDrawer(): void {
    if (this.drawerOpen()) {
      this.closeDrawer();
      return;
    }
    // Re-seed the drafts from what's applied, so reopening never shows stale edits.
    this.draftEthnicity.set(this.ethnicity());
    this.draftAgeBand.set(this.ageBand());
    this.draftGender.set(this.gender());
    this.draftCountryOfOrigin.set(this.countryOfOrigin());
    this.drawerOpen.set(true);
    // The app runs zoneless, so wait for the render that adds the panel before focusing it.
    afterNextRender(() => this.drawerPanel()?.nativeElement.querySelector('select')?.focus(), {
      injector: this.injector,
    });
  }

  closeDrawer(): void {
    this.drawerOpen.set(false);
  }

  onDraftChange(key: DemographicKey, event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (key === 'ethnicity') this.draftEthnicity.set(value);
    else if (key === 'ageBand') this.draftAgeBand.set(value);
    else if (key === 'gender') this.draftGender.set(value);
    else this.draftCountryOfOrigin.set(value);
  }

  /** "Apply" — commits the drafts and re-queries from the first page. */
  applyDrawer(): void {
    this.ethnicity.set(this.draftEthnicity());
    this.ageBand.set(this.draftAgeBand());
    this.gender.set(this.draftGender());
    this.countryOfOrigin.set(this.draftCountryOfOrigin());
    this.closeDrawer();
    this.resetAndLoad();
  }

  /** "Clear all" — drops every demographic filter (drafts included) and re-queries. */
  clearDemographics(): void {
    this.draftEthnicity.set('');
    this.draftAgeBand.set('');
    this.draftGender.set('');
    this.draftCountryOfOrigin.set('');
    const hadFilters = this.activeFilterCount() > 0;
    this.ethnicity.set('');
    this.ageBand.set('');
    this.gender.set('');
    this.countryOfOrigin.set('');
    if (hadFilters) this.resetAndLoad();
  }

  /** Chip "×" — removes one applied filter and re-queries. */
  removeChip(key: DemographicKey): void {
    if (key === 'ethnicity') {
      this.ethnicity.set('');
      this.draftEthnicity.set('');
    } else if (key === 'ageBand') {
      this.ageBand.set('');
      this.draftAgeBand.set('');
    } else if (key === 'gender') {
      this.gender.set('');
      this.draftGender.set('');
    } else {
      this.countryOfOrigin.set('');
      this.draftCountryOfOrigin.set('');
    }
    this.resetAndLoad();
  }

  /**
   * Hint under a dropdown whose options can't be offered. Empty and failed loads both
   * disable the control — the difference is only whether it's worth retrying.
   */
  lookupHint(state: LookupState): string | null {
    if (state === 'loading') return 'Loading options…';
    if (state === 'empty') return 'Not configured in Settings → Lookups.';
    if (state === 'error') return "Couldn't load options — check Settings → Lookups.";
    return null;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.drawerOpen()) this.closeDrawer();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.drawerOpen()) return;
    const menu = this.host.nativeElement.querySelector('.filter-menu');
    if (menu && !menu.contains(event.target as Node)) this.closeDrawer();
  }

  nextPage(): void {
    if (!this.hasMore() || this.nextCursor === null || this.loading()) return;
    this.prevCursors.push(this.currentCursor);
    this.currentCursor = this.nextCursor;
    this.pageIndex.set(this.pageIndex() + 1);
    this.load();
  }

  prevPage(): void {
    if (this.prevCursors.length === 0 || this.loading()) return;
    this.currentCursor = this.prevCursors.pop();
    this.pageIndex.set(this.pageIndex() - 1);
    this.load();
  }

  initials(guest: GuestListItemDto): string {
    return `${guest.firstName.charAt(0)}${guest.lastName.charAt(0)}`.toUpperCase();
  }

  statusLabel(status: GuestStatus): string {
    return STATUS_META[status]?.label ?? status;
  }

  statusClass(status: GuestStatus): string {
    return STATUS_META[status]?.pillClass ?? 'status-pill--onhold';
  }

  pathwayLabel(category: string | null): string {
    return pathwayCategoryLabel(category);
  }

  lastActivity(guest: GuestListItemDto): string {
    return shortDay(guest.lastContactAt);
  }

  private resetAndLoad(): void {
    this.prevCursors = [];
    this.currentCursor = undefined;
    this.pageIndex.set(0);
    // The total is per filter-set; drop it so a stale count never labels the new results.
    this.totalCount.set(null);
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(null);
    const band = AGE_BANDS.find((b) => b.label === this.ageBand());
    this.guestsApi
      .getGuestList({
        q: this.q() || undefined,
        status: this.status() || undefined,
        pathway: this.pathway() || undefined,
        cmhw: this.cmhw() || undefined,
        lastActivityDays: this.lastActivityDays() ? Number(this.lastActivityDays()) : undefined,
        ethnicity: this.ethnicity() || undefined,
        gender: this.gender() || undefined,
        countryOfOrigin: this.countryOfOrigin() || undefined,
        ageMin: band?.ageMin,
        ageMax: band?.ageMax,
        cursor: this.currentCursor,
        pageSize: PAGE_SIZE,
      })
      .subscribe({
        next: (page) => {
          this.items.set(page.items);
          this.nextCursor = page.nextCursor;
          this.hasMore.set(page.hasMore && page.nextCursor !== null);
          // Only the first page carries totalCount; keep the carried value on later pages.
          if (page.totalCount !== null) this.totalCount.set(page.totalCount);
          this.loading.set(false);
        },
        error: (err) => {
          this.items.set([]);
          this.nextCursor = null;
          this.hasMore.set(false);
          this.totalCount.set(null);
          this.error.set(err?.message ?? 'Unable to load the guest list.');
          this.loading.set(false);
        },
      });
  }

  /** Active lookup options only — deactivated ones stay out of the filter dropdowns. */
  private loadLookup(
    category: string,
    target: WritableSignal<LookupItemDto[]>,
    state: WritableSignal<LookupState>,
  ): void {
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

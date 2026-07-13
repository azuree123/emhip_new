import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { GuestOverviewDto } from '../../core/api-models';
import { GuestsApiService } from '../../core/guests-api.service';
import { GuestOverviewTabComponent } from './guest-overview-tab.component';
import { GuestDemographicsTabComponent } from './guest-demographics-tab.component';
import { GuestClinicalTabComponent } from './guest-clinical-tab.component';
import { GuestPathwayTabComponent } from './guest-pathway-tab.component';
import { GuestFollowUpTabComponent } from './guest-followup-tab.component';
import { GuestNotesTabComponent } from './guest-notes-tab.component';
import { formatDate, initials, statusChip } from './guest-workspace.util';

type TabId = 'overview' | 'demographics' | 'clinical' | 'pathway' | 'followup' | 'notes';

interface TabDef {
  id: TabId;
  label: string;
}

/**
 * Guest Workspace — a single guest's record. Structured after GuestOverviewTab in
 * project/screens/Components.bundle.js: a shared identity header + segmented tab bar
 * (pixel-matched) that stays mounted while the tab body below it swaps between sibling
 * tab components, each of which fetches its own slice of data from GuestsApiService.
 *
 * The sidebar/top header bar from the source are intentionally omitted — those are
 * rendered once by AppShellComponent around every routed screen.
 */
@Component({
  selector: 'app-guest-workspace',
  standalone: true,
  imports: [
    GuestOverviewTabComponent,
    GuestDemographicsTabComponent,
    GuestClinicalTabComponent,
    GuestPathwayTabComponent,
    GuestFollowUpTabComponent,
    GuestNotesTabComponent,
  ],
  templateUrl: './guest-workspace.component.html',
  styleUrl: './guest-workspace.component.scss',
})
export class GuestWorkspaceComponent {
  private readonly guestsApi = inject(GuestsApiService);

  readonly guestId = input.required<string>();

  readonly tabs: TabDef[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'demographics', label: 'Demographics' },
    { id: 'clinical', label: 'Clinical' },
    { id: 'pathway', label: 'Pathway' },
    { id: 'followup', label: 'Follow-up' },
    { id: 'notes', label: 'Notes' },
  ];
  readonly activeTab = signal<TabId>('overview');

  readonly overview = signal<GuestOverviewDto | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly fullName = computed(() => {
    const o = this.overview();
    return o ? `${o.firstName} ${o.lastName}` : '';
  });
  readonly avatarInitials = computed(() => {
    const o = this.overview();
    return o ? initials(o.firstName, o.lastName) : '';
  });
  readonly chip = computed(() => (this.overview() ? statusChip(this.overview()!.status) : null));
  readonly registeredLabel = computed(() => formatDate(this.overview()?.registeredAt));

  constructor() {
    effect((onCleanup) => {
      const id = this.guestId();
      let cancelled = false;
      onCleanup(() => (cancelled = true));
      this.loadOverview(id, () => cancelled);
    });
  }

  selectTab(id: TabId): void {
    this.activeTab.set(id);
  }

  reloadOverview(): void {
    this.loadOverview(this.guestId(), () => false);
  }

  private loadOverview(guestId: string, isCancelled: () => boolean): void {
    this.loading.set(true);
    this.error.set(null);
    this.guestsApi.getOverview(guestId).subscribe({
      next: (dto) => {
        if (isCancelled()) return;
        this.overview.set(dto);
        this.loading.set(false);
      },
      error: () => {
        if (isCancelled()) return;
        this.error.set('Could not load this guest’s overview. The service may be unavailable.');
        this.loading.set(false);
      },
    });
  }
}

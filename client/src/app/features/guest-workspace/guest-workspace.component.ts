import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
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
  private readonly location = inject(Location);
  private readonly router = inject(Router);

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
  /** Set by the header quick-action buttons so the target tab opens with its form expanded. */
  readonly pendingAction = signal<'contact' | 'risk' | null>(null);

  readonly overview = signal<GuestOverviewDto | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly exporting = signal(false);

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

  /** Header back button (design: 36px outline square with left arrow). Falls back to the
   *  guest list when there is no browser history to go back to (e.g. deep link). */
  goBack(): void {
    if (window.history.length > 1) {
      this.location.back();
    } else {
      this.router.navigateByUrl('/guests');
    }
  }

  selectTab(id: TabId): void {
    this.pendingAction.set(null);
    this.activeTab.set(id);
  }

  /** Urgent flags are raised by recording a risk assessment — jump to Clinical with the form open. */
  raiseUrgentFlag(): void {
    this.activeTab.set('clinical');
    this.pendingAction.set('risk');
  }

  addContact(): void {
    this.activeTab.set('overview');
    this.pendingAction.set('contact');
  }

  /** Downloads the guest's full record as JSON. Sections the user may not view (403) export as null. */
  exportRecord(): void {
    const guest = this.overview();
    if (!guest || this.exporting()) return;
    this.exporting.set(true);

    const id = this.guestId();
    const section = <T>(obs: Observable<T>): Observable<T | null> => obs.pipe(catchError(() => of(null)));
    forkJoin({
      overview: of(guest),
      demographics: section(this.guestsApi.getDemographics(id)),
      clinical: section(this.guestsApi.getClinical(id)),
      pathway: section(this.guestsApi.getPathway(id)),
      followUps: section(this.guestsApi.getFollowUps(id)),
      initialConversation: section(this.guestsApi.getInitialConversation(id)),
    }).subscribe((record) => {
      this.exporting.set(false);
      const blob = new Blob(
        [JSON.stringify({ exportedAt: new Date().toISOString(), ...record }, null, 2)],
        { type: 'application/json' },
      );
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `guest-record-${guest.firstName}-${guest.lastName}-${id.slice(0, 8)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
    });
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

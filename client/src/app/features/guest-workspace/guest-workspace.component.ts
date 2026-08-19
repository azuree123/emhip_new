import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { GuestOverviewDto } from '../../core/api-models';
import { AuthService } from '../../core/auth.service';
import { GuestsApiService } from '../../core/guests-api.service';
import { Permissions } from '../../core/permissions';
import { GuestOverviewTabComponent } from './guest-overview-tab.component';
import { GuestDemographicsTabComponent } from './guest-demographics-tab.component';
import { GuestInitialConversationTabComponent } from './guest-initial-conversation-tab.component';
import { GuestClinicalDetailsTabComponent } from './guest-clinical-details-tab.component';
import { GuestDialogTabComponent } from './guest-dialog-tab.component';
import { GuestPathwayTabComponent } from './guest-pathway-tab.component';
import { GuestDocumentsTabComponent } from './guest-documents-tab.component';
import { GuestFollowUpTabComponent } from './guest-followup-tab.component';
import { GuestActionTabComponent } from './guest-action-tab.component';
import { GuestNotesTabComponent } from './guest-notes-tab.component';
import { CaseworkNoteDrawerComponent } from './casework-note-drawer.component';
import { formatDate, guestPathwayChip, initials, statusChip } from './guest-workspace.util';

type TabId =
  | 'overview'
  | 'demographics'
  | 'initial'
  | 'clinical'
  | 'followup'
  | 'dialog'
  | 'pathway'
  | 'documents'
  | 'action'
  | 'notes';

interface TabDef {
  id: TabId;
  label: string;
}

/**
 * Guest Workspace — a single guest's record. Structured after GuestOverviewTab in
 * project/screens/Components.bundle.js (lines 13375-15849): a shared identity header +
 * segmented tab bar (pixel-matched) that stays mounted while the tab body below it swaps
 * between sibling tab components, each of which fetches its own slice of data from
 * GuestsApiService.
 *
 * Tab set/order comes straight from the bundle's segmented bar: Overview · Demographics ·
 * Initial Conversation · Clinical Details · Follow-up Log · DIALOG Scores · Pathway History ·
 * Actions & Reminders. (The source uses three label variants for the 5th slot — "Activity
 * History", "Follow Up Log", "Contact History" — we standardise on "Follow-up Log".)
 * "Documents" sits between Pathway History and Actions & Reminders and "Notes" closes the bar
 * — neither has a slot in the bundle's segmented bar, but the guest-scoped document store
 * (DocumentsController) and the casework/quick notes both belong on the record, and the
 * casework notes are the record the design's "Add contact" drawer writes to.
 *
 * The header's "Add Contact" button opens CaseworkNoteDrawerComponent — in the design that
 * button leads to the SBAR casework note (GuestOverviewTab2, bundle 50271-54563), not a bare
 * contact row.
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
    GuestInitialConversationTabComponent,
    GuestClinicalDetailsTabComponent,
    GuestDialogTabComponent,
    GuestPathwayTabComponent,
    GuestDocumentsTabComponent,
    GuestFollowUpTabComponent,
    GuestActionTabComponent,
    GuestNotesTabComponent,
    CaseworkNoteDrawerComponent,
  ],
  templateUrl: './guest-workspace.component.html',
  styleUrl: './guest-workspace.component.scss',
})
export class GuestWorkspaceComponent {
  private readonly guestsApi = inject(GuestsApiService);
  private readonly location = inject(Location);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  readonly guestId = input.required<string>();

  /** "Add Contact" writes a casework note, so it follows the notes-add claim. */
  readonly canAddNote = this.auth.hasPermission(Permissions.Guests.NotesAdd);

  readonly tabs: TabDef[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'demographics', label: 'Demographics' },
    { id: 'initial', label: 'Initial Conversation' },
    { id: 'clinical', label: 'Clinical Details' },
    { id: 'followup', label: 'Follow-up Log' },
    { id: 'dialog', label: 'DIALOG Scores' },
    { id: 'pathway', label: 'Pathway History' },
    { id: 'documents', label: 'Documents' },
    { id: 'action', label: 'Actions & Reminders' },
    { id: 'notes', label: 'Notes' },
  ];
  readonly activeTab = signal<TabId>('overview');

  /** "Add Contact" header button opens the casework note drawer (bundle 50271-54563). */
  readonly noteDrawerOpen = signal(false);
  /** Set by "Raise Urgent Flag" so Clinical Details opens with its risk form expanded. */
  readonly pendingRiskForm = signal(false);

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
  readonly pathwayChip = computed(() => guestPathwayChip(this.overview()?.pathway));
  readonly registeredLabel = computed(() => formatDate(this.overview()?.registeredAt));
  /** Design meta row shows "Last activity: <date>"; the newest recent contact is our real source. */
  readonly lastActivityLabel = computed(() => {
    const contacts = this.overview()?.recentContacts;
    return contacts?.length ? formatDate(contacts[0].occurredAt) : null;
  });

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
    this.pendingRiskForm.set(false);
    this.activeTab.set(id);
  }

  /** Urgent flags are raised by recording a risk assessment — jump to Clinical Details with
   *  its risk form open. */
  raiseUrgentFlag(): void {
    this.pendingRiskForm.set(true);
    this.activeTab.set('clinical');
  }

  openNoteDrawer(): void {
    if (!this.canAddNote) return;
    this.noteDrawerOpen.set(true);
  }

  closeNoteDrawer(): void {
    this.noteDrawerOpen.set(false);
  }

  /**
   * `submitted` is false for a draft save — the drawer stays open so the worker can keep
   * writing. A submitted note also wrote a contact (and possibly a follow-up), so the overview
   * is reloaded and the Notes tab brought forward to show where the note landed.
   */
  noteSaved(submitted: boolean): void {
    if (!submitted) return;
    this.noteDrawerOpen.set(false);
    this.activeTab.set('notes');
    this.reloadOverview();
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
      clinicalProfile: section(this.guestsApi.getClinicalProfile(id)),
      pathway: section(this.guestsApi.getPathway(id)),
      followUps: section(this.guestsApi.getFollowUps(id)),
      initialConversation: section(this.guestsApi.getInitialConversation(id)),
      dialog: section(this.guestsApi.getDialog(id)),
      actions: section(this.guestsApi.getActions(id)),
    }).subscribe((record) => {
      this.exporting.set(false);
      const blob = new Blob(
        [JSON.stringify({ exportedAt: new Date().toISOString(), ...record }, null, 2)],
        { type: 'application/json' },
      );
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `guest-record-${guest.firstName}-${guest.lastName}-G-${guest.guestNumber}.json`;
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

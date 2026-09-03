import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { Location } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
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
import { GuestCarePlanTabComponent } from './guest-care-plan-tab.component';
import { GuestContactHistoryTabComponent } from './guest-contact-history-tab.component';
import { GuestActionTabComponent } from './guest-action-tab.component';
import { GuestNotesTabComponent } from './guest-notes-tab.component';
import { CaseworkNoteDrawerComponent } from './casework-note-drawer.component';
import { formatDate, guestPathwayChip, initials, statusChip, urgentChip } from './guest-workspace.util';

type TabId =
  | 'overview'
  | 'demographics'
  | 'initial'
  | 'clinical'
  | 'dialog'
  | 'pathway'
  | 'careplan'
  | 'contacts'
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
 * Tab set/order follows the bundle's segmented bar: Overview · Demographics · Initial
 * Conversation · Clinical Details · DIALOG Scores · Pathway History, then "Care Plan" and
 * "Contact History" (the latter is one of the bundle's three label variants for that slot;
 * the other two — "Activity History" and "Follow Up Log" — are dropped: per-guest follow-ups
 * are worked from the Follow-ups screen, not from a workspace tab). "Documents" and "Notes"
 * close the bar — neither has a slot in the bundle's segmented bar, but the guest-scoped
 * document store (DocumentsController) and the casework/quick notes both belong on the
 * record, and the casework notes are the record the design's "Add contact" drawer writes to.
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
    GuestCarePlanTabComponent,
    GuestContactHistoryTabComponent,
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
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);

  readonly guestId = input.required<string>();

  /** "Add Contact" writes a casework note, so it follows the notes-add claim. */
  readonly canAddNote = this.auth.hasPermission(Permissions.Guests.NotesAdd);

  readonly tabs: TabDef[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'demographics', label: 'Demographics' },
    { id: 'initial', label: 'Initial Conversation' },
    { id: 'clinical', label: 'Clinical Details' },
    { id: 'dialog', label: 'DIALOG Scores' },
    { id: 'pathway', label: 'Pathway History' },
    { id: 'careplan', label: 'Care Plan' },
    { id: 'contacts', label: 'Contact History' },
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
  /**
   * Urgency is a flag, not a status (spec §3.3) — this badge sits *alongside* the status pill
   * rather than replacing it, so an urgent guest still reads as New / Active / On hold.
   */
  readonly urgentBadge = computed(() => {
    const o = this.overview();
    return o?.isUrgent ? urgentChip(o.urgentSince) : null;
  });
  readonly pathwayChip = computed(() => guestPathwayChip(this.overview()?.pathway));
  readonly registeredLabel = computed(() => formatDate(this.overview()?.registeredAt));
  /** Design meta row shows "Last activity: <date>" — the server now derives it (contacts, notes,
   *  assessments) and hands it over as lastActivityAt, so we no longer guess from contacts. */
  readonly lastActivityLabel = computed(() => {
    const last = this.overview()?.lastActivityAt;
    return last ? formatDate(last) : null;
  });

  /** Set when the record was opened with ?tab=demographics straight after registration. */
  readonly openDemographicsEditor = signal(false);

  constructor() {
    effect((onCleanup) => {
      const id = this.guestId();
      let cancelled = false;
      onCleanup(() => (cancelled = true));
      this.loadOverview(id, () => cancelled);
    });

    // Deep links pick the tab: the registration success screen lands on Demographics (with
    // the editor open, so the remaining sections can be completed straight away), the
    // dashboards' "Start conversation" on Initial Conversation, Contact History on Contacts.
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const tab = params.get('tab');
      if (tab && this.tabs.some((t) => t.id === tab)) {
        this.activeTab.set(tab as TabId);
        this.openDemographicsEditor.set(tab === 'demographics');
      }
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

  /** The Demographics tab's "Continue to …" hand-off into the next section of the flow. */
  continueFromDemographics(step: 'initial' | 'dialog'): void {
    this.openDemographicsEditor.set(false);
    this.selectTab(step);
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

import { Component, EventEmitter, Output, computed, effect, inject, input, signal, viewChild } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { DialogAssessmentDto, GuestDemographicsDto, GuestOverviewDto } from '../../core/api-models';
import { AuthService } from '../../core/auth.service';
import { GuestsApiService } from '../../core/guests-api.service';
import { Permissions } from '../../core/permissions';
import { CustomFieldsComponent } from '../../shared/custom-fields.component';
import {
  daysSince,
  formatDate,
  formatDateTime,
  guestPathwayLabel,
  humanize,
  outcomeChip,
} from './guest-workspace.util';

/**
 * Overview tab — pixel-matched to GuestOverviewTab (project/screens/Components.bundle.js,
 * lines 13375-15849), translated from the source's absolutely-positioned div soup into
 * flex/grid layout. Content offsets in the source start at x≈226 (sidebar width) / y≈86
 * (header height) — both chrome elements are already rendered by AppShellComponent, so this
 * component starts exactly where the guest's own content begins.
 *
 * Honest-data notes (the bundle shows sample data with no API backing):
 * - "Sex" and "Next contact" have no field on any DTO — replaced with real fields (contact
 *   phone/email, AFA support) in the same slots. "Referral type" is real: referralSource.
 * - "Total follow-up entries" tile: the API only exposes openFollowUpCount — labelled
 *   "Open follow-up entries".
 * - "DIALOG baseline score" tile is real: fetched via getDialog() (baseline.total / 77).
 * - Ethnicity / Housing / Economic activity come from getDemographics(); if that call fails
 *   (e.g. no permission) the fields render as "—".
 * - "Recent activity history" renders overview.recentContacts; the bundle's sample note
 *   bodies are not part of GuestContactSummaryDto and are not shown.
 * - The closing "Additional information" card holds the admin-defined custom Guest fields; it
 *   is the single place they are edited for a guest (the Demographics tab deliberately does
 *   not repeat them). The card is suppressed entirely when none are configured.
 */
@Component({
  selector: 'app-guest-overview-tab',
  standalone: true,
  imports: [CustomFieldsComponent],
  templateUrl: './guest-overview-tab.component.html',
  styleUrl: './guest-overview-tab.component.scss',
})
export class GuestOverviewTabComponent {
  private readonly guestsApi = inject(GuestsApiService);
  private readonly auth = inject(AuthService);

  readonly overview = input.required<GuestOverviewDto>();
  /** "View all →" footer on the Recent activity history card — the workspace responds by
   *  switching to the Follow-up Log tab. */
  @Output() readonly viewFollowUps = new EventEmitter<void>();

  /** Demographics slice for the Personal snapshot card; null while loading or when not viewable. */
  readonly demographics = signal<GuestDemographicsDto | null>(null);
  /** DIALOG baseline (version 1) for the third stat tile; null when never assessed / not viewable. */
  readonly dialogBaseline = signal<DialogAssessmentDto | null>(null);

  readonly guestId = computed(() => this.overview().id);

  /** Admin-defined extra Guest fields — read-only for anyone without guests.edit. */
  readonly canEditGuest = this.auth.hasPermission(Permissions.Guests.Edit);
  private readonly customFieldsPanel = viewChild(CustomFieldsComponent);
  /** False until the panel reports configured fields — the card chrome is not rendered before then. */
  readonly hasCustomFields = computed(() => this.customFieldsPanel()?.hasFields() ?? false);

  constructor() {
    effect((onCleanup) => {
      const id = this.overview().id;
      let cancelled = false;
      onCleanup(() => (cancelled = true));
      forkJoin({
        demographics: this.guestsApi.getDemographics(id).pipe(catchError(() => of(null))),
        dialog: this.guestsApi.getDialog(id).pipe(catchError(() => of(null))),
      }).subscribe(({ demographics, dialog }) => {
        if (cancelled) return;
        this.demographics.set(demographics);
        this.dialogBaseline.set(dialog?.baseline ?? null);
      });
    });
  }

  readonly lastContactDaysAgo = computed(() => {
    const contacts = this.overview().recentContacts;
    if (!contacts.length) return null;
    return daysSince(contacts[0].occurredAt);
  });

  readonly pathwayLabel = computed(() => guestPathwayLabel(this.overview().pathway));

  readonly formatDate = formatDate;
  readonly formatDateTime = formatDateTime;
  readonly humanize = humanize;
  readonly outcomeChip = outcomeChip;
}

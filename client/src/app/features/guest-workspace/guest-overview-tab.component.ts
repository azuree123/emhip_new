import { Component, EventEmitter, Output, computed, effect, inject, input, signal } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { DialogAssessmentDto, GuestDemographicsDto, GuestOverviewDto } from '../../core/api-models';
import { GuestsApiService } from '../../core/guests-api.service';
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
 */
@Component({
  selector: 'app-guest-overview-tab',
  standalone: true,
  templateUrl: './guest-overview-tab.component.html',
  styleUrl: './guest-overview-tab.component.scss',
})
export class GuestOverviewTabComponent {
  private readonly guestsApi = inject(GuestsApiService);

  readonly overview = input.required<GuestOverviewDto>();
  /** "View all →" footer on the Recent activity history card — the workspace responds by
   *  switching to the Follow-up Log tab. */
  @Output() readonly viewFollowUps = new EventEmitter<void>();

  /** Demographics slice for the Personal snapshot card; null while loading or when not viewable. */
  readonly demographics = signal<GuestDemographicsDto | null>(null);
  /** DIALOG baseline (version 1) for the third stat tile; null when never assessed / not viewable. */
  readonly dialogBaseline = signal<DialogAssessmentDto | null>(null);

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

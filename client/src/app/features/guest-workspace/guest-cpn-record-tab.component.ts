import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { CpnSessionSummaryDto, GuestCpnRecordDto } from '../../core/api-models';
import { GuestsApiService } from '../../core/guests-api.service';
import { formatDate, formatDateTime, humanize } from './guest-workspace.util';

/**
 * "CPN Record" tab — design "CPN Record (Guest Workspace - Separate Tab)": the guest's CPN
 * referral record (referred by, date, primary reason, urgency, CMHW rationale, confirmed by,
 * CPN allocated, first CPN contact date) and every CPN contact logged since ("CPN contacts
 * logged (n)"). Everything is read from what the Add Contact popup and the MDT queue wrote —
 * the tab itself is read-only; a new CPN contact is added from the workspace header.
 */
@Component({
  selector: 'emhip-guest-cpn-record-tab',
  standalone: true,
  templateUrl: './guest-cpn-record-tab.component.html',
  styleUrl: './guest-cpn-record-tab.component.scss',
})
export class GuestCpnRecordTabComponent {
  private readonly guestsApi = inject(GuestsApiService);

  readonly guestId = input.required<string>();
  /** "Add CPN contact" — the workspace opens the Add Contact popup. */
  readonly addContact = output<void>();

  readonly record = signal<GuestCpnRecordDto | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly formatDate = formatDate;
  readonly formatDateTime = formatDateTime;
  readonly humanize = humanize;

  readonly referral = computed(() => this.record()?.referral ?? null);
  readonly sessions = computed(() => this.record()?.sessions ?? []);
  readonly hasAnyCpn = computed(() => {
    const r = this.record();
    return !!r && (!!r.referral || r.cpnInvolved || r.hasInitialAssessment || r.sessions.length > 0);
  });

  /** "Referral confirmed" / "Awaiting MDT review" / "Declined at MDT" for the record's status line. */
  readonly referralStatus = computed(() => {
    const r = this.referral();
    if (!r) return null;
    switch (r.status) {
      case 'Confirmed':
        return { label: 'CPN allocated', tone: 'green' as const };
      case 'Declined':
        return { label: 'Declined at MDT', tone: 'red' as const };
      case 'Pending':
        return { label: 'Awaiting MDT review', tone: 'gold' as const };
      default:
        return { label: r.status, tone: 'grey' as const };
    }
  });

  constructor() {
    effect((onCleanup) => {
      const id = this.guestId();
      let cancelled = false;
      onCleanup(() => (cancelled = true));
      this.load(id, () => cancelled);
    });
  }

  private load(guestId: string, isCancelled: () => boolean): void {
    this.loading.set(true);
    this.error.set(null);
    this.guestsApi.getCpnRecord(guestId).subscribe({
      next: (dto) => {
        if (isCancelled()) return;
        this.record.set(dto);
        this.loading.set(false);
      },
      error: () => {
        if (isCancelled()) return;
        this.error.set('Could not load the CPN record for this guest.');
        this.loading.set(false);
      },
    });
  }

  sessionTitle(s: CpnSessionSummaryDto): string {
    if (s.sessionType === 'InitialAssessment') return 'Initial assessment';
    return s.sessionNumber ? `Follow-up session ${s.sessionNumber}` : 'CPN session';
  }

  riskLabel(level: string): string {
    return level === 'NoRiskDetected' ? 'No risk detected' : `${humanize(level)} risk`;
  }
}

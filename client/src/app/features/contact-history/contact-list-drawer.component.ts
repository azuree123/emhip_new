import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ContactListRowDto } from '../../core/api-models';
import { ContactListKind, ContactScopeOptions, ContactsApiService } from '../../core/contacts-api.service';
import { formatDateTime, humanize } from '../guest-workspace/guest-workspace.util';

const PAGE_SIZE = 25;

/** What a Contact History tile opens: the list behind it and the window and scope it was counted over. */
export interface ContactListDrill {
  kind: ContactListKind;
  /** "Casework contacts". */
  title: string;
  /** "Last 30 days", "This month", "01 Oct 2026 – 08 Oct 2026". */
  window: string;
  /** "My caseload", "CMHW: Amara Asante" or "All guests". */
  scope: string;
  /** Extra line under the count — e.g. how the list relates to a figure that counts guests, not contacts. */
  note?: string;
  /** The same caseload and dates the tile was counted over. */
  options: ContactScopeOptions;
}

/** Type chip tint — the same per-type colours as the count chips on the Contact History rows. */
const TYPE_TINTS: Record<string, string> = {
  Casework: 'Casework',
  Activity: 'Activity',
  AFA: 'Afa',
  Hospitality: 'Hospitality',
  'CPN session': 'Cpn',
  'CPN initial assessment': 'Cpn',
};

/**
 * Contact History tile drill-down — a right-hand drawer listing the individual contacts a stat
 * tile or CPN figure counts (GET /contacts/list), newest first, over the same caseload and dates.
 * The first page's total is the tile's own number. Keyset-paged, so "Load more" hands the opaque
 * cursor back rather than asking for a page number. A row opens the guest's Contact History tab.
 */
@Component({
  selector: 'app-contact-list-drawer',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './contact-list-drawer.component.html',
  styleUrl: './contact-list-drawer.component.scss',
  host: { '(document:keydown.escape)': 'close()' },
})
export class ContactListDrawerComponent {
  private readonly contactsApi = inject(ContactsApiService);
  private readonly router = inject(Router);

  readonly drill = input.required<ContactListDrill>();
  readonly closed = output<void>();

  protected readonly rows = signal<ContactListRowDto[]>([]);
  /** Only the first page carries it — held here and carried across "Load more". */
  protected readonly totalCount = signal<number | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadingMore = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly moreError = signal<string | null>(null);
  protected readonly nextCursor = signal<string | null>(null);

  protected readonly countLabel = computed(() => {
    const total = this.totalCount();
    if (total === null) return this.loading() ? 'Loading…' : '';
    return `${total} contact${total === 1 ? '' : 's'}`;
  });

  protected readonly formatDateTime = formatDateTime;

  private readonly closeButton = viewChild<ElementRef<HTMLButtonElement>>('closeButton');
  private fetchToken = 0;

  constructor() {
    effect(() => this.load(this.drill()));
    // Move focus into the dialog; the screen puts it back on the tile when the drawer closes.
    afterNextRender(() => this.closeButton()?.nativeElement.focus());
  }

  protected load(drill: ContactListDrill = this.drill()): void {
    const token = ++this.fetchToken;
    this.loading.set(true);
    this.error.set(null);
    this.moreError.set(null);
    this.contactsApi.getList({ ...drill.options, kind: drill.kind, pageSize: PAGE_SIZE }).subscribe({
      next: (page) => {
        if (token !== this.fetchToken) return;
        this.rows.set(page.items);
        this.totalCount.set(page.totalCount);
        this.nextCursor.set(page.hasMore ? page.nextCursor : null);
        this.loading.set(false);
      },
      error: () => {
        if (token !== this.fetchToken) return;
        this.rows.set([]);
        this.totalCount.set(null);
        this.nextCursor.set(null);
        this.error.set('Unable to load these contacts right now. Please try again.');
        this.loading.set(false);
      },
    });
  }

  protected loadMore(): void {
    const cursor = this.nextCursor();
    if (!cursor || this.loadingMore()) return;
    const token = this.fetchToken;
    const drill = this.drill();
    this.loadingMore.set(true);
    this.moreError.set(null);
    this.contactsApi.getList({ ...drill.options, kind: drill.kind, cursor, pageSize: PAGE_SIZE }).subscribe({
      next: (page) => {
        if (token !== this.fetchToken) return;
        this.rows.update((current) => [...current, ...page.items]);
        this.nextCursor.set(page.hasMore ? page.nextCursor : null);
        this.loadingMore.set(false);
      },
      error: () => {
        if (token !== this.fetchToken) return;
        this.loadingMore.set(false);
        this.moreError.set('Could not load more contacts. Please try again.');
      },
    });
  }

  protected close(): void {
    this.closed.emit();
  }

  protected tint(row: ContactListRowDto): string | null {
    return TYPE_TINTS[row.type] ?? null;
  }

  /** "Session 3 · Phone call" — the note's own detail, then how contact was made. */
  protected detail(row: ContactListRowDto): string {
    return [row.detail, humanize(row.contactMethod)].filter(Boolean).join(' · ');
  }

  /** The guest's Contact History tab, where the contact sits in context. */
  protected openGuest(row: ContactListRowDto): void {
    this.router.navigate(['/guests', row.guestId], { queryParams: { tab: 'contacts' } });
  }
}

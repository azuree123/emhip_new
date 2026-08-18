import { Component, ElementRef, OnInit, computed, effect, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Subject, catchError, debounceTime, distinctUntilChanged, of, switchMap } from 'rxjs';
import { GuestStatus, GuestSuggestionDto } from '../core/api-models';
import { AuthService } from '../core/auth.service';
import { GuestsApiService } from '../core/guests-api.service';
import { Permissions } from '../core/permissions';
import { UrgentCasesApiService } from '../core/urgent-cases-api.service';
import { UrgentCasesHubService } from '../core/urgent-cases-hub.service';

interface NavItem {
  label: string;
  route: string;
  iconPath: string;
  iconViewBox: string;
  badge?: () => number | null;
  /** Any-of permission list — item is hidden unless the signed-in user holds at least one. Omit for items everyone with a session can see (e.g. Dashboard). */
  permissions?: string[];
}

interface NavSection {
  label: string;
  items: NavItem[];
}

/**
 * Sidebar + header shell shared by all 9 screens — ported from the sidebar/header markup
 * repeated at the top of every screen in project/screens/Components.bundle.js (identical
 * across Dashboard, GuestDataSheet, Desktop34/46/50, etc.). Per the handoff README, the real
 * app uses this persistent left-nav instead of the prototype's top screen-switcher bar.
 */
@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
  host: {
    // Clicking anywhere outside the search box closes the suggestions dropdown.
    '(document:click)': 'onDocumentClick($event)',
  },
})
export class AppShellComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly urgentCasesApi = inject(UrgentCasesApiService);
  private readonly urgentCasesHub = inject(UrgentCasesHubService);
  private readonly guestsApi = inject(GuestsApiService);

  readonly currentUser = this.auth.current;
  readonly urgentCaseCount = signal<number | null>(null);
  // Design meta line reads "Tuesday 13 May 2025" (no comma) — built manually because
  // en-GB toLocaleDateString inserts a comma after the weekday.
  readonly today = (() => {
    const now = new Date();
    const weekday = now.toLocaleDateString('en-GB', { weekday: 'long' });
    const month = now.toLocaleDateString('en-GB', { month: 'long' });
    return `${weekday} ${now.getDate()} ${month} ${now.getFullYear()}`;
  })();
  readonly mobileNavOpen = signal(false);

  readonly searchTerm = signal('');
  readonly canSearchGuests = this.auth.hasPermission(Permissions.Guests.View);
  readonly canViewUrgentCases = this.auth.hasPermission(Permissions.UrgentCases.View);

  // --- Search autocomplete state ---------------------------------------------------------
  /** null = nothing fetched for the current query (under 2 chars or cleared); [] = fetched, no matches. */
  readonly suggestions = signal<GuestSuggestionDto[] | null>(null);
  readonly suggestionsOpen = signal(false);
  /** Keyboard/hover highlight within the dropdown; -1 = none. */
  readonly activeSuggestionIndex = signal(-1);
  readonly suggestionsVisible = computed(() => this.suggestionsOpen() && this.suggestions() !== null);

  private readonly searchBox = viewChild<ElementRef<HTMLElement>>('searchBox');
  private readonly suggestQuery$ = new Subject<string>();

  constructor() {
    // A live escalation may add a case — refresh the badge count when one arrives.
    effect(() => {
      if (this.urgentCasesHub.latestEscalation() && this.canViewUrgentCases) {
        this.urgentCasesApi.getActive().subscribe((cases) => this.urgentCaseCount.set(cases.length));
      }
    });

    // Debounced typeahead: min 2 chars, switchMap cancels stale in-flight requests.
    this.suggestQuery$
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap((q) =>
          q.length < 2 ? of(null) : this.guestsApi.suggest(q).pipe(catchError(() => of<GuestSuggestionDto[]>([]))),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((results) => {
        this.suggestions.set(results);
        this.activeSuggestionIndex.set(-1);
      });
  }

  readonly visibleSections = computed(() =>
    this.allSections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => !item.permissions || this.auth.hasAnyPermission(item.permissions)),
      }))
      .filter((section) => section.items.length > 0),
  );

  private readonly allSections: NavSection[] = [
    {
      label: 'OVERVIEW',
      items: [
        {
          label: 'Dashboard',
          route: '/dashboard',
          iconViewBox: '0 0 15 16.664',
          iconPath:
            'M 9.394 0 C 9.225 -0.005 9.061 0.059 8.94 0.177 C 8.818 0.294 8.75 0.456 8.75 0.625 L 8.75 7.289 C 8.75 7.634 9.03 7.914 9.375 7.914 L 16.039 7.914 C 16.208 7.914 16.369 7.845 16.487 7.724 C 16.605 7.603 16.668 7.439 16.663 7.27 C 16.545 3.308 13.356 0.118 9.394 0 Z M 10 6.664 L 10 1.302 C 12.785 1.673 14.991 3.879 15.362 6.664 L 10 6.664 Z M 7.5 2.317 C 7.5 2.141 7.426 1.974 7.297 1.855 C 7.167 1.737 6.994 1.678 6.819 1.694 C 2.996 2.039 0 5.251 0 9.164 C 0 13.306 3.358 16.664 7.5 16.664 C 11.413 16.664 14.625 13.668 14.969 9.845 C 14.985 9.67 14.927 9.497 14.808 9.367 C 14.69 9.237 14.523 9.164 14.347 9.164 L 7.5 9.164 L 7.5 2.317 Z M 1.25 9.164 C 1.25 6.14 3.397 3.617 6.25 3.039 L 6.25 9.789 C 6.25 10.134 6.53 10.414 6.875 10.414 L 13.625 10.414 C 13.046 13.266 10.524 15.414 7.5 15.414 C 4.048 15.414 1.25 12.615 1.25 9.164 Z',
        },
        // Per the design (nodes 356:1140/356:1438), "Guest" sits in the OVERVIEW section
        // directly under Dashboard, before the CASE MANGEMENT heading.
        {
          label: 'Guest',
          route: '/guests',
          iconViewBox: '0 0 14.996 16.667',
          iconPath:
            'M 6.248 2.5 C 6.248 3.034 6.583 3.49 7.055 3.669 C 7.346 3.74 7.65 3.74 7.941 3.669 C 8.412 3.49 8.748 3.034 8.748 2.5 C 8.748 1.81 8.188 1.25 7.498 1.25 C 6.807 1.25 6.248 1.81 6.248 2.5 Z M 5.02 2.832 C 5.005 2.724 4.998 2.613 4.998 2.5 C 4.998 1.119 6.117 0 7.498 0 C 8.878 0 9.998 1.119 9.998 2.5 C 9.998 2.613 9.99 2.724 9.976 2.832 L 12.373 1.815 C 13.326 1.411 14.429 1.852 14.841 2.801 C 15.254 3.754 14.812 4.858 13.857 5.263 L 10.833 6.547 L 10.833 9.644 L 12.395 14.181 C 12.732 15.16 12.212 16.227 11.233 16.564 C 10.254 16.901 9.187 16.381 8.849 15.401 L 7.498 11.476 L 6.146 15.401 C 5.809 16.38 4.742 16.901 3.763 16.564 C 2.784 16.227 2.264 15.16 2.601 14.18 L 4.166 9.633 L 4.166 6.548 L 1.139 5.263 C 0.183 4.858 -0.258 3.754 0.155 2.801 C 0.566 1.852 1.67 1.411 2.623 1.815 L 5.02 2.832 Z',
          permissions: [Permissions.Guests.View],
        },
      ],
    },
    {
      // NOTE: "CASE MANGEMENT" is the exact (typo'd) label in the source Figma file.
      label: 'CASE MANGEMENT',
      items: [
        {
          label: 'Follow-up Log',
          route: '/followups',
          iconViewBox: '0 0 16.25 16.25',
          iconPath:
            'M 14.995 2.506 L 14.999 2.607 L 15 2.708 L 15 11.958 C 15 13.638 13.638 15 11.958 15 L 2.708 15 C 2.64 15 2.573 14.998 2.506 14.994 C 2.986 15.749 3.83 16.25 4.792 16.25 L 11.958 16.25 C 14.329 16.25 16.25 14.329 16.25 11.958 L 16.25 4.792 C 16.25 3.831 15.749 2.986 14.995 2.506 Z M 2.708 0 C 1.213 0 0 1.213 0 2.708 L 0 11.458 C 0 12.954 1.213 14.167 2.708 14.167 L 11.458 14.167 C 12.954 14.167 14.167 12.954 14.167 11.458 L 14.167 2.708 C 14.167 1.213 12.954 0 11.458 0 L 2.708 0 Z',
          permissions: [Permissions.FollowUps.View],
        },
        {
          label: 'Urgent Cases',
          route: '/urgent-cases',
          iconViewBox: '0 0 16.667 16.667',
          iconPath:
            'M 1.25 8.333 C 1.25 4.421 4.421 1.25 8.333 1.25 C 12.245 1.25 15.417 4.421 15.417 8.333 C 15.417 12.245 12.245 15.417 8.333 15.417 C 4.421 15.417 1.25 12.245 1.25 8.333 Z M 8.333 0 C 3.731 0 0 3.731 0 8.333 C 0 12.936 3.731 16.667 8.333 16.667 C 12.936 16.667 16.667 12.936 16.667 8.333 C 16.667 3.731 12.936 0 8.333 0 Z M 8.328 3.874 C 8.286 3.569 8.025 3.333 7.708 3.333 C 7.363 3.333 7.083 3.613 7.083 3.958 L 7.083 8.958 L 7.089 9.043 C 7.13 9.348 7.392 9.583 7.708 9.583 L 11.042 9.583 L 11.126 9.578 C 11.431 9.536 11.667 9.275 11.667 8.958 C 11.667 8.613 11.387 8.333 11.042 8.333 L 8.333 8.333 L 8.333 3.958 L 8.328 3.874 Z',
          badge: () => this.urgentCaseCount(),
          permissions: [Permissions.UrgentCases.View],
        },
      ],
    },
    {
      label: 'ADMIN',
      items: [
        {
          label: 'Hub Workers',
          route: '/hub-workers',
          iconViewBox: '0 0 17.083 16.667',
          iconPath:
            'M 7.083 2.5 C 7.083 3.881 5.964 5 4.583 5 C 3.203 5 2.083 3.881 2.083 2.5 C 2.083 1.119 3.203 0 4.583 0 C 5.964 0 7.083 1.119 7.083 2.5 Z M 5.833 2.5 C 5.833 1.81 5.274 1.25 4.583 1.25 C 3.893 1.25 3.333 1.81 3.333 2.5 C 3.333 3.19 3.893 3.75 4.583 3.75 C 5.274 3.75 5.833 3.19 5.833 2.5 Z M 14.167 4.583 C 14.167 5.734 13.234 6.667 12.083 6.667 C 10.933 6.667 10 5.734 10 4.583 C 10 3.433 10.933 2.5 12.083 2.5 C 13.234 2.5 14.167 3.433 14.167 4.583 Z',
          permissions: [Permissions.Admin.ManageUsers],
        },
        {
          label: 'Roles & Permissions',
          route: '/hub-workers/roles',
          iconViewBox: '0 0 16 16',
          iconPath:
            'M 8 0 L 14 2.667 L 14 7.111 C 14 11.022 11.44 14.578 8 16 C 4.56 14.578 2 11.022 2 7.111 L 2 2.667 L 8 0 Z M 8 1.769 L 3.556 3.7 L 3.556 7.111 C 3.556 10.204 5.42 12.988 8 14.213 C 10.58 12.988 12.444 10.204 12.444 7.111 L 12.444 3.7 L 8 1.769 Z',
          permissions: [Permissions.Admin.ManageRoles],
        },
        {
          label: 'Reports',
          route: '/reports',
          iconViewBox: '0 0 15 16.670',
          iconPath:
            'M 12.914 2.189 L 12.917 3.958 L 12.917 10.833 L 12.083 10.833 L 12.083 1.875 C 12.083 0.839 11.244 0 10.208 0 L 2.708 0 C 1.673 0 0.833 0.839 0.833 1.875 L 0.833 5.316 C 0.331 5.652 0 6.225 0 6.875 L 0 13.958 C 0 15.454 1.213 16.667 2.708 16.667 L 4.681 16.667 C 4.719 16.669 4.757 16.67 4.796 16.67 L 10.208 16.67 C 10.265 16.67 10.321 16.669 10.377 16.667 L 12.292 16.667 C 13.787 16.667 15 15.454 15 13.958 L 15 12.708 C 15 12.058 14.669 11.485 14.167 11.149 L 14.167 3.958 C 14.167 3.141 13.644 2.446 12.914 2.189 Z',
          permissions: [Permissions.Reports.View],
        },
      ],
    },
  ];

  ngOnInit(): void {
    // The urgent-cases endpoints and hub are [Authorize]d — only touch them when permitted.
    if (this.canViewUrgentCases) {
      this.urgentCasesApi.getActive().subscribe((cases) => this.urgentCaseCount.set(cases.length));
      this.urgentCasesHub.connect();
    }
  }

  onSearchInput(value: string): void {
    this.searchTerm.set(value);
    const q = value.trim();
    this.suggestQuery$.next(q);
    if (q.length < 2) {
      // Under the server's 2-char minimum nothing is shown — drop any stale list immediately.
      this.suggestions.set(null);
      this.activeSuggestionIndex.set(-1);
    } else {
      this.suggestionsOpen.set(true);
    }
  }

  onSearchFocus(): void {
    // Re-focusing with a still-valid query re-opens the previously fetched list.
    if (this.searchTerm().trim().length >= 2 && this.suggestions() !== null) {
      this.suggestionsOpen.set(true);
    }
  }

  onSearchKeydown(event: KeyboardEvent): void {
    const items = this.suggestions();
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        if (!this.suggestionsVisible() || !items || items.length === 0) {
          return;
        }
        event.preventDefault();
        this.activeSuggestionIndex.update((i) =>
          event.key === 'ArrowDown' ? (i + 1) % items.length : i <= 0 ? items.length - 1 : i - 1,
        );
        break;
      }
      case 'Enter': {
        const i = this.activeSuggestionIndex();
        if (this.suggestionsVisible() && items && i >= 0 && i < items.length) {
          event.preventDefault();
          this.selectSuggestion(items[i]);
        } else {
          // Fallback: preserve the original Enter behavior (guest list filtered by ?q=).
          this.submitSearch();
        }
        break;
      }
      case 'Escape': {
        if (this.suggestionsVisible()) {
          event.preventDefault();
          this.closeSuggestions();
        }
        break;
      }
    }
  }

  selectSuggestion(suggestion: GuestSuggestionDto): void {
    this.searchTerm.set('');
    // Reset distinctUntilChanged state so re-typing the same query fetches again.
    this.suggestQuery$.next('');
    this.suggestions.set(null);
    this.closeSuggestions();
    void this.router.navigate(['/guests', suggestion.id]);
  }

  closeSuggestions(): void {
    this.suggestionsOpen.set(false);
    this.activeSuggestionIndex.set(-1);
  }

  onDocumentClick(event: MouseEvent): void {
    const box = this.searchBox()?.nativeElement;
    if (this.suggestionsOpen() && box && !box.contains(event.target as Node)) {
      this.closeSuggestions();
    }
  }

  /** Same humanization the guest data sheet's status pills use. */
  statusLabel(status: GuestStatus): string {
    return status === 'PendingConversation' ? 'Pending Conversation' : status;
  }

  submitSearch(): void {
    const q = this.searchTerm().trim();
    this.closeSuggestions();
    void this.router.navigate(['/guests'], { queryParams: q ? { q } : {} });
  }

  goToUrgentCases(): void {
    void this.router.navigateByUrl('/urgent-cases');
  }

  toggleMobileNav(): void {
    this.mobileNavOpen.update((open) => !open);
  }

  closeMobileNav(): void {
    this.mobileNavOpen.set(false);
  }

  logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}

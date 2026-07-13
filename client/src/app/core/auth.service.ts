import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CurrentUser {
  staffId: string;
  hubId: string;
  displayName: string;
  roles: string[];
  permissions: string[];
}

interface StoredSession extends CurrentUser {
  token: string;
  expiresAt: string;
}

interface LoginResponse {
  token: string;
  expiresAt: string;
  staffId: string;
  displayName: string;
  hubId: string;
  roles: string[];
  permissions: string[];
}

const STORAGE_KEY = 'emhip_session';

const emptyUser: CurrentUser = { staffId: '', hubId: '', displayName: '', roles: [], permissions: [] };

/**
 * Real session state backed by a JWT issued by Emhip.Api's /auth/login (ASP.NET Core Identity).
 * Replaces the earlier dev-mode role-switcher — the token (and the flattened permission claims
 * baked into it at login) is the single source of truth for what the signed-in user can do.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/auth`;

  private readonly session = signal<StoredSession | null>(this.loadStoredSession());

  readonly current = computed<CurrentUser>(() => this.session() ?? emptyUser);
  readonly isAuthenticated = computed(() => {
    const s = this.session();
    return !!s && new Date(s.expiresAt).getTime() > Date.now();
  });

  get token(): string | null {
    return this.session()?.token ?? null;
  }

  hasPermission(permission: string): boolean {
    return this.current().permissions.includes(permission);
  }

  hasAnyPermission(permissions: string[]): boolean {
    return permissions.some((p) => this.hasPermission(p));
  }

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.base}/login`, { email, password }).pipe(
      tap((res) => {
        const session: StoredSession = {
          token: res.token,
          expiresAt: res.expiresAt,
          staffId: res.staffId,
          hubId: res.hubId,
          displayName: res.displayName,
          roles: res.roles,
          permissions: res.permissions,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
        this.session.set(session);
      }),
    );
  }

  logout(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.session.set(null);
  }

  forgotPassword(email: string): Observable<void> {
    return this.http.post<void>(`${this.base}/forgot-password`, { email });
  }

  resetPassword(email: string, token: string, newPassword: string): Observable<void> {
    return this.http.post<void>(`${this.base}/reset-password`, { email, token, newPassword });
  }

  private loadStoredSession(): StoredSession | null {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw) as StoredSession;
      return new Date(parsed.expiresAt).getTime() > Date.now() ? parsed : null;
    } catch {
      return null;
    }
  }
}

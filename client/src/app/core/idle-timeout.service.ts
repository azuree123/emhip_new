import { DestroyRef, Injectable, NgZone, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { SettingsApiService } from './settings-api.service';

/** How long before the sign-out the warning banner appears. */
const WARNING_SECONDS = 60;
const ACTIVITY_EVENTS: (keyof DocumentEventMap)[] = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'visibilitychange'];

/**
 * Automatic sign-out after inactivity (NHS DSPT / UK GDPR Art. 32): an unattended screen must
 * not keep exposing guest records. The idle period comes from the `security.sessionIdleMinutes`
 * setting (default 30; 0 disables). One minute before the deadline a warning is shown; any
 * activity, or "Stay signed in", resets the clock. The timers run outside Angular's zone so the
 * activity listeners never trigger change detection on every mouse move.
 */
@Injectable({ providedIn: 'root' })
export class IdleTimeoutService {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly settings = inject(SettingsApiService);
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);

  /** Seconds left before sign-out while the warning is showing; null otherwise. */
  readonly secondsLeft = signal<number | null>(null);
  readonly warning = computed(() => this.secondsLeft() !== null);

  private lastActivity = Date.now();
  private tickHandle?: ReturnType<typeof setInterval>;
  private started = false;

  private readonly onActivity = (): void => {
    if (document.visibilityState === 'hidden') return;
    this.lastActivity = Date.now();
    if (this.secondsLeft() !== null) this.zone.run(() => this.secondsLeft.set(null));
  };

  start(): void {
    if (this.started) return;
    this.started = true;
    this.lastActivity = Date.now();
    this.zone.runOutsideAngular(() => {
      for (const event of ACTIVITY_EVENTS) document.addEventListener(event, this.onActivity, { passive: true });
      this.tickHandle = setInterval(() => this.tick(), 1000);
    });
    this.destroyRef.onDestroy(() => this.stop());
  }

  stop(): void {
    if (!this.started) return;
    this.started = false;
    for (const event of ACTIVITY_EVENTS) document.removeEventListener(event, this.onActivity);
    if (this.tickHandle) clearInterval(this.tickHandle);
    this.secondsLeft.set(null);
  }

  /** "Stay signed in" on the warning banner. */
  extend(): void {
    this.lastActivity = Date.now();
    this.secondsLeft.set(null);
  }

  private tick(): void {
    if (!this.auth.isAuthenticated()) return;
    const idleMinutes = this.settings.sessionIdleMinutes();
    if (!idleMinutes || idleMinutes <= 0) return;

    const deadline = this.lastActivity + idleMinutes * 60_000;
    const remaining = Math.ceil((deadline - Date.now()) / 1000);

    if (remaining <= 0) {
      this.zone.run(() => {
        this.secondsLeft.set(null);
        this.auth.logout();
        void this.router.navigate(['/login'], { queryParams: { reason: 'idle' } });
      });
      return;
    }

    if (remaining <= WARNING_SECONDS) {
      this.zone.run(() => this.secondsLeft.set(remaining));
    }
  }
}

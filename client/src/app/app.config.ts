import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { NavigationError, provideRouter, withComponentInputBinding, withNavigationErrorHandler } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { authInterceptor } from './core/auth.interceptor';

/** Browser wording for a lazy-loaded screen whose file no longer exists on the server. */
const STALE_CHUNK = /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading chunk [\w-]+ failed/i;
const RELOAD_FLAG = 'emhip_chunk_reload';

/**
 * Each deploy replaces the hashed screen bundles, so a tab left open across a deploy can no
 * longer load the screens it has not visited yet — without this, clicking a guest or an urgent
 * case silently does nothing. Reload straight into the page that was clicked, once; a second
 * failure in a row is a real error and is left to surface.
 */
function reloadOnStaleChunk(error: NavigationError): void {
  const message = String((error.error as Error | undefined)?.message ?? error.error ?? '');
  if (!STALE_CHUNK.test(message)) return;
  try {
    if (sessionStorage.getItem(RELOAD_FLAG) === error.url) return;
    sessionStorage.setItem(RELOAD_FLAG, error.url);
  } catch {
    // Storage blocked — still reload; the browser will fetch the new bundles.
  }
  window.location.assign(error.url);
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding(), withNavigationErrorHandler(reloadOnStaleChunk)),
    provideHttpClient(withInterceptors([authInterceptor])),
  ]
};

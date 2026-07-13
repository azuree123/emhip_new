import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

/** Attaches the X-Dev-* headers Emhip.Api's DevCurrentUser reads instead of a real bearer token. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService).current();

  return next(
    req.clone({
      setHeaders: {
        'X-Dev-Staff-Id': auth.staffId,
        'X-Dev-Hub-Id': auth.hubId,
        'X-Dev-Display-Name': auth.displayName,
        'X-Dev-Role': auth.role,
      },
    }),
  );
};

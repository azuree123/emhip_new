import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** Reads `data.permission` (a permission string or array of alternatives) off the route and requires the signed-in user to hold at least one. */
export const permissionGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const required = route.data['permission'] as string | string[] | undefined;
  if (!required) return true;

  const auth = inject(AuthService);
  const requiredList = Array.isArray(required) ? required : [required];

  return auth.hasAnyPermission(requiredList) || inject(Router).createUrlTree(['/dashboard']);
};

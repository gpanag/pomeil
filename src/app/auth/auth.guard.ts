import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

export const authGuard: CanActivateFn = (route, state) => {
  if (localStorage.getItem('pomeil_jwt')) return true;
  inject(Router).navigate(['/login'], { queryParams: { returnUrl: state.url } });
  return false;
};

import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.token;
  const authReq = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
  return next(authReq).pipe(
    catchError((err) => {
      // expired / invalid token on a protected call -> force re-login
      if (err.status === 401 && !req.url.includes('/auth/login') && auth.isLoggedIn()) auth.logout();
      return throwError(() => err);
    })
  );
};

import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpEvent, HttpResponse, HttpRequest, HttpHandler, HttpErrorResponse, HttpEventType } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable()
export class AuthHttpInterceptor implements HttpInterceptor {

  constructor(private authService: AuthService) {

  }

  intercept(httpRequest: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (this.authService.isLoggedIn()) {
      httpRequest = httpRequest.clone({
        setHeaders: { "Authorization": "Bearer " + this.authService.getToken() }
      });
    }

    return next.handle(httpRequest).pipe(
      catchError((e: HttpEvent<any>) => {
        if (e instanceof HttpErrorResponse) {
          if (e.status == 401) // Unauthorized
          {
            console.log("Unauthorized");
            this.authService.logOut();
          }
        }
        return throwError(e);
      })
    );
  }
}
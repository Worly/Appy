import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpEvent, HttpResponse, HttpRequest, HttpHandler, HttpErrorResponse, HttpEventType } from '@angular/common/http';
import { BehaviorSubject, Observable, of, Subject, throwError } from 'rxjs';
import { catchError, filter, map, switchMap, take } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { appConfig } from 'src/app/app.config';

@Injectable()
export class AuthHttpInterceptor implements HttpInterceptor {
  private isRefreshing: boolean = false;
  private tokenRefreshedSubject: Subject<void> = new Subject();

  constructor(private authService: AuthService) {
    console.log("constructor");
  }

  intercept(httpRequest: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (this.authService.isLoggedIn())
      httpRequest = this.addAccessToken(httpRequest, this.authService.getAccessToken() as string);

    if (httpRequest.url != appConfig.apiUrl + "user/refresh" && this.isRefreshing)
      return this.waitOnRefreshToken(httpRequest, next);

    return next.handle(httpRequest).pipe(
      catchError((e: HttpEvent<any>) => {
        if (e instanceof HttpErrorResponse) {
          if (e.status == 401) // Unauthorized
            return this.handle401Error(httpRequest, next, e);
        }
        return throwError(() => e);
      })
    );
  }

  private handle401Error(httpRequest: HttpRequest<any>, next: HttpHandler, error: HttpErrorResponse): Observable<HttpEvent<any>> {
    if (this.isRefreshing)
      return this.waitOnRefreshToken(httpRequest, next);

    if (this.authService.getRefreshToken() == null)
      return throwError(() => error);

    this.startRefreshingToken();

    return this.waitOnRefreshToken(httpRequest, next);
  }

  private startRefreshingToken() {
    this.isRefreshing = true;
    console.log("Refreshing token!");

    this.authService.refreshTokens().subscribe({
      next: () => {
        this.isRefreshing = false;

        console.log("Refreshed token!");

        this.tokenRefreshedSubject.next();
      },
      error: e => {
        this.isRefreshing = false;

        this.tokenRefreshedSubject.error(e);
        this.authService.logOut();
      }
    });
  }

  private waitOnRefreshToken(httpRequest: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    console.log("Waiting on refresh token! " + httpRequest.urlWithParams);
    return this.tokenRefreshedSubject.pipe(
      take(1),
      switchMap(() => {
        console.log("Done waiting, now sending " + httpRequest.urlWithParams);
        return next.handle(this.addAccessToken(httpRequest, this.authService.getAccessToken() as string));
      })
    )
  }

  private addAccessToken(request: HttpRequest<any>, accessToken: string) {
    return request.clone({
      setHeaders: { "Authorization": "Bearer " + accessToken }
    });
  }
}
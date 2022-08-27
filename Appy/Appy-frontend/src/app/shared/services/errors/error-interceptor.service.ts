import { HttpContextToken, HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Router } from "@angular/router";
import { Observable, throwError } from "rxjs";
import { catchError } from "rxjs/operators";

export const IGNORE_NOT_FOUND = new HttpContextToken(() => false);

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {

  constructor(private router: Router) {

  }

  intercept(httpRequest: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(httpRequest).pipe(
      catchError((e: HttpEvent<any>) => {
        if (e instanceof HttpErrorResponse) {
          if (e.status == 400)
            return throwError(() => e);

          if (e.status == 401)
            return throwError(() => e);

          if (e.status == 404 && httpRequest.context.get(IGNORE_NOT_FOUND) == true)
            return throwError(() => e);

          this.router.navigate(["error"], {
            state: {
              error: {
                status: e.status,
                statusText: e.statusText,
                message: e.message
              }
            }
          });
        }
        return throwError(() => e);
      })
    );
  }
}
import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpEvent, HttpRequest, HttpHandler } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CompanyService } from './company.service';

@Injectable()
export class CompanyInterceptor implements HttpInterceptor {

  constructor(private companyService: CompanyService) {

  }

  intercept(httpRequest: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (this.companyService.getSelected()) {
      httpRequest = httpRequest.clone({
        setHeaders: { "company-id": this.companyService.getSelected().id.toString() }
      });
    }

    return next.handle(httpRequest);
  }
}
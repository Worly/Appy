import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpEvent, HttpRequest, HttpHandler } from '@angular/common/http';
import { Observable } from 'rxjs';
import { FacilityService } from './facility.service';

@Injectable()
export class FacilityInterceptor implements HttpInterceptor {

  constructor(private facilityService: FacilityService) {

  }

  intercept(httpRequest: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (this.facilityService.getSelected()) {
      httpRequest = httpRequest.clone({
        setHeaders: { "facility-id": this.facilityService.getSelected()?.id.toString() as string }
      });
    }

    return next.handle(httpRequest);
  }
}
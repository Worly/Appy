import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable, throwError } from "rxjs";
import { catchError } from "rxjs/operators";
import { TranslateService } from "src/app/components/translate/translate.service";


@Injectable()
export class ErrorTranslateInterceptor implements HttpInterceptor {

    constructor(private translate: ErrorTranslateService) { }

    intercept(httpRequest: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        return next.handle(httpRequest).pipe(
            catchError((e: HttpEvent<any>) => {
                if (e instanceof HttpErrorResponse) {
                    if (e.error != null && e.error.constructor.name === "Object") {
                        if ("errors" in e.error) {
                            for (const property in e.error.errors) {
                                if (Object.prototype.hasOwnProperty.call(e.error.errors, property)) {
                                    var newValue = this.translate.translate(e.error.errors[property]);
                                    delete e.error.errors[property];
                                    e.error.errors[camelize(property)] = newValue;
                                }
                            }
                        }
                        else
                            e.error.errors = { other: this.translate.translate("Unknown") };
                    }
                    else {
                        (e as any).error = {
                            errors: { other: this.translate.translate(e.error) },
                            error: e.error
                        }
                    }
                }
                return throwError(e);
            })
        );
    }
}

function camelize(text: string) {
    text = text.replace(/[-_\s.]+(.)?/g, (_, c) => c ? c.toUpperCase() : '');
    return text.substr(0, 1).toLowerCase() + text.substr(1);
}

@Injectable({ providedIn: "root" })
export class ErrorTranslateService {
    constructor(private translateService: TranslateService) { }

    public translate(errorCode: string) {
        if (typeof errorCode === "string")
            return errorCode;
        else
            return "UNKOWN_ERROR";
    }
}

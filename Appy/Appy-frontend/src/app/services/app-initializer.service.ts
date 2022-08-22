import { HttpErrorResponse } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Router } from "@angular/router";
import dayjs from "dayjs";
import { combineLatestWith } from "rxjs";
import { AuthService } from "../shared/services/auth/auth.service";
import { TranslateService } from "../components/translate/translate.service";

@Injectable({ providedIn: "root" })
export class AppInitializerService {
    constructor(private authService: AuthService, private translateService: TranslateService, private router: Router) { }

    public initialize(): Promise<void> {
        dayjs.updateLocale("en-gb", {
            week: {
                dow: 1
            }
        });

        dayjs.updateLocale("hr", {
            week: {
                dow: 1
            }
        });

        return new Promise((resolve, reject) => {
            this.translateService.loadLanguage().pipe(
                combineLatestWith(this.authService.loadFromLocalStorage())
            ).subscribe({
                next: () => resolve(),
                error: (e: HttpErrorResponse) => {
                    setTimeout(() => {
                        this.router.navigate(["error"], {
                            state: {
                                error: {
                                    status: e.status,
                                    statusText: e.statusText,
                                    message: e.message
                                }
                            }
                        });
                    });
                    resolve();
                }
            });
        });
    }
}
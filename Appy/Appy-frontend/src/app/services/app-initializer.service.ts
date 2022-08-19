import { Injectable } from "@angular/core";
import dayjs from "dayjs";
import { combineLatestWith } from "rxjs";
import { AuthService } from "./auth/auth.service";
import { TranslateService } from "./translate/translate.service";

@Injectable({ providedIn: "root" })
export class AppInitializerService {
    constructor(private authService: AuthService, private translateService: TranslateService) { }

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

        return new Promise((reslove, reject) => {
            this.translateService.loadLanguage().pipe(
                combineLatestWith(this.authService.loadFromLocalStorage())
            ).subscribe({
                next: () => reslove(),
                error: (e: any) => reject()
            });
        });
    }
}
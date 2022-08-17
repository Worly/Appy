import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { DateAdapter } from "@angular/material/core";
import { locale } from "dayjs";
import { Observable } from "rxjs";

@Injectable({
    providedIn: "root"
})
export class TranslateService {
    readonly SELECTED_LANGUAGE_KEY = "selected-language";

    private selectedLanguage: string = "en";

    constructor(private http: HttpClient, private dateAdapter: DateAdapter<any>) { }

    public loadLanguage(): Observable<void> {

        let storedLanguageCode = localStorage.getItem(this.SELECTED_LANGUAGE_KEY) as string;
        if (storedLanguageCode == null)
            storedLanguageCode = "en";

        return this.loadSpecificLanguage(storedLanguageCode);
    }

    public loadSpecificLanguage(languageCode: string): Observable<void> {
        return new Observable(s => {
            this.http.get<Translations>(`/assets/translations/${languageCode}.translation.json`)
                .subscribe({
                    next: (t: Translations) => {
                        this.translations = t;
                        this.selectedLanguage = languageCode;
                        locale(this.selectedLanguage);
                        this.dateAdapter.setLocale(this.selectedLanguage);
                        s.next();
                    },
                    error: (e: any) => {
                        console.log("Error while loading the language", e);
                        if (languageCode != "en") {
                            console.log("Retrying with english");
                            languageCode = "en";

                            this.loadSpecificLanguage(languageCode).subscribe({
                                next: () => {
                                    this.saveLanguageCode();
                                    s.next();
                                },
                                error: (e: any) => s.error(e)
                            });
                        }
                        else
                            s.error(e);
                    }
                });
        })
    }

    public setLanguage(languageCode: string) {
        this.loadSpecificLanguage(languageCode).subscribe(() => this.saveLanguageCode());
    }

    public getSelectedLanguageCode(): string {
        return this.selectedLanguage;
    }

    private saveLanguageCode() {
        localStorage.setItem(this.SELECTED_LANGUAGE_KEY, this.selectedLanguage);
    }

    public translate(key: string): string {
        let result = this.getDescendantProp(this.translations, key);
        if (result != null && typeof result === "string")
            return result;
        else
            return "?" + key + "?";
    }

    private getDescendantProp(obj: any, desc: string): any {
        var arr = desc.split(".");
        while (arr.length && (obj = obj[arr.shift() as any]));
        return obj;
    }


    private translations: Translations = {};
}

type Translations = {
    [key: string]: string | Translations
};
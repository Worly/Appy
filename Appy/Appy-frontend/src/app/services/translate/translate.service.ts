import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";

@Injectable({
    providedIn: "root"
})
export class TranslateService {
    constructor(private http: HttpClient) { }

    public loadLanguage(languageCode: string): Observable<void> {
        return new Observable(s => {
            this.http.get<Translations>(`/assets/translations/${languageCode}.translation.json`)
                .subscribe({
                    next: t => {
                        console.log(t);
                        this.translations = t;
                        s.next();
                    },
                    error: e => s.error(e)
                });
        })
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
        while(arr.length && (obj = obj[arr.shift() as any]));
        return obj;
    }

    private translations: Translations = {};
}

type Translations = {
    [key: string]: string | Translations
};
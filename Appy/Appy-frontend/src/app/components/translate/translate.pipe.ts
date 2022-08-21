import { Pipe, PipeTransform } from "@angular/core";
import { TranslateService } from "./translate.service";

@Pipe({ name: "translate", pure: false })
export class TranslatePipe implements PipeTransform {

    private cachedLanguage?: string;
    private cachedValue?: string;
    private cachedTranslation?: string;

    constructor(private translateService: TranslateService) {

    }

    transform(value: string | null): string | null {
        if (value == null)
            return null;

        if (this.cachedLanguage == this.translateService.getSelectedLanguageCode() && this.cachedValue == value)
            return this.cachedTranslation as string;

        this.cachedLanguage = this.translateService.getSelectedLanguageCode();
        this.cachedValue = value;
        this.cachedTranslation = this.translateService.translate(value);

        return this.cachedTranslation;
    }
}
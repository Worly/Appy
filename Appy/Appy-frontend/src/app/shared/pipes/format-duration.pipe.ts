import { Pipe, PipeTransform } from '@angular/core';
import { Duration } from "dayjs/plugin/duration";
import { TranslateService } from 'src/app/components/translate/translate.service';

@Pipe({ name: 'formatDuration' })
export class FormatDurationPipe implements PipeTransform {
    constructor(
        private translateService: TranslateService
    ) { }

    transform(duration: Duration): string {
        let parts: string[] = [];

        // return nothing when the duration is falsy or not correctly parsed (P0D)
        if (!duration || duration.toISOString() === "P0D")
            return "";

        if (duration.asDays() >= 1) {
            const days = Math.floor(duration.asDays());
            parts.push(days + " " + (days > 1 ? this.translateService.translate("DAYS") : this.translateService.translate("DAY")));
        }

        if (duration.hours() >= 1) {
            const hours = Math.floor(duration.hours());
            parts.push(hours + " " + (hours > 1 ? this.translateService.translate("HOURS") : this.translateService.translate("HOUR")));
        }

        if (duration.minutes() >= 1) {
            const minutes = Math.floor(duration.minutes());
            parts.push(minutes + " " + (minutes > 1 ? this.translateService.translate("MINUTES") : this.translateService.translate("MINUTE")));
        }

        if (duration.seconds() >= 1) {
            const seconds = Math.floor(duration.seconds());
            parts.push(seconds + " " + (seconds > 1 ? this.translateService.translate("SECONDS") : this.translateService.translate("SECOND")));
        }

        return parts.join(` ${this.translateService.translate("AND")} `);
    }
}
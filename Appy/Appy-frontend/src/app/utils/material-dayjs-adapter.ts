import { Inject, Injectable, Optional, InjectionToken } from '@angular/core';
import { DateAdapter, MatDateFormats, MAT_DATE_LOCALE } from '@angular/material/core';
import dayjs, { ConfigType, Dayjs } from 'dayjs';

/** Configurable options for {@see MomentDateAdapter}. */
export interface MatDayjsDateAdapterOptions {
    /**
     * When enabled, the dates have to match the format exactly.
     * See https://momentjs.com/guides/#/parsing/strict-mode/.
     */
    strict?: boolean;

    /**
     * Turns the use of utc dates on or off.
     * Changing this will change how Angular Material components like DatePicker output dates.
     * {@default false}
     */
    useUtc?: boolean;
}

/** InjectionToken for moment date adapter to configure options. */
export const MAT_DAYJS_DATE_ADAPTER_OPTIONS = new InjectionToken<MatDayjsDateAdapterOptions>(
    'MAT_DAYJS_DATE_ADAPTER_OPTIONS',
    {
        providedIn: 'root',
        factory: MAT_DAYJS_DATE_ADAPTER_OPTIONS_FACTORY,
    },
);

/** @docs-private */
export function MAT_DAYJS_DATE_ADAPTER_OPTIONS_FACTORY(): MatDayjsDateAdapterOptions {
    return {
        useUtc: false,
    };
}

/** Creates an array and fills it with values. */
function range<T>(length: number, valueFunction: (index: number) => T): T[] {
    const valuesArray = Array(length);
    for (let i = 0; i < length; i++) {
        valuesArray[i] = valueFunction(i);
    }
    return valuesArray;
}

/** Adapts Moment.js Dates for use with Angular Material. */
@Injectable()
export class DayjsDateAdapter extends DateAdapter<Dayjs> {
    // Note: all of the methods that accept a `Moment` input parameter immediately call `this.clone`
    // on it. This is to ensure that we're working with a `Moment` that has the correct locale setting
    // while avoiding mutating the original object passed to us. Just calling `.locale(...)` on the
    // input would mutate the object.

    private _localeData: any | {
        firstDayOfWeek: number;
        longMonths: string[];
        shortMonths: string[];
        dates: string[];
        longDaysOfWeek: string[];
        shortDaysOfWeek: string[];
        narrowDaysOfWeek: string[];
    };

    constructor(
        @Optional() @Inject(MAT_DATE_LOCALE) dateLocale: string,
        @Optional()
        @Inject(MAT_DAYJS_DATE_ADAPTER_OPTIONS)
        private _options?: MatDayjsDateAdapterOptions,
    ) {
        super();

        this.setLocale(dateLocale || dayjs.locale());
    }

    override setLocale(locale: string) {
        super.setLocale(locale);

        let momentLocaleData = dayjs().locale(locale).localeData();
        this._localeData = {
            firstDayOfWeek: momentLocaleData.firstDayOfWeek(),
            longMonths: momentLocaleData.months(),
            shortMonths: momentLocaleData.monthsShort(),
            dates: range(31, i => this.createDate(2017, 0, i + 1).format('D')),
            longDaysOfWeek: momentLocaleData.weekdays(),
            shortDaysOfWeek: momentLocaleData.weekdaysShort(),
            narrowDaysOfWeek: momentLocaleData.weekdaysMin(),
        };
    }

    getYear(date: Dayjs): number {
        return this.clone(date).year();
    }

    getMonth(date: Dayjs): number {
        return this.clone(date).month();
    }

    getDate(date: Dayjs): number {
        return this.clone(date).date();
    }

    getDayOfWeek(date: Dayjs): number {
        return this.clone(date).day();
    }

    getMonthNames(style: 'long' | 'short' | 'narrow'): string[] {
        // Moment.js doesn't support narrow month names, so we just use short if narrow is requested.
        return style == 'long' ? this._localeData.longMonths : this._localeData.shortMonths;
    }

    getDateNames(): string[] {
        return this._localeData.dates;
    }

    getDayOfWeekNames(style: 'long' | 'short' | 'narrow'): string[] {
        if (style == 'long') {
            return this._localeData.longDaysOfWeek;
        }
        if (style == 'short') {
            return this._localeData.shortDaysOfWeek;
        }
        return this._localeData.narrowDaysOfWeek;
    }

    getYearName(date: Dayjs): string {
        return this.clone(date).format('YYYY');
    }

    getFirstDayOfWeek(): number {
        return this._localeData.firstDayOfWeek;
    }

    getNumDaysInMonth(date: Dayjs): number {
        return this.clone(date).daysInMonth();
    }

    clone(date: Dayjs): Dayjs {
        return date.clone().locale(this.locale);
    }

    createDate(year: number, month: number, date: number): Dayjs {
        const result = this._createDayjs({ year, month, date }).locale(this.locale);

        return result;
    }

    today(): Dayjs {
        return this._createDayjs().locale(this.locale);
    }

    parse(value: any, parseFormat: string): Dayjs | null {
        if (value && typeof value == 'string') {
            return this._createDayjs(value, parseFormat, this.locale);
        }
        return value ? this._createDayjs(value).locale(this.locale) : null;
    }

    format(date: Dayjs, displayFormat: string): string {
        date = this.clone(date);
        return date.format(displayFormat);
    }

    addCalendarYears(date: Dayjs, years: number): Dayjs {
        return this.clone(date).add({ years });
    }

    addCalendarMonths(date: Dayjs, months: number): Dayjs {
        return this.clone(date).add({ months });
    }

    addCalendarDays(date: Dayjs, days: number): Dayjs {
        return this.clone(date).add({ days });
    }

    toIso8601(date: Dayjs): string {
        return this.clone(date).toISOString();
    }

    /**
     * Returns the given value if given a valid Moment or null. Deserializes valid ISO 8601 strings
     * (https://www.ietf.org/rfc/rfc3339.txt) and valid Date objects into valid Moments and empty
     * string into null. Returns an invalid date for all other values.
     */
    override deserialize(value: any): Dayjs | null {
        let date;
        if (value instanceof Date) {
            date = this._createDayjs(value).locale(this.locale);
        } else if (this.isDateInstance(value)) {
            // Note: assumes that cloning also sets the correct locale.
            return this.clone(value);
        }
        if (typeof value === 'string') {
            if (!value) {
                return null;
            }
            date = this._createDayjs(value).locale(this.locale);
        }
        if (date && this.isValid(date)) {
            return this._createDayjs(date).locale(this.locale);
        }
        return super.deserialize(value);
    }

    isDateInstance(obj: any): boolean {
        return dayjs.isDayjs(obj);
    }

    isValid(date: Dayjs): boolean {
        return this.clone(date).isValid();
    }

    invalid(): Dayjs {
        return dayjs("invalid date");
    }

    /** Creates a Moment instance while respecting the current UTC settings. */
    private _createDayjs(
        date?: ConfigType,
        format?: string,
        locale?: string,
    ): Dayjs {
        const { strict, useUtc }: MatDayjsDateAdapterOptions = this._options || {};

        let d = useUtc ? dayjs.utc(date, format, strict) : dayjs(date, format, locale, strict);

        return locale ? d.locale(locale) : d;
    }
}

export const MAT_DAYJS_DATE_FORMATS: MatDateFormats = {
    parse: {
      dateInput: 'l',
    },
    display: {
      dateInput: 'l',
      monthYearLabel: 'MMM YYYY',
      dateA11yLabel: 'LL',
      monthYearA11yLabel: 'MMMM YYYY',
    },
  };
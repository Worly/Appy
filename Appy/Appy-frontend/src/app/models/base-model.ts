const brokenValidationsSymbol = Symbol("#S-brokenValidations")

export abstract class BaseModel {
    protected validations: Validation[] = [];

    [brokenValidationsSymbol]: {
        [propertyName: string]: string[]
    } = {};

    initProperties() {
        for (let p in this) {
            let currentValue = this[p] as any;
            let symbol = Symbol(p);
            Object.defineProperty(this, p, {
                enumerable: true,
                configurable: true,
                set(value) {
                    this[symbol] = value;
                    this.propertyChanged(p);
                },
                get() {
                    return this[symbol];
                }
            });
            (this as any)[symbol] = currentValue;
        }
    }

    public getId(): any {
        return (this as any).id;
    }

    public abstract getDTO(): any;

    protected propertyChanged(propertyName: string) {
        this.validateProperty(propertyName);
    }

    private validateProperty(propertyName: string) {
        this[brokenValidationsSymbol][propertyName] = [];

        for (let validation of this.validations) {
            if (validation.propertyName != propertyName)
                continue;

            if (!validation.isValid())
                this[brokenValidationsSymbol][propertyName].push(validation.errorCode);
        }
    }

    public validate(): boolean {
        let isValid = true;
        this[brokenValidationsSymbol] = {};

        for (let validation of this.validations) {
            if (!validation.isValid()) {
                if (this[brokenValidationsSymbol][validation.propertyName] == null)
                    this[brokenValidationsSymbol][validation.propertyName] = [];

                this[brokenValidationsSymbol][validation.propertyName].push(validation.errorCode);
                isValid = false;
            }
        }

        return isValid;
    }

    public getValidationErrors(propertyName: string): string | null {
        let errorCodes = this[brokenValidationsSymbol][propertyName];
        if (errorCodes != null && errorCodes.length > 0)
            return errorCodes[0];
        else
            return null;
    }

    public applyServerValidationErrors(errors: { [propertyName: string]: string }): void {
        for (let propertyName in errors) {
            if (this[brokenValidationsSymbol][propertyName] == null)
                this[brokenValidationsSymbol][propertyName] = [];

            this[brokenValidationsSymbol][propertyName].push(errors[propertyName]);
        }
    }
}

export type Validation = {
    isValid: (() => boolean);
    propertyName: string;
    errorCode: string;
}

export let REQUIRED_VALIDATION = (value: any) => {
    if (value == null || value == undefined)
        return false;

    if (typeof value === "string" && value == "")
        return false;

    return true;
};
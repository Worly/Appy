import { Observable, Subject } from "rxjs";

const brokenValidationsSymbol = Symbol("#S-brokenValidations")
const onPropertyChangedSymbol = Symbol("#S-onPropertyChanged");
const childrensKeysSymbol = Symbol("#S-childrensKeys")

export function Children(target: BaseEditModel, propertyKey: string) {
    if (target[childrensKeysSymbol] == null)
        target[childrensKeysSymbol] = [];

    target[childrensKeysSymbol].push(propertyKey);
}

export interface IIdentifiable {
    getId(): any;
}

export interface IPropertyUpdateable {
    getPropertyNames(): string[];
    getPropertyValue(propertyName: string): any;
    setPropertyValue(propertyName: string, value: any): void;
}

export abstract class BaseModel implements IIdentifiable, IPropertyUpdateable {
    [onPropertyChangedSymbol]: Subject<string> = new Subject();
    [childrensKeysSymbol]: string[] | undefined;

    public getId(): any {
        return (this as any).id;
    }

    initProperties() {
        for (let p in this) {
            let isChildren = this[childrensKeysSymbol] != null && this[childrensKeysSymbol].includes(p);

            let currentValue = this[p] as any;

            let symbol = Symbol(p);
            Object.defineProperty(this, p, {
                enumerable: true,
                configurable: true,
                set(value) {
                    if (isChildren) {
                        this.assertChildrenType(value);

                        value = this.initChildren(value);
                    }

                    this[symbol] = value;

                    this.propertyChanged(p);
                },
                get() {
                    return this[symbol];
                }
            });

            if (isChildren) {
                this.assertChildrenType(currentValue);

                currentValue = this.initChildren(currentValue);
            }

            (this as any)[symbol] = currentValue;
        }
    }

    private assertChildrenType(children: any) {
        if (!Array.isArray(children)) {
            throw new Error("Children type must be an array");
        }

        for (let child of children) {
            this.assertChildType(child);
        }
    }

    private assertChildType(child: any) {
        if (!(child instanceof BaseEditModel))
            throw new Error("Child type must be a BaseModel");
    }

    private initChildren(children: BaseEditModel[]): BaseEditModel[] {
        var proxyHandler = {
            set: (target: BaseEditModel[], prop: any, value: any) => {
                let index = parseInt(prop);
                if (!isNaN(index)) {
                    this.assertChildType(value);
                    target[index] = value;
                    return true;
                }

                target[prop] = value;
                return true;
            }
        }

        var proxy = new Proxy(children, proxyHandler);

        return proxy;
    }

    protected propertyChanged(propertyName: string) {
        this[onPropertyChangedSymbol].next(propertyName);
    }

    public getOnPropertyChanged(): Observable<string> {
        return this[onPropertyChangedSymbol];
    }

    public getPropertyNames(): string[] {
        let symbols = Object.getOwnPropertySymbols(this);

        return symbols
            .filter(s => s.description != null && !s.description.startsWith("#S-"))
            .map(s => s.description!);
    }

    public getPropertyValue(propertyName: string): any {
        return (this as any)[propertyName];
    }

    public setPropertyValue(propertyName: string, value: any): void {
        (this as any)[propertyName] = value;
    }
}

abstract class BaseEditModel extends BaseModel {
    public abstract getDTO(): any;

    protected override propertyChanged(propertyName: string) {
        this.validateProperty(propertyName);

        super.propertyChanged(propertyName);
    }

    public abstract validateProperty(propertyName: string): void;
    public abstract validate(): boolean;
    public abstract applyServerValidationErrors(errors: ServerValidationErrors): void;
}

export abstract class EditModel<ModelT> extends BaseEditModel {
    protected validations: Validation<ModelT>[] = [];

    [brokenValidationsSymbol]: {
        [propertyName: string]: string[]
    } = {};

    public override validateProperty(propertyName: string) {
        this[brokenValidationsSymbol][propertyName] = [];

        for (let validation of this.validations) {
            if (validation.propertyName != propertyName
                && (validation.responsibleProperties == null || !validation.responsibleProperties.includes(propertyName)))
                continue;

            this.validateValidation(validation);
        }
    }

    public override validate(): boolean {
        let isValid = true;
        this[brokenValidationsSymbol] = {};

        for (let validation of this.validations) {
            isValid = this.validateValidation(validation) && isValid;
        }

        if (this[childrensKeysSymbol] != null) {
            for (let childrenKey of this[childrensKeysSymbol]) {
                let children = (this as any)[childrenKey] as BaseEditModel[];

                for (let child of children) {
                    isValid = child.validate() && isValid;
                }
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

    public applyServerValidationErrors(errors: ServerValidationErrors): void {
        if (typeof errors != "object") {
            throw new Error("Server validation errors must be of type object, got " + typeof errors);
        }

        if (Array.isArray(errors)) {
            throw new Error("Server validation errors must be of type object, got array");
        }

        for (let propertyName in errors) {
            if (!(propertyName in this)) {
                throw new Error(`Got server validation error for non-existing property ${propertyName}`)
            }

            let isChildren = this[childrensKeysSymbol]?.includes(propertyName);

            if (isChildren) {
                if (!Array.isArray(errors[propertyName])) {
                    throw new Error("Server validation errors for children must be an array, got " + typeof errors[propertyName]);
                }

                let children = (this as any)[propertyName] as BaseEditModel[];
                let childrenErrors = errors[propertyName] as ServerValidationErrors[];

                if (childrenErrors.length > children.length) {
                    throw new Error(`Server validation errors for children at ${propertyName} has more ` +
                        `items (${childrenErrors.length}) than children count (${children.length})`);
                }

                for (let i = 0; i < childrenErrors.length; i++) {
                    children[i].applyServerValidationErrors(childrenErrors[i]);
                }
            }
            else {
                if (typeof errors[propertyName] == "string") {
                    this.addBrokenValidation(propertyName, errors[propertyName] as string);
                }
                else if (Array.isArray(errors[propertyName])) {
                    let errorArray = errors[propertyName] as string[];

                    for (let err of errorArray) {
                        if (typeof err != "string") {
                            throw new Error(`Server validation error array for property ${propertyName} contains non string elements: ${JSON.stringify(errorArray)}`);
                        }

                        this.addBrokenValidation(propertyName, err);
                    }
                }
                else {
                    throw new Error("Unknown server validation error value " + errors[propertyName] + " on property " + propertyName);
                }
            }
        }
    }

    private validateValidation(validation: Validation<ModelT>): boolean {
        if (!validation.isValid(this as unknown as ModelT)) {
            this.addBrokenValidation(validation.propertyName, validation.errorCode);

            return false;
        }

        if (this[brokenValidationsSymbol][validation.propertyName] != null) {
            let index = this[brokenValidationsSymbol][validation.propertyName].indexOf(validation.errorCode);
            this[brokenValidationsSymbol][validation.propertyName].splice(index, 1);
        }

        return true;
    }

    private addBrokenValidation(propertyName: string, errorCode: string) {
        if (this[brokenValidationsSymbol][propertyName] == null)
            this[brokenValidationsSymbol][propertyName] = [];

        if (!this[brokenValidationsSymbol][propertyName].includes(errorCode))
            this[brokenValidationsSymbol][propertyName].push(errorCode);
    }
}

export type Validation<ModelT> = {
    isValid: ((model: ModelT) => boolean);
    propertyName: string;
    responsibleProperties?: string[];
    errorCode: string;
}

export type ServerValidationErrors = {
    [property: string]: string | string[]
    | ServerValidationErrors[] // children validation errors
}

export let REQUIRED_VALIDATION = (value: any) => {
    if (value == null || value == undefined)
        return false;

    if (typeof value === "string" && value == "")
        return false;

    return true;
};
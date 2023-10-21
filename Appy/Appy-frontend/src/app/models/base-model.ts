import { Observable, Subject } from "rxjs";

const brokenValidationsSymbol = Symbol("#S-brokenValidations")
const onPropertyChangedSymbol = Symbol("#S-onPropertyChanged");
const childrensKeysSymbol = Symbol("#S-childrensKeys")

export function Children(target: BaseModel, propertyKey: string) {
    if (target[childrensKeysSymbol] == null)
        target[childrensKeysSymbol] = [];

    target[childrensKeysSymbol].push(propertyKey);
}

abstract class BaseModel {

    [onPropertyChangedSymbol]: Subject<string> = new Subject();
    [childrensKeysSymbol]: string[] | undefined;

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
        if (!(child instanceof BaseModel))
            throw new Error("Child type must be a BaseModel");
    }

    private initChildren(children: BaseModel[]): BaseModel[] {
        var proxyHandler = {
            set: (target: BaseModel[], prop: any, value: any) => {
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

    public getId(): any {
        return (this as any).id;
    }

    public abstract getDTO(): any;

    protected propertyChanged(propertyName: string) {
        this.validateProperty(propertyName);

        this[onPropertyChangedSymbol].next(propertyName);
    }

    public getOnPropertyChanged(): Observable<string> {
        return this[onPropertyChangedSymbol];
    }

    public abstract validateProperty(propertyName: string): void;
    public abstract validate(): boolean;
}

export abstract class Model<ModelT> extends BaseModel {
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
                let children = (this as any)[childrenKey] as BaseModel[];

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

    public applyServerValidationErrors(errors: { [propertyName: string]: string }): void {
        for (let propertyName in errors) {
            if (this[brokenValidationsSymbol][propertyName] == null)
                this[brokenValidationsSymbol][propertyName] = [];

            this[brokenValidationsSymbol][propertyName].push(errors[propertyName]);
        }
    }

    private validateValidation(validation: Validation<ModelT>): boolean {
        if (!validation.isValid(this as unknown as ModelT)) {
            if (this[brokenValidationsSymbol][validation.propertyName] == null)
                this[brokenValidationsSymbol][validation.propertyName] = [];

            if (!this[brokenValidationsSymbol][validation.propertyName].includes(validation.errorCode))
                this[brokenValidationsSymbol][validation.propertyName].push(validation.errorCode);

            return false;
        }

        if (this[brokenValidationsSymbol][validation.propertyName] != null) {
            let index = this[brokenValidationsSymbol][validation.propertyName].indexOf(validation.errorCode);
            this[brokenValidationsSymbol][validation.propertyName].splice(index, 1);
        }

        return true;
    }
}

export type Validation<ModelT> = {
    isValid: ((model: ModelT) => boolean);
    propertyName: string;
    responsibleProperties?: string[];
    errorCode: string;
}

export let REQUIRED_VALIDATION = (value: any) => {
    if (value == null || value == undefined)
        return false;

    if (typeof value === "string" && value == "")
        return false;

    return true;
};
export type SmartFilter = FieldFilter | ["not", SmartFilter] | [SmartFilter, "and" | "or", SmartFilter]

export type FieldFilter = [string, FieldComparer, Value]

export type FieldComparer = "==" | "<" | ">" | ">=" | "<=" | "!=" | "contains";

export type Value = string | number | null;

export function applySmartFilter(object: { [key: string]: any }, filter: SmartFilter): boolean {
    // ["not", SmartFilter]
    if (filter.length == 2 && filter[0] == "not") {
        return !applySmartFilter(object, filter[1]);
    }
    // [SmartFilter, "and" | "or", SmartFilter]
    else if (filter.length == 3 && Array.isArray(filter[0]) && Array.isArray(filter[2])) {
        switch (filter[1]) {
            case "and":
                return applySmartFilter(object, filter[0]) && applySmartFilter(object, filter[2]);
            case "or":
                return applySmartFilter(object, filter[0]) || applySmartFilter(object, filter[2]);
            default:
                throw new Error(`Undefined logical operator '${filter[1]}' found while applying SmartFilter.`);
        }
    }
    // FieldFilter
    else if (filter.length == 3 && typeof filter[0] == "string" && (filter[2] == null || typeof filter[2] == "string" || typeof filter[2] == "number")) {
        return applyFieldFilter(object, <FieldFilter>filter);
    }
    else {
        throw new Error("Wrong format SmartFilter supplied: " + filter);
    }
}

function applyFieldFilter(object: { [key: string]: any }, filter: FieldFilter): boolean {
    let propertyName = filter[0];
    let comparer = filter[1];
    let value = filter[2];

    return applyFieldFilterInternal(object, propertyName, comparer, value);
}

function applyFieldFilterInternal(object: { [key: string]: any }, propertyName: string, comparer: FieldComparer, value: Value): boolean {
    if (propertyName.includes(".")) {
        let index = propertyName.indexOf(".");
        let nextPropertyName = propertyName.substring(0, index);
        let restPropertyName = propertyName.substring(index + 1);

        if (!(nextPropertyName in object)) {
            throw new Error(`Object does not contain a property with name ${nextPropertyName}`);
        }

        return applyFieldFilterInternal(object[nextPropertyName], restPropertyName, comparer, value);
    }

    if (!(propertyName in object)) {
        throw new Error(`Object does not contain a property with name ${propertyName}`);
    }

    if (value == null || object[propertyName] == null) {
        if (comparer == "==")
            return object[propertyName] == value;
        else if (comparer == "!=")
            return object[propertyName] != value;
        else
            throw new Error(`Unsupported operator ${comparer} when comparing with null.`);
    }

    if (typeof object[propertyName] != typeof value) {
        throw new Error(`Cannot compare different types : typeof object[${propertyName}] != typeof ${value}`);
    }

    switch (comparer) {
        case "==":
            return object[propertyName] == value;
        case "<":
            return object[propertyName] < value;
        case ">":
            return object[propertyName] > value;
        case "<=":
            return object[propertyName] <= value;
        case ">=":
            return object[propertyName] >= value;
        case "!=":
            return object[propertyName] != value;
        case "contains":
            if (typeof object[propertyName] != "string" || typeof value != "string") {
                throw new Error("Cannot apply operator 'contains' on non-string values.");
            }
            return contains(object[propertyName], value);
        default:
            throw new Error(`undefined operator ${comparer} found while applying FieldFilter.`);
    }
}

function contains(property: string, value: string) {
    return property.toLowerCase().includes(value.toLowerCase());
}
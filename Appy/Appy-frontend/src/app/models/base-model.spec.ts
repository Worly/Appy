import { Model as _BaseModel, Children, Validation } from "./base-model";

class BaseModel extends _BaseModel<BaseModel> {
    public id: number = 0;
    public str: string = "";

    public constructor(validations: Validation<BaseModel>[] = []) {
        super();
        this.validations = validations;
        this.initProperties();
    }

    public getDTO() {
        throw new Error("Method not implemented.");
    }
}

class Child extends _BaseModel<BaseModel> {
    public id: number = 0;
    public str: string = "";

    constructor(validations: Validation<BaseModel>[] = []) {
        super();
        this.validations = validations;
        this.initProperties();
    }

    public getDTO() {
        throw new Error("Method not implemented.");
    }
}

describe("BaseModel - validations", () => {
    let errInvalidStr = "Error1";
    let errInvalidInt = "Error2";
    let errInvalidStrDependsOnInt = "Error3";
    let errInvalidIncludesStr = "Error4";

    let validStr: Validation<BaseModel> = {
        isValid: (model: BaseModel) => model.str == "valid",
        propertyName: "str",
        errorCode: errInvalidStr
    };

    let validInt: Validation<BaseModel> = {
        isValid: (model: BaseModel) => model.id >= 0,
        propertyName: "id",
        errorCode: errInvalidInt
    }

    let validStrDependsOnInt: Validation<BaseModel> = {
        isValid: (model: BaseModel) => model.str == "valid",
        propertyName: "str",
        errorCode: errInvalidStrDependsOnInt,
        responsibleProperties: ["id"]
    };

    let includesValidStr: Validation<BaseModel> = {
        isValid: (model: BaseModel) => model.str.includes("valid"),
        propertyName: "str",
        errorCode: errInvalidIncludesStr,
    };

    it("should not validate on creation", () => {
        let model = new BaseModel([validStr]);

        expect(model.getValidationErrors("str")).toBeNull();
    })

    it("should validate on validate", () => {
        let model = new BaseModel([validStr]);
        expect(model.validate()).toBeFalse();

        expect(model.getValidationErrors("str")).toBe(errInvalidStr);
    })

    it("should validate on validateProperty", () => {
        let model = new BaseModel([validStr]);
        model.validateProperty("str");

        expect(model.getValidationErrors("str")).toBe(errInvalidStr);
    })

    it("should validate on propertyChange", () => {
        let model = new BaseModel([validStr]);

        expect(model.getValidationErrors("str")).toBeNull();

        model.str = "notValid";

        expect(model.getValidationErrors("str")).toBe(errInvalidStr);

        model.str = "valid";

        expect(model.getValidationErrors("str")).toBeNull();
    })

    it("should validate on responsible property changed", () => {
        let model = new BaseModel([validStrDependsOnInt]);

        expect(model.getValidationErrors("str")).toBeNull();
        expect(model.getValidationErrors("id")).toBeNull();

        model.id = 69;

        expect(model.getValidationErrors("str")).toBe(errInvalidStrDependsOnInt);
        expect(model.getValidationErrors("id")).toBeNull();

        model.str = "valid";

        expect(model.getValidationErrors("str")).toBeNull();
        expect(model.getValidationErrors("id")).toBeNull();
    })

    it("should throw on wrong server validation object", () => {
        let model = new BaseModel();

        // wrong validation errors type
        expect(() => model.applyServerValidationErrors("str" as any)).toThrowError("Server validation errors must be of type object, got string");
        expect(() => model.applyServerValidationErrors(["str", 2] as any)).toThrowError("Server validation errors must be of type object, got array");

        // non existing property
        expect(() => model.applyServerValidationErrors({ "aa": "b" })).toThrowError("Got server validation error for non-existing property aa");

        // wrong validation error type
        expect(() => model.applyServerValidationErrors({ "str": 3 } as any)).toThrowError("Unknown server validation error value 3 on property str");
        expect(() => model.applyServerValidationErrors({ "str": true } as any)).toThrowError("Unknown server validation error value true on property str");

        // wrong type of item in array
        expect(() => model.applyServerValidationErrors({ "str": ["err1", 3] } as any)).toThrowError("Server validation error array for property str contains non string elements: [\"err1\",3]");
        expect(() => model.applyServerValidationErrors({ "str": ["err1", []] } as any)).toThrowError("Server validation error array for property str contains non string elements: [\"err1\",[]]");
    });

    it("should correctly apply server validation errors", () => {
        let model = new BaseModel();

        model.applyServerValidationErrors({ "str": "err1" });
        expect(model.getValidationErrors("str")).toBe("err1");

        model.applyServerValidationErrors({ "str": "err2" });
        expect(model.getValidationErrors("str")).toBe("err1");

        model.validate();
        model.applyServerValidationErrors({ "str": "err2" });
        expect(model.getValidationErrors("str")).toBe("err2");

        model.validate();
        model.applyServerValidationErrors({ "str": ["err3", "err4"] });
        expect(model.getValidationErrors("str")).toBe("err3"); // for now we can only get one validation error

        model.validate();
        model.applyServerValidationErrors({ "str": "strErr", "id": "idErr" });
        expect(model.getValidationErrors("str")).toBe("strErr");
        expect(model.getValidationErrors("id")).toBe("idErr");
    });

    it("should clear server validation on valid change", () => {
        let model = new BaseModel([validStr]);

        model.applyServerValidationErrors({ "str": errInvalidInt });

        expect(model.getValidationErrors("str")).toBe(errInvalidInt);

        model.str = "valid";

        expect(model.getValidationErrors("str")).toBeNull();
    });

    it("should clear server validation on invalid change", () => {
        let model = new BaseModel([validStr]);

        model.applyServerValidationErrors({ "str": errInvalidInt });

        expect(model.getValidationErrors("str")).toBe(errInvalidInt);

        model.str = "notValid";

        expect(model.getValidationErrors("str")).toBe(errInvalidStr);
    });

    it("should work with more validated properties", () => {
        let model = new BaseModel([validStr, validInt]);

        expect(model.getValidationErrors("str")).toBeNull();
        expect(model.getValidationErrors("id")).toBeNull();

        expect(model.validate()).toBeFalse();

        expect(model.getValidationErrors("str")).toBe(errInvalidStr);
        expect(model.getValidationErrors("id")).toBeNull();

        model.id = -1;

        expect(model.getValidationErrors("str")).toBe(errInvalidStr);
        expect(model.getValidationErrors("id")).toBe(errInvalidInt);

        model.applyServerValidationErrors({ "str": errInvalidInt });

        expect(model.getValidationErrors("str")).toBe(errInvalidStr);
        expect(model.getValidationErrors("id")).toBe(errInvalidInt);

        model.str = "valid";

        expect(model.getValidationErrors("str")).toBeNull();
        expect(model.getValidationErrors("id")).toBe(errInvalidInt);
    })

    it("should work with more validated properties", () => {
        let model = new BaseModel([validStr, validInt]);

        expect(model.getValidationErrors("str")).toBeNull();
        expect(model.getValidationErrors("id")).toBeNull();

        expect(model.validate()).toBeFalse();

        expect(model.getValidationErrors("str")).toBe(errInvalidStr);
        expect(model.getValidationErrors("id")).toBeNull();

        model.id = -1;

        expect(model.getValidationErrors("str")).toBe(errInvalidStr);
        expect(model.getValidationErrors("id")).toBe(errInvalidInt);

        model.applyServerValidationErrors({ "str": errInvalidInt });

        expect(model.getValidationErrors("str")).toBe(errInvalidStr);
        expect(model.getValidationErrors("id")).toBe(errInvalidInt);

        model.str = "valid";

        expect(model.getValidationErrors("str")).toBeNull();
        expect(model.getValidationErrors("id")).toBe(errInvalidInt);
    })

    it("should work with more validated properties responsible for each other", () => {
        let model = new BaseModel([validStrDependsOnInt, validInt]);

        expect(model.getValidationErrors("str")).toBeNull();
        expect(model.getValidationErrors("id")).toBeNull();

        model.id = -1;

        expect(model.getValidationErrors("str")).toBe(errInvalidStrDependsOnInt);
        expect(model.getValidationErrors("id")).toBe(errInvalidInt);

        model.str = "valid";

        expect(model.getValidationErrors("str")).toBeNull();
        expect(model.getValidationErrors("id")).toBe(errInvalidInt);

        model.id = 0;

        expect(model.getValidationErrors("str")).toBeNull();
        expect(model.getValidationErrors("id")).toBeNull();
    })

    it("should work with more validations on a single property", () => {
        let model = new BaseModel([includesValidStr, validStr]);

        expect(model.getValidationErrors("str")).toBeNull();

        expect(model.validate()).toBeFalse();

        // includesValidStr is first
        expect(model.getValidationErrors("str")).toBe(errInvalidIncludesStr);

        model.str = "validYes";

        expect(model.getValidationErrors("str")).toBe(errInvalidStr);

        model.str = "";

        expect(model.getValidationErrors("str")).toBe(errInvalidIncludesStr);

        model.str = "valid";

        expect(model.getValidationErrors("str")).toBeNull();
    })

    it("should work with more validations on a single property with responsible properties", () => {
        let model = new BaseModel([includesValidStr, validStrDependsOnInt]);

        expect(model.getValidationErrors("str")).toBeNull();

        model.id = 3;

        expect(model.getValidationErrors("str")).toBe(errInvalidStrDependsOnInt);

        model.str = "";

        expect(model.getValidationErrors("str")).toBe(errInvalidIncludesStr);

        model.str = "valid";

        expect(model.getValidationErrors("str")).toBeNull();
    })
});

describe("BaseModel - children type assertion", () => {
    it("should throw if child type is not array", () => {
        class M extends BaseModel {
            @Children
            children: string = "a";
        }

        let model = new M();

        expect(() => model.initProperties()).toThrowError("Children type must be an array");
    })
    it("should throw if child type is not BaseModel", () => {
        class M extends BaseModel {
            @Children
            children: string[] = ["v1", "v2"];
        }

        let model = new M();

        expect(() => model.initProperties()).toThrowError("Child type must be a BaseModel");
    })
    it("should not throw if child type is array of BaseModel - empty", () => {
        class M extends BaseModel {
            @Children
            children: Child[] = [];
        }

        let model = new M();

        expect(() => model.initProperties()).not.toThrowError();
    })
    it("should not throw if child type is array of BaseModel - with child", () => {
        class M extends BaseModel {
            @Children
            children: Child[] = [new Child()];
        }

        let model = new M();

        expect(() => model.initProperties()).not.toThrowError();
    })
    it("should throw if child array is assigned to not array", () => {
        class M extends BaseModel {
            @Children
            children: Child[] = [new Child()];
        }

        let model = new M();

        expect(() => model.initProperties()).not.toThrowError();

        expect(() => model.children = <any>"str").toThrowError("Children type must be an array");
    })
    it("should throw if child array is assigned to array of not BaseModel", () => {
        class M extends BaseModel {
            @Children
            children: Child[] = [new Child()];
        }

        let model = new M();

        expect(() => model.initProperties()).not.toThrowError();

        expect(() => model.children = <any>["str"]).toThrowError("Child type must be a BaseModel");
    })
    it("should throw if to child array is pushed not BaseModel", () => {
        class M extends BaseModel {
            @Children
            children: Child[] = [new Child()];
        }

        let model = new M();

        expect(() => model.initProperties()).not.toThrowError();

        expect(() => model.children.push(<any>"str")).toThrowError("Child type must be a BaseModel");
    })
    it("should throw if to child array is pushed not BaseModel after reassigning the children array", () => {
        class M extends BaseModel {
            @Children
            children: Child[] = [new Child()];
        }

        let model = new M();

        expect(() => model.initProperties()).not.toThrowError();

        model.children = [];

        expect(() => model.children.push(<any>"str")).toThrowError("Child type must be a BaseModel");
    })
    it("should not throw if to child array is pushed a BaseModel", () => {
        class M extends BaseModel {
            @Children
            children: Child[] = [new Child()];
        }

        let model = new M();

        expect(() => model.initProperties()).not.toThrowError();

        expect(() => model.children.push(new Child())).not.toThrowError();
        expect(model.children.length).toBe(2);
    })
    it("should throw if to child array is set not BaseModel", () => {
        class M extends BaseModel {
            @Children
            children: Child[] = [new Child()];
        }

        let model = new M();

        expect(() => model.initProperties()).not.toThrowError();

        model.children = [];

        expect(() => model.children[0] = <any>"str").toThrowError("Child type must be a BaseModel");
    })
});

describe("BaseModel - children validation", () => {
    let errInvalidStr = "Error1";
    let errInvalidInt = "Error2";

    let validStr: Validation<BaseModel> = {
        isValid: (model: BaseModel) => model.str == "valid",
        propertyName: "str",
        errorCode: errInvalidStr
    };

    let validInt: Validation<BaseModel> = {
        isValid: (model: BaseModel) => model.id > 0,
        propertyName: "id",
        errorCode: errInvalidInt
    }

    it("should validate children on validate", () => {
        class M extends BaseModel {
            @Children
            children: Child[] = [new Child([validStr]), new Child([validInt])];
        }

        let model = new M();

        expect(model.children[0].getValidationErrors("str")).toBeNull();
        expect(model.children[1].getValidationErrors("id")).toBeNull();

        expect(model.validate()).toBeFalse();

        expect(model.children[0].getValidationErrors("str")).toBe(errInvalidStr);
        expect(model.children[1].getValidationErrors("id")).toBe(errInvalidInt);
    })

    it("should throw on wrong child server validation error object", () => {
        class M extends BaseModel {
            @Children
            children: Child[] = [new Child([validStr]), new Child([validInt])];
        }

        let model = new M();

        expect(() => model.applyServerValidationErrors({ "children": "str" })).toThrowError("Server validation errors for children must be an array, got string");
        expect(() => model.applyServerValidationErrors({ "children": 4 } as any)).toThrowError("Server validation errors for children must be an array, got number");

        expect(() => model.applyServerValidationErrors({ "children": ["str"] })).toThrowError("Server validation errors must be of type object, got string");
        expect(() => model.applyServerValidationErrors({ "children": [[]] } as any)).toThrowError("Server validation errors must be of type object, got array");

        expect(() => model.applyServerValidationErrors({ "children": [{}, {}, {}] } as any))
            .toThrowError("Server validation errors for children at children has more items (3) than children count (2)");
    })

    it("should correctly apply child server validation errors", () => {
        class M extends BaseModel {
            @Children
            children: Child[] = [new Child(), new Child()];
        }

        let model = new M();

        model.applyServerValidationErrors({
            "children": [
                { "str": "strErr", "id": "intErr" },
                { "str": "strErr2" }
            ]
        })

        expect(model.children[0].getValidationErrors("str")).toBe("strErr");
        expect(model.children[0].getValidationErrors("id")).toBe("intErr");
        expect(model.children[1].getValidationErrors("str")).toBe("strErr2");
        expect(model.children[1].getValidationErrors("id")).toBeNull();

        model.validate();
        expect(model.children[0].getValidationErrors("str")).toBeNull();
        expect(model.children[0].getValidationErrors("id")).toBeNull();
        expect(model.children[1].getValidationErrors("str")).toBeNull();
        expect(model.children[1].getValidationErrors("id")).toBeNull();

        model.applyServerValidationErrors({
            "str": "parentStr",
            "children": [
                { "str": "strErr", "id": ["intErr", "intErr2"] },
                { "str": "strErr2" }
            ],
            "id": ["parentId", "parentId2"]
        })

        expect(model.children[0].getValidationErrors("str")).toBe("strErr");
        expect(model.children[0].getValidationErrors("id")).toBe("intErr");
        expect(model.children[1].getValidationErrors("str")).toBe("strErr2");
        expect(model.children[1].getValidationErrors("id")).toBeNull();
        expect(model.getValidationErrors("str")).toBe("parentStr");
        expect(model.getValidationErrors("id")).toBe("parentId");
    })
});
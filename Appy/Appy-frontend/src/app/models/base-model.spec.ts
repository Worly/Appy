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
    constructor() {
        super();

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
        model.validate();

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

    it("should clear server validation on valid change", () => {
        let model = new BaseModel([validStr]);
        
        model.applyServerValidationErrors({"str": errInvalidInt});

        expect(model.getValidationErrors("str")).toBe(errInvalidInt);

        model.str = "valid";

        expect(model.getValidationErrors("str")).toBeNull();
    });

    it("should clear server validation on invalid change", () => {
        let model = new BaseModel([validStr]);
        
        model.applyServerValidationErrors({"str": errInvalidInt});

        expect(model.getValidationErrors("str")).toBe(errInvalidInt);

        model.str = "notValid";

        expect(model.getValidationErrors("str")).toBe(errInvalidStr);
    });

    it("should work with more validated properties", () => {
        let model = new BaseModel([validStr, validInt]);

        expect(model.getValidationErrors("str")).toBeNull();
        expect(model.getValidationErrors("id")).toBeNull();

        model.validate();
        
        expect(model.getValidationErrors("str")).toBe(errInvalidStr);
        expect(model.getValidationErrors("id")).toBeNull();

        model.id = -1;
        
        expect(model.getValidationErrors("str")).toBe(errInvalidStr);
        expect(model.getValidationErrors("id")).toBe(errInvalidInt);

        model.applyServerValidationErrors({"str": errInvalidInt});
        
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

        model.validate();
        
        expect(model.getValidationErrors("str")).toBe(errInvalidStr);
        expect(model.getValidationErrors("id")).toBeNull();

        model.id = -1;
        
        expect(model.getValidationErrors("str")).toBe(errInvalidStr);
        expect(model.getValidationErrors("id")).toBe(errInvalidInt);

        model.applyServerValidationErrors({"str": errInvalidInt});
        
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

        model.validate();

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
    it("")
});
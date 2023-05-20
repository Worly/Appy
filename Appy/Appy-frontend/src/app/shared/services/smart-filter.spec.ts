import { applySmartFilter, SmartFilter } from "./smart-filter";

let object = {
    three: 3,
    ten: 10,
    null: null,
    string: "string",
    dialect: "Vukelić"
};

describe("SmartFilter", () => {
    let true1 = ["three", "==", 3];
    let true2 = ["ten", ">", 0];
    let false1 = ["three", "!=", 3];
    let false2 = ["ten", "<", 0];

    it("should throw if too many elements", () => {
        let filter = <SmartFilter><unknown>["a", "<", 3, 4];
        expect(() => applySmartFilter(object, filter)).toThrowError();
    });

    it("should throw if too few elements", () => {
        let filter = <SmartFilter><unknown>["a", "3"];
        expect(() => applySmartFilter(object, filter)).toThrowError();
    });

    it("should throw if wrong element type", () => {
        let filter = <SmartFilter><unknown>[3, "<", 3];
        expect(() => applySmartFilter(object, filter)).toThrowError();
    });

    it("should throw if wrong element type", () => {
        let filter = <SmartFilter><unknown>[["a", "<", 3], "or", 3];
        expect(() => applySmartFilter(object, filter)).toThrowError();
    });

    it("should be false if NOT true", () => {
        let filter = <SmartFilter>["not", true1];
        expect(applySmartFilter(object, filter)).toBeFalse();
    });

    it("should be true if NOT false", () => {
        let filter = <SmartFilter>["not", false1];
        expect(applySmartFilter(object, filter)).toBeTrue();
    });

    it("should be true if true AND true", () => {
        let filter = <SmartFilter>[true1, "and", true2];
        expect(applySmartFilter(object, filter)).toBeTrue();
    });

    it("should be false if false AND true", () => {
        let filter = <SmartFilter>[false1, "and", true2];
        expect(applySmartFilter(object, filter)).toBeFalse();
    });

    it("should be false if true AND false", () => {
        let filter = <SmartFilter>[true1, "and", false2];
        expect(applySmartFilter(object, filter)).toBeFalse();
    });

    it("should be false if false OR false", () => {
        let filter = <SmartFilter>[false1, "or", false2];
        expect(applySmartFilter(object, filter)).toBeFalse();
    });

    it("should be true if true OR false", () => {
        let filter = <SmartFilter>[true1, "or", false2];
        expect(applySmartFilter(object, filter)).toBeTrue();
    });

    it("should be true if false OR true", () => {
        let filter = <SmartFilter>[false1, "or", true2];
        expect(applySmartFilter(object, filter)).toBeTrue();
    });
});

describe("FieldFilter", () => {
    it("should throw on undefined operator", () => {
        let filter = <SmartFilter><unknown>["a", ">>", 3];
        expect(() => applySmartFilter(object, filter)).toThrowError();
    });

    it("should throw on missing property", () => {
        let filter = <SmartFilter>["missing", "==", 3];
        expect(() => applySmartFilter(object, filter)).toThrowError();
    })

    describe("number and number comparison", () => {
        it("should return true on true ==", () => {
            let filter = <SmartFilter>["three", "==", 3];
            expect(applySmartFilter(object, filter)).toBeTrue();
        });
    
        it("should return false on false ==", () => {
            let filter = <SmartFilter>["three", "==", 4];
            expect(applySmartFilter(object, filter)).toBeFalse();
        });
    
        it("should return true on true >", () => {
            let filter = <SmartFilter>["three", ">", 2];
            expect(applySmartFilter(object, filter)).toBeTrue();
        });
    
        it("should return false on false >", () => {
            let filter = <SmartFilter>["three", ">", 3];
            expect(applySmartFilter(object, filter)).toBeFalse();
        });
    
        it("should return true on true <", () => {
            let filter = <SmartFilter>["three", "<", 4];
            expect(applySmartFilter(object, filter)).toBeTrue();
        });
    
        it("should return false on false <", () => {
            let filter = <SmartFilter>["three", "<", 3];
            expect(applySmartFilter(object, filter)).toBeFalse();
        });
    
        it("should return true on true >=", () => {
            let filter = <SmartFilter>["three", ">=", 3];
            expect(applySmartFilter(object, filter)).toBeTrue();
        });
    
        it("should return false on false >=", () => {
            let filter = <SmartFilter>["three", ">=", 4];
            expect(applySmartFilter(object, filter)).toBeFalse();
        });
    
        it("should return true on true <=", () => {
            let filter = <SmartFilter>["three", "<=", 3];
            expect(applySmartFilter(object, filter)).toBeTrue();
        });
    
        it("should return false on false <=", () => {
            let filter = <SmartFilter>["three", "<=", 2];
            expect(applySmartFilter(object, filter)).toBeFalse();
        });
    
        it("should return true on true !=", () => {
            let filter = <SmartFilter>["three", "!=", 4];
            expect(applySmartFilter(object, filter)).toBeTrue();
        });
    
        it("should return false on false !=", () => {
            let filter = <SmartFilter>["three", "!=", 3];
            expect(applySmartFilter(object, filter)).toBeFalse();
        });
    
        it("should throw on contains", () => {
            let filter = <SmartFilter>["ten", "contains", 1];
            expect(() => applySmartFilter(object, filter)).toThrowError();
        });
    });
    
    describe("number and string comparison", () => {
        it("should throw on ==", () => {
            let filter = <SmartFilter>["ten", "==", "10"];
            expect(() => applySmartFilter(object, filter)).toThrowError();
        });

        it("should throw on >", () => {
            let filter = <SmartFilter>["ten", ">", "10"];
            expect(() => applySmartFilter(object, filter)).toThrowError();
        });

        it("should throw on <", () => {
            let filter = <SmartFilter>["ten", "<", "10"];
            expect(() => applySmartFilter(object, filter)).toThrowError();
        });

        it("should throw on >=", () => {
            let filter = <SmartFilter>["ten", ">=", "10"];
            expect(() => applySmartFilter(object, filter)).toThrowError();
        });

        it("should throw on <=", () => {
            let filter = <SmartFilter>["ten", "<=", "10"];
            expect(() => applySmartFilter(object, filter)).toThrowError();
        });

        it("should throw on !=", () => {
            let filter = <SmartFilter>["ten", "!=", "10"];
            expect(() => applySmartFilter(object, filter)).toThrowError();
        });

        it("should throw on contains", () => {
            let filter = <SmartFilter>["ten", "contains", "10"];
            expect(() => applySmartFilter(object, filter)).toThrowError();
        });
    });

    describe("null and non-null comparison", () => {
        it("should return false on ==", () => {
            let filter = <SmartFilter>["null", "==", "10"];
            expect(applySmartFilter(object, filter)).toBeFalse();
        });

        it("should throw on >", () => {
            let filter = <SmartFilter>["null", ">", "10"];
            expect(() => applySmartFilter(object, filter)).toThrowError();
        });

        it("should throw on <", () => {
            let filter = <SmartFilter>["null", "<", "10"];
            expect(() => applySmartFilter(object, filter)).toThrowError();
        });

        it("should throw on >=", () => {
            let filter = <SmartFilter>["null", ">=", "10"];
            expect(() => applySmartFilter(object, filter)).toThrowError();
        });

        it("should throw on <=", () => {
            let filter = <SmartFilter>["null", "<=", "10"];
            expect(() => applySmartFilter(object, filter)).toThrowError();
        });

        it("should return true on !=", () => {
            let filter = <SmartFilter>["null", "!=", "10"];
            expect(applySmartFilter(object, filter)).toBeTrue();
        });

        it("should throw on contains", () => {
            let filter = <SmartFilter>["null", "contains", "10"];
            expect(() => applySmartFilter(object, filter)).toThrowError();
        });
    });

    describe("null and null comparison", () => {
        it("should return true on ==", () => {
            let filter = <SmartFilter>["null", "==", null];
            expect(applySmartFilter(object, filter)).toBeTrue();
        });

        it("should throw on >", () => {
            let filter = <SmartFilter>["null", ">", null];
            expect(() => applySmartFilter(object, filter)).toThrowError();
        });

        it("should throw on <", () => {
            let filter = <SmartFilter>["null", "<", null];
            expect(() => applySmartFilter(object, filter)).toThrowError();
        });

        it("should throw on >=", () => {
            let filter = <SmartFilter>["null", ">=", null];
            expect(() => applySmartFilter(object, filter)).toThrowError();
        });

        it("should throw on <=", () => {
            let filter = <SmartFilter>["null", "<=", null];
            expect(() => applySmartFilter(object, filter)).toThrowError();
        });

        it("should return false on !=", () => {
            let filter = <SmartFilter>["null", "!=", null];
            expect(applySmartFilter(object, filter)).toBeFalse();
        });

        it("should throw on contains", () => {
            let filter = <SmartFilter>["null", "contains", null];
            expect(() => applySmartFilter(object, filter)).toThrowError();
        });
    });

    describe("string and string comparison", () => {
        it("should return true on true ==", () => {
            let filter = <SmartFilter>["string", "==", "string"];
            expect(applySmartFilter(object, filter)).toBeTrue();
        });

        it("should return false on false ==", () => {
            let filter = <SmartFilter>["string", "==", "String"];
            expect(applySmartFilter(object, filter)).toBeFalse();
        });

        it("should return true on true >", () => {
            let filter = <SmartFilter>["string", ">", "strina"];
            expect(applySmartFilter(object, filter)).toBeTrue();
        });

        it("should return false on false >", () => {
            let filter = <SmartFilter>["string", ">", "string2"];
            expect(applySmartFilter(object, filter)).toBeFalse();
        });

        it("should return true on true <", () => {
            let filter = <SmartFilter>["string", "<", "strinz"];
            expect(applySmartFilter(object, filter)).toBeTrue();
        });

        it("should return false on false <", () => {
            let filter = <SmartFilter>["string", "<", "string"];
            expect(applySmartFilter(object, filter)).toBeFalse();
        });

        it("should return true on true <=", () => {
            let filter = <SmartFilter>["string", "<=", "string"];
            expect(applySmartFilter(object, filter)).toBeTrue();
        });

        it("should return false on false <=", () => {
            let filter = <SmartFilter>["string", "<=", "strina"];
            expect(applySmartFilter(object, filter)).toBeFalse();
        });

        it("should return true on true >=", () => {
            let filter = <SmartFilter>["string", ">=", "string"];
            expect(applySmartFilter(object, filter)).toBeTrue();
        });

        it("should return false on false >=", () => {
            let filter = <SmartFilter>["string", ">=", "stringa"];
            expect(applySmartFilter(object, filter)).toBeFalse();
        });

        it("should return true on true !=", () => {
            let filter = <SmartFilter>["string", "!=", "String"];
            expect(applySmartFilter(object, filter)).toBeTrue();
        });

        it("should return false on false !=", () => {
            let filter = <SmartFilter>["string", "!=", "string"];
            expect(applySmartFilter(object, filter)).toBeFalse();
        });

        it("should return true on true contains - same case - full", () => {
            let filter = <SmartFilter>["string", "contains", "string"];
            expect(applySmartFilter(object, filter)).toBeTrue();
        });

        it("should return true on true contains - wrong case - full", () => {
            let filter = <SmartFilter>["string", "contains", "String"];
            expect(applySmartFilter(object, filter)).toBeTrue();
        });

        it("should return true on true contains - same case - start", () => {
            let filter = <SmartFilter>["string", "contains", "str"];
            expect(applySmartFilter(object, filter)).toBeTrue();
        });

        it("should return true on true contains - wrong case - start", () => {
            let filter = <SmartFilter>["string", "contains", "Str"];
            expect(applySmartFilter(object, filter)).toBeTrue();
        });

        it("should return true on true contains - same case - end", () => {
            let filter = <SmartFilter>["string", "contains", "ing"];
            expect(applySmartFilter(object, filter)).toBeTrue();
        });

        it("should return true on true contains - wrong case - end", () => {
            let filter = <SmartFilter>["string", "contains", "Ing"];
            expect(applySmartFilter(object, filter)).toBeTrue();
        });
        
        it("should return true on true contains - same case - mid", () => {
            let filter = <SmartFilter>["string", "contains", "rin"];
            expect(applySmartFilter(object, filter)).toBeTrue();
        });

        it("should return true on true contains - wrong case - mid", () => {
            let filter = <SmartFilter>["string", "contains", "RIn"];
            expect(applySmartFilter(object, filter)).toBeTrue();
        });

        it("should return true on true contains - empty", () => {
            let filter = <SmartFilter>["string", "contains", ""];
            expect(applySmartFilter(object, filter)).toBeTrue();
        });

        it("should return true on true contains - same case - start", () => {
            let filter = <SmartFilter>["string", "contains", "str"];
            expect(applySmartFilter(object, filter)).toBeTrue();
        });

        it("should return true on true contains - same case - dialect", () => {
            let filter = <SmartFilter>["dialect", "contains", "Vukelić"];
            expect(applySmartFilter(object, filter)).toBeTrue();
        });

        it("should return true on true contains - wrong case - dialect", () => {
            let filter = <SmartFilter>["dialect", "contains", "vukeliĆ"];
            expect(applySmartFilter(object, filter)).toBeTrue();
        });
    });
});
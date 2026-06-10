import { CustomReuseStrategy } from "./route-reuse-strategy";

describe("CustomReuseStrategy.clear()", () => {
    it("destroys every stored handle and empties the handlers map", () => {
        const strategy = new CustomReuseStrategy();

        let destroyedA = 0, destroyedB = 0;
        strategy.handlers = {
            clients: { "": { componentRef: { destroy: () => destroyedA++ } } as any },
            services: { "": { componentRef: { destroy: () => destroyedB++ } } as any },
        };

        strategy.clear();

        expect(destroyedA).toBe(1);
        expect(destroyedB).toBe(1);
        expect(Object.keys(strategy.handlers).length).toBe(0);
    });
});

import { CacheCoordinator } from "./cache-coordinator";
import { appointmentKeys, clientKeys } from "./keys";

describe("CacheCoordinator", () => {
    it("invalidate() is a no-op that accepts any number of keys without throwing", () => {
        const cache = new CacheCoordinator();

        expect(() => cache.invalidate()).not.toThrow();
        expect(() => cache.invalidate(appointmentKeys.all)).not.toThrow();
        expect(() => cache.invalidate(clientKeys.all, appointmentKeys.all)).not.toThrow();
    });
});

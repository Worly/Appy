import { RouteReuseStrategy, ActivatedRouteSnapshot, DetachedRouteHandle } from '@angular/router';

export class CustomReuseStrategy implements RouteReuseStrategy {
    handlers: { [detachGroup: string]: { [key: string]: DetachedRouteHandle } } = {};

    shouldDetach(route: ActivatedRouteSnapshot): boolean {
        var shouldDetach = !!(route?.data as any)?.shouldDetach;
        var detachGroup = (route?.data as any)?.detachGroup;

        if (shouldDetach && detachGroup == null) {
            console.error("Missing detach group on detachable route!");
            return false;
        }

        for (let gr in this.handlers) {
            if (gr == detachGroup)
                continue;

            for (let key in this.handlers[gr])
                (this.handlers[gr][key] as any).componentRef.destroy();

            this.handlers[gr] = {};
        }

        return shouldDetach;
    }

    store(route: ActivatedRouteSnapshot, handle: DetachedRouteHandle): void {
        var detachGroup = (route?.data as any)?.detachGroup;
        if (detachGroup == null)
            console.error("Missing detach group on detachable route!");

        if (this.handlers[detachGroup] == null)
            this.handlers[detachGroup] = {};

        this.handlers[detachGroup][route.routeConfig?.path as string] = handle;
    }

    shouldAttach(route: ActivatedRouteSnapshot): boolean {
        var path = route?.routeConfig?.path as string;
        var detachGroup = (route?.data as any)?.detachGroup;

        if (detachGroup == null)
            return false;

        var group = this.handlers[detachGroup];
        if (group == null)
            return false;

        return group[path] != null;
    }

    retrieve(route: ActivatedRouteSnapshot): DetachedRouteHandle | null {
        var path = route?.routeConfig?.path as string;
        var detachGroup = (route?.data as any)?.detachGroup;

        return this.handlers[detachGroup][path];
    }

    shouldReuseRoute(future: ActivatedRouteSnapshot, curr: ActivatedRouteSnapshot): boolean {
        return future.routeConfig === curr.routeConfig;
    }

}
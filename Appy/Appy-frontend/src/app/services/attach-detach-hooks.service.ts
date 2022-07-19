import { Component, ComponentRef, Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, DetachedRouteHandle, Event, NavigationEnd, Router, RouteReuseStrategy } from '@angular/router';

export interface BeforeAttach {
    ngBeforeAttach(): void;
}
export interface AfterAttach {
    ngAfterAttach(): void;
}
export interface BeforeDetach {
    ngBeforeDetach(): void;
}

interface DetachedRouteHandleExt extends DetachedRouteHandle {
    componentRef: ComponentRef<Component>;
}

/**
 * Intercepts calls to the RouteReuseStrategy
 * and will trigger 'ngBeforeAttach' and 'ngAfterAttach' custom hooks
 */
@Injectable()
export class AttachDetachHooksService {

    private pseudoSuper: {
        retrieve: (route: ActivatedRouteSnapshot) => DetachedRouteHandle | null,
        shouldAttach: (route: ActivatedRouteSnapshot) => boolean,
        store: (route: ActivatedRouteSnapshot, handle: DetachedRouteHandle | null) => void
    };

    private currentHandle?: DetachedRouteHandleExt;
    private pendingBeforeAttach?: boolean;

    constructor(router: Router, reuseStrategy: RouteReuseStrategy) {

        // Init intercepts
        this.pseudoSuper = {
            shouldAttach: reuseStrategy.shouldAttach.bind(reuseStrategy),
            retrieve: reuseStrategy.retrieve.bind(reuseStrategy),
            store: reuseStrategy.store.bind(reuseStrategy),
        };

        reuseStrategy.retrieve = this.retrieve.bind(this);
        reuseStrategy.shouldAttach = this.shouldAttach.bind(this);
        reuseStrategy.store = this.store.bind(this);


        // Router events
        router.events.subscribe((event: any) => this.triggerHooksFromRouterEvents(event));
    }

    private triggerHooksFromRouterEvents(event: Event) {

        if (event instanceof NavigationEnd && this.currentHandle) {
            this.callHook(this.currentHandle, 'ngAfterAttach');
        }
    }

    private retrieve(route: ActivatedRouteSnapshot): DetachedRouteHandleExt {
        this.currentHandle = this.pseudoSuper.retrieve(route) as DetachedRouteHandleExt;

        if (this.pendingBeforeAttach) {
            this.callHook(this.currentHandle, 'ngBeforeAttach');
            this.pendingBeforeAttach = false;
        }

        return this.currentHandle;
    }

    private shouldAttach(route: ActivatedRouteSnapshot): boolean {
        this.pendingBeforeAttach = this.pseudoSuper.shouldAttach(route);
        return this.pendingBeforeAttach;
    }

    private store(route: ActivatedRouteSnapshot, handle: DetachedRouteHandle | null): void {
        this.callHook(handle as DetachedRouteHandleExt, 'ngBeforeDetach');

        this.pseudoSuper.store(route, handle);
    }

    private callHook(detachedTree: DetachedRouteHandleExt, hookName: string): void {
        if (detachedTree && detachedTree.componentRef) {
            const componentRef = detachedTree.componentRef;
            if (
                componentRef.instance &&
                typeof (componentRef.instance as any)[hookName] === 'function'
            ) {
                try {
                    (componentRef.instance as any)[hookName]();
                } catch (error) {
                    console.error(error);
                }
            }
        }
    }
}
import { Directive, ElementRef, OnDestroy } from "@angular/core";

@Directive({ selector: '[stuckAttr]' })
export class StuckAttrDirective implements OnDestroy {
    private observer?: IntersectionObserver;

    constructor(private elementRef: ElementRef<HTMLElement>) {
    }

    ngAfterContentInit() {
        let computedStyles = getComputedStyle(this.elementRef.nativeElement);

        if (computedStyles.position != "sticky")
            return;

        var top = parseInt(computedStyles.top, 10);
        if (isNaN(top))
            return;
            
        var rootMarginTop = (-top - 1) + "px";
        
        this.observer = new IntersectionObserver(
            ([e]) => e.target.toggleAttribute('stuck', e.intersectionRatio < 1),
            {
                threshold: [1],
                rootMargin: `${rootMarginTop} 0px 0px 0px`,
            }
        );

        this.observer.observe(this.elementRef.nativeElement);
    }

    ngOnDestroy(): void {
        this.observer?.unobserve(this.elementRef.nativeElement);
    }
}
import { Directive, ElementRef, EventEmitter, Output } from "@angular/core";

@Directive({ selector: '[flex-splitter]' })
export class FlexSplitterDirective {
    constructor(private elementRef: ElementRef<HTMLElement>) {
    }

    ngAfterContentInit() {
        this.elementRef.nativeElement.style.marginLeft = "auto";
    }
}
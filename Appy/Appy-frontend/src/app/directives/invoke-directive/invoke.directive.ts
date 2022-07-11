import { Directive, ElementRef, EventEmitter, Output } from "@angular/core";

@Directive({ selector: '[invoke]' })
export class InvokeDirective {
    @Output() invoke: EventEmitter<ElementRef> = new EventEmitter();

    constructor(private elementRef: ElementRef) { 
    }

    ngAfterContentInit() {
        this.invoke.emit(this.elementRef);
    }
}
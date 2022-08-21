import { Directive, ElementRef } from '@angular/core';

@Directive({
  selector: '[appElementRef]',
  exportAs: "elementRef"
})
export class ElementRefDirective {

  constructor(public elementRef: ElementRef) { }

}

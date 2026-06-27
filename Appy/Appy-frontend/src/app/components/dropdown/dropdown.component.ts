import { Component, EventEmitter, HostBinding, Input, OnInit, Output } from '@angular/core';

@Component({
  selector: 'app-dropdown',
  templateUrl: './dropdown.component.html',
  styleUrls: ['./dropdown.component.css']
})
export class DropdownComponent implements OnInit {

  private _value: any;
  @Input()
  set value(value: any) {
    this._value = value;
  }
  get value(): any {
    return this._value;
  }
  @Output()
  valueChange = new EventEmitter<any>();

  @Input()
  items?: any[];

  @Input()
  displayProperty?: string;

  @Input()
  displayFunction?: (obj: any) => string;

  @Input() hasIcon: boolean = true;
  @Input() selectString: string = "SELECT";
  // When true, the options panel is at least as wide as the trigger (useful for full-width dropdowns
  // so the popup lines up with the input instead of hanging off one edge).
  @Input() matchTriggerWidth: boolean = false;
  // Renders the trigger as a full-width, select-style control: it fills its container and (when it
  // has a caret) pushes the label left and the caret to the far right.
  @Input() @HostBinding("class.full-width") fullWidth: boolean = false;

  constructor() { }

  ngOnInit(): void {

  }

  select(item: any) {
    if (this._value != item) {
      this._value = item;
      this.valueChange.emit(this._value);
    }
  }

  display(item: any) {
    if (this.displayFunction != null)
      return this.displayFunction(item);
    else if (this.displayProperty != null)
      return item[this.displayProperty];
    else
      return item;
  }
}

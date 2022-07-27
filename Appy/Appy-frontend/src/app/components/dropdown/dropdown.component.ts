import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

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

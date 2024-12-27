import { Component, EventEmitter, Input, Output } from "@angular/core";

@Component({
  selector: 'app-toggle-switch',
  templateUrl: './toggle-switch.component.html',
  styleUrls: ['./toggle-switch.component.scss']
})
export class ToggleSwitchComponent {
    public _value: boolean = false;
    @Input() set value(value: boolean) {
        this._value = value;
    }
    get value(): boolean {
        return this._value;
    }

    @Output() valueChange: EventEmitter<boolean> = new EventEmitter();

    public toggle() {
        this.value = !this.value;
        this.valueChange.emit(this.value);
    }
}
import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { ContextMenuComponent } from 'src/app/components/context-menu/context-menu.component';
import { AppointmentStatus, AppointmentStatusInfo, AppointmentStatusMap } from 'src/app/models/appointment';

@Component({
  selector: 'app-appointment-status-lookup',
  templateUrl: './appointment-status-lookup.component.html',
  styleUrls: ['./appointment-status-lookup.component.scss']
})
export class AppointmentStatusLookupComponent {
  @ViewChild(ContextMenuComponent) contextMenu?: ContextMenuComponent;

  @Input() isMultiSelect: boolean = false;

  private _value?: AppointmentStatus;
  @Input() set value(v: AppointmentStatus | undefined) {
    if (this._value == v)
      return;

    this._value = v;

    if (this._value != undefined) {
      this._values = [this._value];
    }
    else {
      this._values = [];
    }
  }
  get value(): AppointmentStatus | undefined {
    return this._value;
  }
  @Output() valueChange: EventEmitter<AppointmentStatus> = new EventEmitter();

  private _values: AppointmentStatus[] = [];
  @Input() set values(v: AppointmentStatus[]) {
    this._values = [...v];
  }
  get values(): AppointmentStatus[] {
    return [...this._values];
  }
  @Output() valuesChange: EventEmitter<AppointmentStatus[]> = new EventEmitter();

  @Input() showClearButton: boolean = false;
  @Input() disabled: boolean = false;
  @Input() isLoading: boolean = false;

  public statuses: AppointmentStatusInfo[];
  public statusesMap: { [key: string]: AppointmentStatusInfo } = AppointmentStatusMap;

  constructor() {
    this.statuses = Object.values(AppointmentStatusMap);
  }

  selectStatus(value: AppointmentStatus) {
    if (this.isMultiSelect) {
      if (this.values.includes(value)) {
        this._values.splice(this.values.indexOf(value), 1);
      }
      else {
        this._values.push(value);
      }

      this.valuesChange.emit(this.values);
    }
    else {
      if (this.value != value) {
        this.value = value;
        this.valueChange.emit(value);
      }
    }
  }

  openContextMenu() {
    this.contextMenu?.toggle();
    setTimeout(() => this.contextMenu?.container?.nativeElement.scrollTo({ top: 0 }));
  }

  clear() {
    if (this.value != undefined) {
      this.value = undefined;
      this.valueChange.emit(this.value);
    }

    if (this.values.length > 0) {
      this._values = [];
      this.valuesChange.emit(this.values);
    }
  }
}


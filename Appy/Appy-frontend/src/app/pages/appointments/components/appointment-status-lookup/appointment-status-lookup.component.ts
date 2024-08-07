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
  
  private _value?: AppointmentStatus;
  @Input() set value(v: AppointmentStatus | undefined) {
    if (this._value == v)
      return;

    this._value = v;
  }
  get value(): AppointmentStatus | undefined {
    return this._value;
  }

  @Input() showClearButton: boolean = false;

  @Output() valueChange: EventEmitter<AppointmentStatus> = new EventEmitter();

  public statuses: AppointmentStatusInfo[];

  constructor() {
    this.statuses = Object.values(AppointmentStatusMap);
  }

  selectStatus(value: AppointmentStatus) {
    this.value = value;
    this.valueChange.emit(value);
  }

  openContextMenu() {
    this.contextMenu?.toggle();
    setTimeout(() => this.contextMenu?.container?.nativeElement.scrollTo({ top: 0 }));
  }

  clear() {
    this.value = undefined;
  }
}

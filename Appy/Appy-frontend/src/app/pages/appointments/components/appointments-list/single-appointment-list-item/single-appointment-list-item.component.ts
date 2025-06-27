import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Duration } from 'dayjs/plugin/duration';
import { AppointmentView, AppointmentStatus } from 'src/app/models/appointment';
import { ClientDTO } from 'src/app/models/client';
import { ServiceColorsService } from 'src/app/pages/services/services/service-colors.service';

type RenderedAppointment = {
  id: number;
  time: string;
  service: string;
  serviceColor: string;
  status: AppointmentStatus;
  hasNotes: boolean;
  previousNoShow: boolean;
  isFirstAppointment: boolean;
  client: string;
  dateISO: string;
  dateFormatted: string;
}

@Component({
  selector: 'app-single-appointment-list-item',
  templateUrl: './single-appointment-list-item.component.html',
  styleUrls: ['./single-appointment-list-item.component.scss']
})
export class SingleAppointmentListItemComponent {
  @Input()
  set appointment(value: AppointmentView) {
    this.render(value);
  }

  @Input()
  showDate: boolean = false;

  @Output()
  onOpenView: EventEmitter<void> = new EventEmitter();

  renderedAppointment?: RenderedAppointment;

  constructor(private serviceColorsService: ServiceColorsService) {}

  private render(ap: AppointmentView) {
    this.renderedAppointment = {
      id: ap.id,
      time: `${ap.time?.format("HH:mm")} - ${ap.time?.add(ap.duration as Duration).format("HH:mm")}`,
      service: ap.service?.displayName as string,
      serviceColor: this.serviceColorsService.get(ap.service?.colorId),
      status: ap.status!,
      hasNotes: ap.notes != null && ap.notes != "",
      previousNoShow: ap.previousAppointment != null && ap.previousAppointment.status === "NoShow",
      isFirstAppointment: ap.previousAppointment == null,
      client: ClientDTO.getFullname(ap.client!) as string,
      dateISO: ap.date?.format("YYYY-MM-DD") ?? "",
      dateFormatted: ap.date?.format("DD.MM.YYYY") ?? "",
    }
  }
}

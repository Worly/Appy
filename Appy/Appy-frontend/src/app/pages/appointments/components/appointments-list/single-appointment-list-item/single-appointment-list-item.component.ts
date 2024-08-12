import { Component, Input } from '@angular/core';
import { Duration } from 'dayjs/plugin/duration';
import { Appointment } from 'src/app/models/appointment';
import { ClientDTO } from 'src/app/models/client';
import { ServiceColorsService } from 'src/app/pages/services/services/service-colors.service';

type RenderedAppointment = {
  id: number;
  time: string;
  service: string;
  serviceColor: string;
  isUnconfirmed: boolean;
  hasNotes: boolean;
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
  set appointment(value: Appointment) {
    this.render(value);
  }

  @Input()
  showDate: boolean = false;

  renderedAppointment?: RenderedAppointment;

  constructor(private serviceColorsService: ServiceColorsService) {}

  private render(ap: Appointment) {
    this.renderedAppointment = {
      id: ap.id,
      time: `${ap.time?.format("HH:mm")} - ${ap.time?.add(ap.duration as Duration).format("HH:mm")}`,
      service: ap.service?.displayName as string,
      serviceColor: this.serviceColorsService.get(ap.service?.colorId),
      isUnconfirmed: ap.status == "Unconfirmed",
      hasNotes: ap.notes != null && ap.notes != "",
      client: ClientDTO.getFullname(ap.client!) as string,
      dateISO: ap.date?.format("YYYY-MM-DD") ?? "",
      dateFormatted: ap.date?.format("DD.MM.YYYY") ?? "",
    }
  }
}

import { Component, Input } from '@angular/core';
import { AppointmentStatus } from 'src/app/models/appointment';

@Component({
  selector: 'app-appointment-status-icons',
  templateUrl: './appointment-status-icons.component.html',
  styleUrls: ['./appointment-status-icons.component.scss']
})
export class AppointmentStatusIconsComponent {
  @Input() hasNotes: boolean = false;
  @Input() status: AppointmentStatus = "Confirmed";
  @Input() previousNoShow: boolean = false;
  @Input() isFirstAppointment: boolean = false;

  @Input() increaseContrast: boolean = false;
}

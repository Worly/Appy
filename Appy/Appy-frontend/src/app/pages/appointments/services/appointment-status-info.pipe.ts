import { Pipe, PipeTransform } from "@angular/core";
import { AppointmentStatus, AppointmentStatusInfo, AppointmentStatusMap } from "src/app/models/appointment";

@Pipe({ name: "appointmentStatusInfo" })
export class AppointmentStatusInfoPipe implements PipeTransform {
  transform(value: AppointmentStatus | null | undefined): AppointmentStatusInfo | null {
    if (value == null)
      return null;

    return AppointmentStatusMap[value];
  }
}
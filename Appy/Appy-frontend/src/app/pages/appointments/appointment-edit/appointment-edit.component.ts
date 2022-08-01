import { Location } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Data, ParamMap } from '@angular/router';
import * as moment from 'moment';
import { combineLatest, debounceTime, Observable, Subscription } from 'rxjs';
import { NotifyDialogService } from 'src/app/components/notify-dialog/notify-dialog.service';
import { Appointment } from 'src/app/models/appointment';
import { ServiceDTO } from 'src/app/models/service';
import { AppointmentService } from 'src/app/services/appointment.service.ts';
import { TranslateService } from 'src/app/services/translate/translate.service';
import { DateTimeChooserResult } from './date-time-chooser/date-time-chooser.component';

@Component({
  selector: 'app-appointment-edit',
  templateUrl: './appointment-edit.component.html',
  styleUrls: ['./appointment-edit.component.scss']
})
export class AppointmentEditComponent implements OnInit, OnDestroy {

  public isNew: boolean = false;
  public appointment?: Appointment = undefined;

  public isLoadingSave: boolean = false;
  public isLoadingDelete: boolean = false;
  public get isLoading(): boolean {
    return this.isLoadingSave || this.isLoadingDelete;
  }

  public isDateTimeEditing: boolean = false;

  private subs: Subscription[] = [];

  constructor(
    private location: Location,
    private activatedRoute: ActivatedRoute,
    private appointmentService: AppointmentService,
    private notifyDialogService: NotifyDialogService,
    private translateService: TranslateService
  ) { }

  ngOnInit(): void {
    this.subs.push(combineLatest([this.activatedRoute.data, this.activatedRoute.paramMap])
      .pipe(debounceTime(0)).subscribe(([data, paramMap]: [Data, ParamMap]) => {
        this.isNew = data["isNew"] ?? false;

        if (this.isNew)
          this.appointment = new Appointment();
        else {
          var idParam = paramMap.get("id");
          if (idParam)
            this.load(Number.parseInt(idParam));
        }
      }));
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  private load(id: number) {
    this.subs.push(this.appointmentService.get(id).subscribe((a: Appointment) => {
      this.appointment = a;
    }));
  }

  public cancel() {
    this.goBack();
  }

  public save() {
    if (!this.appointment?.validate())
      return;

    this.isLoadingSave = true;

    let action: Observable<Appointment>;

    if (this.isNew)
      action = this.appointmentService.addNew(this.appointment as Appointment);
    else
      action = this.appointmentService.save(this.appointment as Appointment);

    this.subs.push(action.subscribe({
      next: () => this.goBack(),
      error: (e: any) => this.isLoadingSave = false
    }));
  }

  public deleteAppointment() {
    this.subs.push(this.notifyDialogService.yesNoDialog(this.translateService.translate("pages.appointments.DELETE_PROMPT")).subscribe((ok: boolean) => {
      if (!ok)
        return;

      this.isLoadingDelete = true;
      this.subs.push(this.appointmentService.delete(this.appointment?.id as number).subscribe({
        next: () => this.goBack(),
        error: (e: any) => this.isLoadingDelete = false
      }));
    }));
  }

  public goBack() {
    this.location.back();
  }

  public selectedService(e: { oldService?: ServiceDTO, newService: ServiceDTO }) {
    if (this.appointment == null)
      return;

    if (this.appointment?.duration == null) {
      this.appointment.duration = moment.duration(e.newService.duration);
      return;
    }

    if (e.oldService != null && this.appointment.duration.asMilliseconds() == moment.duration(e.oldService.duration).asMilliseconds()) {
      this.appointment.duration = moment.duration(e.newService.duration);
      return;
    }
  }

  public formatDateTime(): string {
    var result = this.translateService.translate("pages.appointments.CHOOSE_DATE_TIME");
    if (this.appointment?.date != null) {
      result = this.appointment.date.format("dddd - DD.MM.YYYY");
      if (this.appointment?.time != null)
        result += " - " + this.appointment.time.format("HH:mm");
    }

    return result;
  }


  public editDateTime() {
    if (this.appointment?.service == null) {
      this.appointment?.validateProperty("service");
      return;
    }

    if (this.appointment?.duration == null) {
      this.appointment.validateProperty("duration");
      return;
    }

    this.isDateTimeEditing = true;

    var ignoreAppointmentId = undefined;
    if (!this.isNew)
      ignoreAppointmentId = this.appointment.id;
  }

  onDateTimeChooserFinished(result: DateTimeChooserResult) {
    if (result.ok && this.appointment != null) {
      this.appointment.date = result.date?.clone();
      this.appointment.time = result.time?.clone();
    }

    this.isDateTimeEditing = false;
  }
}

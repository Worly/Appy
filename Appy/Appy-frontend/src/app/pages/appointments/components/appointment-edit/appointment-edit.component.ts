import { Location } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Data, ParamMap, Router } from '@angular/router';
import { combineLatest, debounceTime, Observable, Subscription } from 'rxjs';
import { NotifyDialogService } from 'src/app/components/notify-dialog/notify-dialog.service';
import { Appointment, AppointmentStatus, AppointmentView } from 'src/app/models/appointment';
import { ServiceDTO } from 'src/app/models/service';
import { DateTimeChooserResult } from './date-time-chooser/date-time-chooser.component';
import { setUrlParams } from 'src/app/utils/dynamic-url-params';
import { parseDuration } from 'src/app/utils/time-utils';
import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { AppointmentService } from '../../services/appointment.service';
import { TranslateService } from 'src/app/components/translate/translate.service';
import { ClientDTO } from 'src/app/models/client';
import { ToastService } from 'src/app/components/toast/toast.service';
import { IconName } from '@fortawesome/fontawesome-svg-core';
import dayjs from 'dayjs';

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
    private router: Router,
    private location: Location,
    private activatedRoute: ActivatedRoute,
    private appointmentService: AppointmentService,
    private notifyDialogService: NotifyDialogService,
    private toastService: ToastService,
    private translateService: TranslateService
  ) { }

  ngOnInit(): void {
    this.subs.push(combineLatest([this.activatedRoute.data, this.activatedRoute.paramMap, this.activatedRoute.queryParamMap])
      .pipe(debounceTime(0)).subscribe(([data, paramMap, queryParamMap]: [Data, ParamMap, ParamMap]) => {
        this.isNew = data["isNew"] ?? false;

        if (this.isNew) {
          let appointment = new Appointment();
          this.applyUrlParams(appointment, queryParamMap);

          this.appointment = appointment;
          this.registerPropertyChanged();
        }
        else {
          var idParam = paramMap.get("id");
          if (idParam)
            this.load(Number.parseInt(idParam), queryParamMap);
        }
      }));
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  private load(id: number, queryParamMap: ParamMap) {
    this.subs.push(this.appointmentService.get(id).subscribe((a: Appointment) => {
      this.applyUrlParams(a, queryParamMap);

      this.appointment = a;
      this.registerPropertyChanged();
    }));
  }

  // The URL holds the edits made before navigating away, so they take precedence over the
  // saved appointment. Applied before registerPropertyChanged so restoring doesn't rewrite the URL.
  private applyUrlParams(appointment: Appointment, queryParamMap: ParamMap) {
    let date = queryParamMap.get("date");
    if (date != null)
      appointment.date = dayjs(date);

    let time = queryParamMap.get("time");
    if (time != null)
      appointment.time = dayjs(time, "HH:mm:ss");

    let serviceJSON = queryParamMap.get("service");
    if (serviceJSON != null)
      appointment.service = JSON.parse(serviceJSON) as ServiceDTO;

    let clientJSON = queryParamMap.get("client");
    if (clientJSON != null)
      appointment.client = JSON.parse(clientJSON) as ClientDTO;

    let notes = queryParamMap.get("notes");
    if (notes != null)
      appointment.notes = notes;

    let duration = queryParamMap.get("duration");
    if (duration != null)
      appointment.duration = parseDuration(duration);
    else if (appointment.duration == null && appointment.service?.duration != null)
      appointment.duration = parseDuration(appointment.service.duration);
  }

  public cancel() {
    this.goBack();
  }

  public save(ignoreTimeNotAvailable: boolean) {
    if (!this.appointment?.validate())
      return;

    this.isLoadingSave = true;

    let action: Observable<{ model: AppointmentView, headers: HttpHeaders }>;

    if (this.isNew)
      action = this.appointmentService.addNewWithHeaders(this.appointment as Appointment, { ignoreTimeNotAvailable });
    else
      action = this.appointmentService.saveWithHeaders(this.appointment as Appointment, { ignoreTimeNotAvailable });

    this.subs.push(action.subscribe({
      next: (r: { model: AppointmentView, headers: HttpHeaders }) => {
        this.notifySaved(r.model.id, r.model.status as AppointmentStatus, r.headers.get("X-Can-Notify-Client") == "true");
        this.router.navigate(['/appointments'], { queryParams: { date: r.model.date.format('YYYY-MM-DD') } });
      },
      error: (e: HttpErrorResponse) => {
        this.isLoadingSave = false;
        if (e.error?.errors?.time == "pages.appointments.errors.TIME_NOT_AVAILABLE") {
          this.notifyDialogService.yesNoDialog(this.translateService.translate("pages.appointments.TIME_NOT_AVAILABLE_PROMPT"))
            .subscribe((ok: boolean) => {
              if (ok)
                this.save(true);
            })
        }
      }
    }));
  }

  private notifySaved(appointmentId: number, status: AppointmentStatus, canNotifyClient: boolean) {
    let actions = [];

    if (status == "Unconfirmed") {
      actions.push({
        text: this.translateService.translate("CONFIRM"),
        icon: "check" as IconName,
        onClick: (closeToast: () => void) => {
          this.appointmentService.setStatus(appointmentId, "Confirmed").subscribe({
            next: () => closeToast(),
            error: (e: any) => closeToast()
          })
        }
      });
    }
    else if (status == "Confirmed" && canNotifyClient) {
      actions.push(this.appointmentService.getNotifyClientAction(appointmentId));
    }

    this.toastService.show({
      text: this.translateService.translate("pages.appointments.APPOINTMENT_SAVED"),
      icon: "check",
      iconColor: "success",
      actions: actions
    })
  }

  public deleteAppointment() {
    this.subs.push(this.notifyDialogService.yesNoDialog(this.translateService.translate("pages.appointments.DELETE_PROMPT"))
      .subscribe((ok: boolean) => {
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

  private registerPropertyChanged() {
    if (this.appointment == null)
      return;

    this.subs.push(this.appointment.getOnPropertyChanged().subscribe(() => {
      let date = this.appointment?.date ? this.appointment.date.format("YYYY-MM-DD") : null;
      let time = this.appointment?.time ? this.appointment.time.format("HH:mm:ss") : null;
      let duration = this.appointment?.duration ? this.appointment.duration.format("HH:mm:ss") : null;
      let service = this.appointment?.service ? JSON.stringify(this.appointment.service) : null;
      let client = this.appointment?.client ? JSON.stringify(this.appointment.client) : null;
      let notes = this.appointment?.notes ?? null;

      setUrlParams(this.router, this.activatedRoute, this.location, {
        date, time, duration, service, client, notes
      });
    }));
  }

  public selectedService(e: { oldService?: ServiceDTO, newService: ServiceDTO }) {
    if (this.appointment == null)
      return;

    if (this.appointment?.duration == null) {
      this.appointment.duration = parseDuration(e.newService.duration as string);
      return;
    }

    if (e.oldService != null && this.appointment.duration.asMilliseconds() == parseDuration(e.oldService.duration as string).asMilliseconds()) {
      this.appointment.duration = parseDuration(e.newService.duration as string);
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
      this.appointment.date = result.date;
      this.appointment.time = result.time;
    }

    this.isDateTimeEditing = false;
  }
}

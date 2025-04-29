import { HttpErrorResponse } from "@angular/common/http";
import { Injectable, Injector } from "@angular/core";
import { Dayjs } from "dayjs";
import { Duration } from "dayjs/plugin/duration";
import { catchError, map, Observable, tap, throwError } from "rxjs";
import { appConfig } from "src/app/app.config";
import { ToastAction, ToastService } from "src/app/components/toast/toast.service";
import { TranslateService } from "src/app/components/translate/translate.service";
import { Appointment, AppointmentDTO, AppointmentStatus } from "src/app/models/appointment";
import { FreeTime, FreeTimeDTO } from "src/app/models/free-time";
import { BaseModelService, PageableListDatasource } from "src/app/shared/services/base-model-service";
import { SmartFilter } from "src/app/shared/services/smart-filter";

@Injectable({ providedIn: "root" })
export class AppointmentService extends BaseModelService<Appointment> {
    constructor(
        injector: Injector,
        private translateService: TranslateService,
        private toastService: ToastService
    ) {
        super(injector, Appointment.ENTITY_TYPE, Appointment);
    }

    public override getAll(date?: Dayjs): Observable<Appointment[]> {
        if (date == null)
            throw "Date cannot be null";

        return this.getAllAdvanced({
            date: date.format("YYYY-MM-DD")
        }, e => e.date?.isSame(date, "date") == true);
    }

    public getList(date: Dayjs, filter: SmartFilter | undefined, sortPredicate: (a: Appointment, b: Appointment) => number): PageableListDatasource<Appointment> {
        return this.getListAdvanced({
            date: date.format("YYYY-MM-DD")
        }, sortPredicate, filter);
    }

    public getFreeTimes(date: Dayjs, serviceId: number, duration: Duration, ignoreAppointmentId?: number): Observable<FreeTime[]> {
        let params: any = {
            date: date.format("YYYY-MM-DD"),
            serviceId: serviceId,
            duration: duration.format("HH:mm:ss")
        }

        if (ignoreAppointmentId != null)
            params.ignoreAppointmentId = ignoreAppointmentId;

        return this.httpClient.get<FreeTimeDTO[]>(`${appConfig.apiUrl}${this.controllerName}/getFreeTimes`, {
            params: params
        }).pipe(
            map(t => t.map(o => new FreeTime(o)))
        );
    }

    public setStatus(appointmentId: number, status: AppointmentStatus): Observable<Appointment> {
        return this.httpClient.put<AppointmentDTO>(`${appConfig.apiUrl}${this.controllerName}/setStatus/${appointmentId}`,
            null, {
            observe: "response",
            params: { status }
        }).pipe(
            map(r => {
                let appointment = new Appointment(r.body!);

                this.entityChangeNotifyService.notifyUpdated(appointment);

                if (status == "Confirmed") {
                    let actions = [];

                    if (r.headers.get("X-Can-Notify-Client") == "true")
                        actions.push(this.getNotifyClientAction(appointmentId));

                    this.toastService.show({
                        text: this.translateService.translate("pages.appointments.APPOINTMENT_CONFIRMED"),
                        icon: "check",
                        iconColor: "success",
                        actions: actions
                    });
                }
                else if (status == "Unconfirmed") {
                    this.toastService.show({
                        text: this.translateService.translate("pages.appointments.APPOINTMENT_UNCONFIRMED"),
                        icon: "question",
                        iconColor: "warning",
                    });
                }
                else if (status == "NoShow") {
                    this.toastService.show({
                        text: this.translateService.translate("pages.appointments.APPOINTMENT_NOSHOWED"),
                        icon: "user-slash",
                        iconColor: "danger",
                    })
                }

                return appointment;
            }));
    }

    public notifyClient(appointmentId: number): Observable<void> {
        return this.httpClient.post<void>(`${appConfig.apiUrl}${this.controllerName}/notifyClient/${appointmentId}`, null, {
            params: {
                languageCode: this.translateService.getSelectedLanguageCode()
            }
        }).pipe(
            tap({
                next: () => this.toastService.show({
                    text: this.translateService.translate("pages.client-notifications.MESSAGE_SUCCESSFULLY_SENT"),
                    icon: "check",
                    iconColor: "success"
                })
            }),
            catchError((e: HttpErrorResponse) => {
                this.toastService.show({
                    text: this.translateService.translate(e.error.error),
                    icon: "triangle-exclamation",
                    iconColor: "danger"
                });

                return throwError(() => e);
            }));
    }

    public getNotifyClientAction(appointmentId: number): ToastAction {
        return {
            text: this.translateService.translate("pages.appointments.NOTIFY_CLIENT"),
            icon: "envelope",
            onClick: (closeToast: () => void) => {
                this.notifyClient(appointmentId).subscribe({
                    next: () => closeToast(),
                    error: (e: any) => closeToast()
                });
            }
        }
    }
}
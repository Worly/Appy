import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { NotifyDialogService } from 'src/app/components/notify-dialog/notify-dialog.service';
import { TranslateService } from 'src/app/components/translate/translate.service';
import { AppointmentStatus, AppointmentView } from 'src/app/models/appointment';
import { AppointmentService } from '../../services/appointment.service';
import { getClientContactTypeIcon, openClientContactApp } from 'src/app/pages/clients/clients.module';
import { IconName } from '@fortawesome/fontawesome-svg-core';
import { ClientContactDTO, ClientContactType } from 'src/app/models/client';
import { ServiceColorsService } from 'src/app/pages/services/services/service-colors.service';

@Component({
  selector: 'app-single-appointment',
  templateUrl: './single-appointment.component.html',
  styleUrls: ['./single-appointment.component.scss']
})
export class SingleAppointmentComponent implements OnInit, OnDestroy {
  private _id?: number;
  @Input() set id(value: number | undefined) {
    if (this._id == value)
      return;

    this._id = value;

    if (this.datasourceId != this._id)
      this.setDatasource(this._id);
  }
  get id(): number | undefined {
    return this._id;
  }

  @Output() idChange: EventEmitter<number | undefined> = new EventEmitter();

  @Input() editable: boolean = true;

  @Output() onDone: EventEmitter<void> = new EventEmitter();

  appointment?: AppointmentView;

  isLoading: boolean = false;
  isLoadingDelete: boolean = false;
  isLoadingStatusChange: boolean = false;

  private subs: Subscription[] = [];

  datasourceId?: number;
  datasourceSub?: Subscription;

  constructor(
    private router: Router,
    private appointmentService: AppointmentService,
    private notifyDialogService: NotifyDialogService,
    private translateService: TranslateService,
    public serviceColorsService: ServiceColorsService
  ) { }

  ngOnInit(): void {
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  private setDatasource(id: number | undefined) {
    if (this.datasourceSub != null) {
      this.datasourceSub.unsubscribe();
      this.datasourceSub = undefined;
    }

    this.datasourceId = id;
    this.appointment = undefined;

    if (id == null)
      return;

    this.isLoading = true;

    this.datasourceSub = this.appointmentService.getWithDatasource(id).subscribe(a => {
      this.appointment = a;
      this.isLoading = false;
    });
  }

  onDelete() {
    this.subs.push(this.notifyDialogService.yesNoDialog(this.translateService.translate("pages.appointments.DELETE_PROMPT")).subscribe((ok: boolean) => {
      if (!ok)
        return;

      this.isLoadingDelete = true;
      this.subs.push(this.appointmentService.delete(this.id).subscribe({
        next: () => this.onDone.next(),
        error: (e: any) => this.isLoadingDelete = false
      }));
    }));
  }

  onChangeStatus(newStatus: AppointmentStatus) {
    if (this.appointment == null)
      return;

    this.isLoadingStatusChange = true;
    this.subs.push(this.appointmentService.setStatus(this.appointment?.id, newStatus).subscribe(() => this.isLoadingStatusChange = false))
  }

  goToEdit() {
    this.router.navigate(["appointments", "edit", this.id]);
    this.onDone.next();
  }

  goToClient(clientId: number) {
    this.router.navigate(["clients", "edit", clientId]);
    this.onDone.next();
  }

  goToPreviousAppointment() {
    if (this.appointment == null)
      return;
    
    if (this.appointment.previousAppointment == null)
      return;

    this.id = this.appointment.previousAppointment.id;
    this.idChange.emit(this.id);
  }

  public openContact(contact: ClientContactDTO) {
    openClientContactApp(contact);
  }

  public getContactTypeIcon(type: ClientContactType): IconName {
    return getClientContactTypeIcon(type);
  }
}

import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { NotifyDialogService } from 'src/app/components/notify-dialog/notify-dialog.service';
import { TranslateService } from 'src/app/components/translate/translate.service';
import { Appointment } from 'src/app/models/appointment';
import { AppointmentService } from '../../../services/appointment.service.ts';

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

    this.load();
  }
  get id(): number | undefined {
    return this._id;
  }

  @Input() editable: boolean = true;

  @Output() onDone: EventEmitter<void> = new EventEmitter();

  appointment?: Appointment;

  isLoading: boolean = false;
  isLoadingDelete: boolean = false;

  private subs: Subscription[] = [];
  private loadSub?: Subscription;

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private appointmentService: AppointmentService,
    private notifyDialogService: NotifyDialogService,
    private translateService: TranslateService,
  ) { }

  ngOnInit(): void {
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  load() {
    this.appointment = undefined;

    if (this.loadSub) {
      this.loadSub.unsubscribe();
      this.loadSub = undefined;
    }

    if (this.id == null)
      return;

    this.isLoading = true;

    this.subs.push(this.loadSub = this.appointmentService.get(this.id).subscribe(a => {
      this.appointment = a;
      this.isLoading = false;
    }));
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

  goToEdit() {
    this.router.navigate(["edit", this.id], {
      relativeTo: this.activatedRoute
    });
    this.onDone.next();
  }

  goToClient(clientId: number) {
    this.router.navigate(["clients", "edit", clientId]);
    this.onDone.next();
  }
}

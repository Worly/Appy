import { Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import dayjs from 'dayjs';
import { Subscription } from 'rxjs';
import { DayOfWeek, WorkingHour } from 'src/app/models/working-hours';
import { WorkingHoursService } from '../services/working-hours.service';

@Component({
  selector: 'app-working-hours',
  templateUrl: './working-hours.component.html',
  styleUrls: ['./working-hours.component.scss']
})
export class WorkingHoursComponent implements OnInit {
  public workingHours?: WorkingHour[] = undefined;

  public isLoading: boolean = false;

  private subs: Subscription[] = [];

  days = [
    { display: "MONDAY", dayOfWeek: DayOfWeek.Monday },
    { display: "TUESDAY", dayOfWeek: DayOfWeek.Tuesday },
    { display: "WEDNESDAY", dayOfWeek: DayOfWeek.Wednesday },
    { display: "THURSDAY", dayOfWeek: DayOfWeek.Thursday },
    { display: "FRIDAY", dayOfWeek: DayOfWeek.Friday },
    { display: "SATURDAY", dayOfWeek: DayOfWeek.Saturday },
    { display: "SUNDAY", dayOfWeek: DayOfWeek.Sunday }
  ];

  hours = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24];
  minutes = [0, 15, 30, 45];

  constructor(
    private location: Location,
    private workingHoursService: WorkingHoursService,
  ) { }

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  public formatHourMinute(hourMinute: number): string {
    return hourMinute.toString().padStart(2, "0");
  }

  public getWorkingHoursFor(dayOfWeek: DayOfWeek): WorkingHour[] {
    if (this.workingHours == null)
      return [];

    return this.workingHours.filter(w => w.dayOfWeek == dayOfWeek);
  }

  private load() {
    this.subs.push(this.workingHoursService.getAll().subscribe((wh: WorkingHour[]) => {
      this.workingHours = wh;
    }));
  }

  public cancel() {
    this.goBack();
  }

  public save() {
    if (this.workingHours == null)
      return;

    if (!this.workingHours.every(w => w.validate()))
      return;

    this.isLoading = true;

    this.subs.push(this.workingHoursService.set(this.workingHours as WorkingHour[]).subscribe({
      next: () => this.goBack(),
      error: (e: any) => this.isLoading = false
    }));
  }

  public goBack() {
    this.location.back();
  }

  public addWorkingHour(dayOfWeek: DayOfWeek) {
    let w = new WorkingHour();
    w.dayOfWeek = dayOfWeek;
    w.timeFrom = dayjs({ hour: 8 })
    w.timeTo = dayjs({ hour: 16 });

    this.workingHours?.push(w);
  }

  public removeWorkingHour(wh: WorkingHour) {
    this.workingHours?.splice(this.workingHours.indexOf(wh), 1);
  }

  public setFromHours(wh: WorkingHour, hours: number) {
    wh.timeFrom = wh.timeFrom?.hour(hours);
  }

  public setFromMinutes(wh: WorkingHour, minutes: number) {
    wh.timeFrom = wh.timeFrom?.minute(minutes);
  }

  public setToHours(wh: WorkingHour, hours: number) {
    wh.timeTo = wh.timeTo?.hour(hours);
  }

  public setToMinutes(wh: WorkingHour, minutes: number) {
    wh.timeTo = wh.timeTo?.minute(minutes);
  }
}

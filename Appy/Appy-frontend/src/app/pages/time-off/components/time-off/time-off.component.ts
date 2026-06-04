import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { DayOfWeek } from 'src/app/models/working-hours';
import { TimeOff, TimeOffRecurrence } from 'src/app/models/time-off';
import { TimeOffService } from '../../services/time-off.service';

@Component({
  selector: 'app-time-off',
  templateUrl: './time-off.component.html',
  styleUrls: ['./time-off.component.scss']
})
export class TimeOffComponent implements OnInit, OnDestroy {
  public timeOffs: TimeOff[] | null = null;

  public readonly groups: { title: string; recurrence: TimeOffRecurrence }[] = [
    { title: "pages.time-off.ONE_OFF", recurrence: TimeOffRecurrence.OneOff },
    { title: "pages.time-off.WEEKLY", recurrence: TimeOffRecurrence.Weekly },
    { title: "pages.time-off.MONTHLY", recurrence: TimeOffRecurrence.Monthly },
  ];

  private static readonly DAY_OF_WEEK_KEYS: Record<DayOfWeek, string> = {
    [DayOfWeek.Sunday]: "SUNDAY",
    [DayOfWeek.Monday]: "MONDAY",
    [DayOfWeek.Tuesday]: "TUESDAY",
    [DayOfWeek.Wednesday]: "WEDNESDAY",
    [DayOfWeek.Thursday]: "THURSDAY",
    [DayOfWeek.Friday]: "FRIDAY",
    [DayOfWeek.Saturday]: "SATURDAY",
  };

  private subs: Subscription[] = [];

  constructor(
    private timeOffService: TimeOffService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.subs.push(this.timeOffService.getAll().subscribe(t => this.timeOffs = t));
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  public forGroup(recurrence: TimeOffRecurrence): TimeOff[] {
    return this.timeOffs?.filter(t => t.recurrence === recurrence) ?? [];
  }

  public dayOfWeekKey(dayOfWeek: DayOfWeek | undefined): string {
    return dayOfWeek != null ? TimeOffComponent.DAY_OF_WEEK_KEYS[dayOfWeek] : '';
  }

  public addNew(): void {
    this.router.navigate(["/time-off/new"]);
  }

  public edit(t: TimeOff): void {
    this.router.navigate(["/time-off/edit", t.id]);
  }
}

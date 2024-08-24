import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { DashboardService } from '../services/dashboard.service';

@Component({
  selector: 'app-booked-today',
  templateUrl: './booked-today.component.html',
  styleUrls: ['./booked-today.component.scss']
})
export class BookedTodayComponent implements OnInit, OnDestroy {
  bookedToday?: number = undefined;
  emoji?: string;

  numberOfAppointmentsTodayEmoji: { [key: number]: string } = {
    0: "😢",
    1: "😕",
    2: "😐",
    3: "🙂",
    4: "😊",
    5: "😁",
    6: "😍",
    7: "🤩",
  }

  private subs: Subscription[] = [];

  constructor(private dashboardService: DashboardService) { }
  
  ngOnInit(): void {
    this.subs.push(this.dashboardService.getBookedToday().subscribe(s => {
      this.bookedToday = s;
      this.calculateEmojies();
    }));
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  private calculateEmojies() {
    if (this.bookedToday == null) {
      this.emoji = undefined;
      return;
    }
    
    this.emoji = this.getEmojiForNumberOfAppointmentsToday(this.bookedToday);
  }

  private getEmojiForNumberOfAppointmentsToday(num: number): string {
    let maxN = Object.entries(this.numberOfAppointmentsTodayEmoji).length - 1;

    if (num < 0) num = 0;
    if (num > maxN) num = maxN;

    return this.numberOfAppointmentsTodayEmoji[num];
  }
}

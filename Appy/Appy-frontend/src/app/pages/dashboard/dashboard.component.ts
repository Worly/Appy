import { Component, OnDestroy, OnInit } from '@angular/core';
import { DashboardService } from './services/dashboard.service';
import { DashboardStats } from './dashboard-stats';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, OnDestroy {
  stats?: DashboardStats = undefined;
  emojies: { [key: string]: string } = {};

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

  constructor(private homeService: DashboardService) { }

  ngOnInit(): void {
    this.subs.push(this.homeService.getStats().subscribe(s => {
      this.stats = s;
      this.calculateEmojies();
    }));
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  private calculateEmojies() {
    if (this.stats == null) {
      this.emojies = {};
      return;
    }

    this.emojies = {
      numberOfAppointmentsCreatedToday: this.getEmojiForNumberOfAppointmentsToday(<number>this.stats.numberOfAppointmentsCreatedToday)
    }
  }

  private getEmojiForNumberOfAppointmentsToday(num: number): string {
    let maxN = Object.entries(this.numberOfAppointmentsTodayEmoji).length - 1;

    if (num < 0) num = 0;
    if (num > maxN) num = maxN;

    return this.numberOfAppointmentsTodayEmoji[num];
  }
}

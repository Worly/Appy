import { Component, OnDestroy, OnInit } from '@angular/core';
import { HomeService } from './services/home.service';
import { HomeStats } from './home-stats';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit, OnDestroy {
  stats?: HomeStats = undefined;
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

  constructor(private homeService: HomeService) { }

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

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

  private subs: Subscription[] = [];

  constructor(private homeService: HomeService) { }

  ngOnInit(): void {
    this.subs.push(this.homeService.getStats().subscribe(s => this.stats = s));
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }
}

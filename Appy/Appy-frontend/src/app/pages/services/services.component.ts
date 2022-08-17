import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Duration } from 'dayjs/plugin/duration';
import { Subscription } from 'rxjs';
import { Service } from 'src/app/models/service';
import { ServiceColorsService } from 'src/app/services/service-colors.service';
import { ServiceService } from 'src/app/services/service.service';

@Component({
  selector: 'app-services',
  templateUrl: './services.component.html',
  styleUrls: ['./services.component.scss']
})
export class ServicesComponent implements OnInit, OnDestroy {

  services?: Service[] = undefined;

  private subs: Subscription[] = [];

  constructor(
    private activatedRoute: ActivatedRoute,
    private serviceService: ServiceService,
    public serviceColorsService: ServiceColorsService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  private load() {
    this.subs.push(this.serviceService.getAll().subscribe((s: Service[]) => this.services = s));
  }

  public goToNew() {
    this.router.navigate(["new"], { relativeTo: this.activatedRoute });
  }

  public goToEdit(id: number) {
    this.router.navigate(["edit", id], { relativeTo: this.activatedRoute });
  }
}

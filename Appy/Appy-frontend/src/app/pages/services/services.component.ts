import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import * as moment from 'moment';
import { Service } from 'src/app/models/service';
import { ServiceColorsService } from 'src/app/services/service-colors.service';
import { ServiceService } from 'src/app/services/service.service';

@Component({
  selector: 'app-services',
  templateUrl: './services.component.html',
  styleUrls: ['./services.component.scss']
})
export class ServicesComponent implements OnInit {

  services?: Service[] = undefined;

  constructor(
    private activatedRoute: ActivatedRoute,
    private serviceService: ServiceService,
    public serviceColorsService: ServiceColorsService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.load();
  }

  private load() {
    this.serviceService.getAll().subscribe(s => this.services = s);
  }

  public formatDuration(duration?: moment.Duration): string {
    return moment.utc(duration?.asMilliseconds()).format("HH:mm");
  }

  public goToNew() {
    this.router.navigate(["new"], { relativeTo: this.activatedRoute });
  }

  public goToEdit(id: number) {
    this.router.navigate(["edit", id], { relativeTo: this.activatedRoute });
  }
}

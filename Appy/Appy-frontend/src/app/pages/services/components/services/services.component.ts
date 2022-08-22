import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Data, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { Service } from 'src/app/models/service';
import { ServiceColorsService } from '../../services/service-colors.service';
import { ServiceService } from '../../services/service.service';

@Component({
  selector: 'app-services',
  templateUrl: './services.component.html',
  styleUrls: ['./services.component.scss']
})
export class ServicesComponent implements OnInit, OnDestroy {

  services?: Service[] = undefined;
  isArchive: boolean = false;

  private subs: Subscription[] = [];

  constructor(
    private activatedRoute: ActivatedRoute,
    private serviceService: ServiceService,
    public serviceColorsService: ServiceColorsService,
    private router: Router
  ) { }

  ngOnInit(): void {

    this.activatedRoute.data.subscribe((data: Data) => {
      if (data["archive"])
        this.isArchive = true;

      this.load();
    });
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  private load() {
    this.subs.push(this.serviceService.getAll(this.isArchive).subscribe((s: Service[]) => this.services = s));
  }

  public goToNew() {
    let relativeTo = this.activatedRoute;
    if (this.isArchive)
      relativeTo = relativeTo.parent as ActivatedRoute;

    this.router.navigate(["new"], { relativeTo: relativeTo });
  }

  public goToEdit(id: number) {
    let relativeTo = this.activatedRoute;
    if (this.isArchive)
      relativeTo = relativeTo.parent as ActivatedRoute;

    this.router.navigate(["edit", id], { relativeTo: relativeTo });
  }

  public toggleArchive() {
    if (this.isArchive)
      this.router.navigate([".."], { relativeTo: this.activatedRoute });
    else
      this.router.navigate(["archive"], { relativeTo: this.activatedRoute });
  }
}

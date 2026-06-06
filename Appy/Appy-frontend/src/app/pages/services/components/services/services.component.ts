import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Data, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { Service } from 'src/app/models/service';
import { ServiceColorsService } from '../../services/service-colors.service';
import { ServiceService } from '../../services/service.service';
import { QueryResult } from 'src/app/shared/services/data/contracts';
import { BeforeAttach } from 'src/app/services/attach-detach-hooks.service';

@Component({
  selector: 'app-services',
  templateUrl: './services.component.html',
  styleUrls: ['./services.component.scss']
})
export class ServicesComponent implements OnInit, OnDestroy, BeforeAttach {

  services?: Service[] = undefined;
  isArchive: boolean = false;

  private servicesQuery?: QueryResult<Service[]>;
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
    this.servicesQuery = this.serviceService.getAll(this.isArchive);
    this.subs.push(this.servicesQuery.data$.subscribe(s => this.services = s));
  }

  // This component is cached by the route-reuse strategy, so navigating back from
  // edit/new/archive re-attaches it without re-running ngOnInit (and the live-sync bus is
  // gone). Refetch in place: the already-rendered list stays visible (so the restored scroll
  // position is preserved) and the fresh data swaps in when it arrives.
  ngBeforeAttach(): void {
    this.servicesQuery?.refetch();
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

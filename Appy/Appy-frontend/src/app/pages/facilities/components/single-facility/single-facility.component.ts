import { Component, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { DialogComponent } from 'src/app/components/dialog/dialog.component';
import { Facility } from 'src/app/models/facility';
import { FacilityService } from '../../services/facility.service';

@Component({
  selector: 'app-single-facility',
  templateUrl: './single-facility.component.html',
  styleUrls: ['./single-facility.component.css']
})
export class SingleFacilityComponent implements OnInit, OnDestroy {

  @ViewChild("deleteDialog") deleteDialog?: DialogComponent;

  @Input()
  public facility?: Facility;

  public deleteName: string = "";
  public isDeleting: boolean = false;

  private subs: Subscription[] = [];

  constructor(private facilityService: FacilityService, private router: Router) {

  }

  ngOnInit(): void {
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  selectFacility() {
    this.subs.push(this.facilityService.selectFacility(this.facility as Facility).subscribe(() => this.router.navigate(["home"])));
  }

  openDeleteDialog() {
    this.deleteName = "";
    this.deleteDialog?.open();
  }

  deleteFacility() {
    this.isDeleting = true;
    this.subs.push(this.facilityService.deleteFacility(this.facility as Facility).subscribe(() => {
      this.isDeleting = false;
      this.deleteDialog?.close();
    }));
  }
}

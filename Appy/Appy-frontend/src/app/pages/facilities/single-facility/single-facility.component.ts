import { Component, Input, OnInit, Output, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { DialogComponent } from 'src/app/components/dialog/dialog.component';
import { Facility } from 'src/app/models/facility';
import { FacilityService } from 'src/app/services/facilities/facility.service';

@Component({
  selector: 'app-single-facility',
  templateUrl: './single-facility.component.html',
  styleUrls: ['./single-facility.component.css']
})
export class SingleFacilityComponent implements OnInit {

  @ViewChild("deleteDialog") deleteDialog?: DialogComponent;

  @Input()
  public facility?: Facility;

  public deleteName: string = "";
  public isDeleting: boolean = false;
  
  constructor(private facilityService: FacilityService, private router: Router) { 
    
  }

  ngOnInit(): void {
  }

  selectFacility() {
    this.facilityService.selectFacility(this.facility as Facility).subscribe(o => this.router.navigate(["home"]));
  }

  openDeleteDialog() {
    this.deleteName = "";
    this.deleteDialog?.open();
  }

  deleteFacility() {
    this.isDeleting = true;
    this.facilityService.deleteFacility(this.facility as Facility).subscribe(() => {
      this.isDeleting = false;
      this.deleteDialog?.close();
    });
  }
}

import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FacilityService } from 'src/app/services/facilities/facility.service';

@Component({
  selector: 'app-selected-facility',
  templateUrl: './selected-facility.component.html',
  styleUrls: ['./selected-facility.component.scss']
})
export class SelectedFacilityComponent implements OnInit {

  constructor(public facilityService: FacilityService, private router: Router) { }

  ngOnInit(): void {
  }

  navigateToFacilities() {
    this.router.navigate(["facilities"]);
  }

}

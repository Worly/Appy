import { Component } from '@angular/core';
import { FacilityService } from '../../services/facility.service';

@Component({
  selector: 'app-facilities',
  templateUrl: './facilities.component.html',
  styleUrls: ['./facilities.component.css']
})
export class FacilitiesComponent {
  constructor(public facilityService: FacilityService) { } 
}

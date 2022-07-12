import { Component, OnInit } from '@angular/core';
import { AuthService } from './services/auth/auth.service';
import { FacilityService } from './services/facilities/facility.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {

  constructor(public authService: AuthService, public facilityService: FacilityService) {}

  ngOnInit() {
    
  }

  public logOut(): void {
    this.authService.logOut();
  }
  
}

import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { AuthService } from './services/auth/auth.service';
import { FacilityService } from './services/facilities/facility.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {

  @ViewChild("navbarCollapse") private navbarCollapse?: ElementRef<HTMLElement>;

  constructor(public authService: AuthService, public facilityService: FacilityService) {}

  ngOnInit() {
    
  }

  public logOut(): void {
    this.authService.logOut();
  }

  public toggleNavbar(): void {
    this.navbarCollapse?.nativeElement.classList.toggle("show");
  }
  
}

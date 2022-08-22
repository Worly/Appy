import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { FacilityService } from './pages/facilities/services/facility.service';
import { AuthService } from './shared/services/auth/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {

  @ViewChild("navbarCollapse") private navbarCollapse?: ElementRef<HTMLElement>;

  constructor(
    private router: Router,
    public authService: AuthService,
    public facilityService: FacilityService) { }

  ngOnInit() {
    this.router.events.subscribe(e => {
      if (e instanceof NavigationEnd)
        this.closeNavbar();
    });
  }

  public logOut(): void {
    this.authService.logOut();
  }

  public toggleNavbar(): void {
    this.navbarCollapse?.nativeElement.classList.toggle("show");
  }

  public closeNavbar(): void {
    this.navbarCollapse?.nativeElement.classList.remove("show");
  }

}

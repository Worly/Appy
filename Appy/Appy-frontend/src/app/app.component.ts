import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { IconProp } from '@fortawesome/fontawesome-svg-core';
import { ContextMenuComponent } from './components/context-menu/context-menu.component';
import { FacilityService } from './pages/facilities/services/facility.service';
import { AuthService } from './shared/services/auth/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  @ViewChild("navigationDropdown") navigationDropdown?: ContextMenuComponent;

  navigations: Navigation[] = [
    {
      name: "HOME",
      icon: "house",
      link: "/home",
      visible: () => this.authService.isLoggedIn() && this.facilityService.getSelected() != null
    },
    {
      name: "pages.appointments.APPOINTMENTS",
      icon: "calendar-week",
      link: "/appointments",
      visible: () => this.authService.isLoggedIn() && this.facilityService.getSelected() != null
    },
    {
      name: "pages.clients.CLIENTS",
      icon: "users",
      link: "/clients",
      visible: () => this.authService.isLoggedIn() && this.facilityService.getSelected() != null
    },
  ];

  dropdownNavigations: Navigation[] = [
    {
      name: "pages.services.SERVICES",
      icon: "hand-holding-heart",
      link: "/services",
      visible: () => this.authService.isLoggedIn() && this.facilityService.getSelected() != null
    },
    {
      name: "pages.working-hours.WORKING_HOURS",
      icon: "business-time",
      link: "/working-hours",
      visible: () => this.authService.isLoggedIn() && this.facilityService.getSelected() != null
    },
  ]

  constructor(
    private router: Router,
    public authService: AuthService,
    public facilityService: FacilityService) { }

  ngOnInit() {
    this.router.events.subscribe(e => {
      if (e instanceof NavigationEnd)
        this.navigationDropdown?.close();
    });
  }

  public logOut(): void {
    this.authService.logOut();
  }

  public visibleNavigation(nav: Navigation): boolean {
    return nav.visible();
  }
}

type Navigation = {
  name: string;
  icon: IconProp;
  link: string;
  visible: () => boolean;
}
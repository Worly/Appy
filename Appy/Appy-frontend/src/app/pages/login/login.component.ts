import { ViewportRuler } from '@angular/cdk/scrolling';
import { Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { appConfig } from 'src/app/app.config';
import { AuthService } from 'src/app/shared/services/auth/auth.service';
import { FacilityService } from '../facilities/services/facility.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit, OnDestroy {

  public height: number = 0;

  public validationErrors: {
    [key: string]: string
  } = {};

  public email?: string;
  public password?: string;

  public isLoading: boolean = false;

  private subs: Subscription[] = [];

  constructor(
    private authService: AuthService,
    private facilityService: FacilityService,
    private router: Router,
    private readonly viewportRuler: ViewportRuler,
    private readonly ngZone: NgZone
  ) {
    this.subs.push(this.viewportRuler.change(50).subscribe(() => this.ngZone.run(() => this.setHeight)));
  }

  ngOnInit(): void {
    this.setHeight();
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  setHeight(): void {
    this.height = this.viewportRuler.getViewportSize().height - 300;
  }

  keypress(e: KeyboardEvent): void {
    if (e.key == "Enter")
      this.login();
  }

  validate(): boolean {
    this.validationErrors = {};

    if (this.email == null || this.email == "")
      this.validationErrors["email"] = "pages.login-register.errors.MISSING_EMAIL";

    if (this.password == null || this.password == "")
      this.validationErrors["password"] = "pages.login-register.errors.MISSING_PASSWORD";

    return Object.entries(this.validationErrors).length == 0;
  }

  login(): void {
    if (this.validate()) {
      this.isLoading = true;
      this.subs.push(this.authService.logIn(this.email as string, this.password as string).subscribe({
        next: () => {
          this.isLoading = false;
          
          if (this.facilityService.getSelected() == null)
            this.router.navigate(["facilities"]);
          else
            this.router.navigate([appConfig.homePage]);
        },
        error: (e: any) => {
          this.isLoading = false;
          this.validationErrors = e.error.errors;
        },
      }));
    }
  }
}

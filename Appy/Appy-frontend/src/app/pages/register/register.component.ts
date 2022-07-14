import { ViewportRuler } from '@angular/cdk/scrolling';
import { Component, ElementRef, NgZone, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth/auth.service';
import { TranslateService } from 'src/app/services/translate/translate.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent implements OnInit {

  public height: number = 0;

  public validationErrors: {
    [key: string]: string
  } = {};

  public email: string = "";
  public name: string = "";
  public surname: string = "";
  public password: string = "";
  public repeatPassword: string = "";

  public isLoading: boolean = false;

  private readonly viewportChange = this.viewportRuler
    .change(50)
    .subscribe(() => this.ngZone.run(() => this.setHeight()));

  constructor(
    private authService: AuthService,
    private router: Router,
    private translateService: TranslateService,
    private readonly viewportRuler: ViewportRuler,
    private readonly ngZone: NgZone
  ) {
  }

  ngOnInit(): void {
    this.setHeight();
  }

  setHeight(): void {
    this.height = this.viewportRuler.getViewportSize().height - 300;
  }

  keypress(e: KeyboardEvent): void {
    if (e.key == "Enter")
      this.register();
  }

  validate(): boolean {
    this.validationErrors = {};

    if (this.email == null || this.email == "")
      this.validationErrors["email"] = this.translateService.translate("pages.login-register.errors.MISSING_EMAIL");

    if (this.name == null || this.name == "")
      this.validationErrors["name"] = this.translateService.translate("pages.login-register.errors.MISSING_NAME");

    if (this.surname == null || this.surname == "")
      this.validationErrors["surname"] = this.translateService.translate("pages.login-register.errors.MISSING_SURNAME");

    if (this.password == null || this.password == "")
      this.validationErrors["password"] = this.translateService.translate("pages.login-register.errors.MISSING_PASSWORD");

    if (this.repeatPassword == null || this.repeatPassword == "")
      this.validationErrors["repeatPassword"] = this.translateService.translate("pages.login-register.errors.MISSING_REPEAT_PASSWORD");
    else if (this.repeatPassword != this.password)
      this.validationErrors["repeatPassword"] = this.translateService.translate("pages.login-register.errors.WRONG_REPEAT_PASSWORD");

    return Object.entries(this.validationErrors).length == 0;
  }

  register(): void {
    if (this.validate()) {
      this.isLoading = true;
      this.authService.register(this.email, this.name, this.surname, this.password).subscribe({
        next: o => {
          this.isLoading = false;

          this.router.navigate(["facilities"]);
        },
        error: e => {
          this.isLoading = false;
          this.validationErrors = e.error.errors;
        },
      });
    }
  }
}

import { ViewportRuler } from '@angular/cdk/scrolling';
import { Component, ElementRef, NgZone, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth/auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent implements OnInit {

  public height: number;

  public validationErrors: {
    [key: string]: string
  } = {};

  public email: string;
  public username: string;
  public password: string;
  public repeatPassword: string;

  public isLoading: boolean = false;

  private readonly viewportChange = this.viewportRuler
    .change(50)
    .subscribe(() => this.ngZone.run(() => this.setHeight()));

  constructor(
    private authService: AuthService,
    private router: Router,
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
      this.validationErrors["email"] = "Please enter your email";

    if (this.username == null || this.username == "")
      this.validationErrors["username"] = "Please enter your username";

    if (this.password == null || this.password == "")
      this.validationErrors["password"] = "Please enter your password";

    if (this.repeatPassword == null || this.repeatPassword == "")
      this.validationErrors["repeatPassword"] = "Please repeat your password";
    else if (this.repeatPassword != this.password)
      this.validationErrors["repeatPassword"] = "Passwords do not match";

    return Object.entries(this.validationErrors).length == 0;
  }

  register(): void {
    if (this.validate()) {
      this.isLoading = true;
      this.authService.register(this.email, this.username, this.password).subscribe({
        next: o => {
          this.isLoading = false;
          
          this.router.navigate(["companies"]);
        },
        error: e => {
          this.isLoading = false;
          this.validationErrors = e.error.errors;
        },
      });
    }
  }
}

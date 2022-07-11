import { Component, OnInit } from '@angular/core';
import { AuthService } from './services/auth/auth.service';
import { CompanyService } from './services/companies/company.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {

  constructor(public authService: AuthService, public companyService: CompanyService) {}

  ngOnInit() {
    
  }

  public logOut(): void {
    this.authService.logOut();
  }
  
}

import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CompanyService } from 'src/app/services/companies/company.service';

@Component({
  selector: 'app-selected-company',
  templateUrl: './selected-company.component.html',
  styleUrls: ['./selected-company.component.scss']
})
export class SelectedCompanyComponent implements OnInit {

  constructor(public companyService: CompanyService, private router: Router) { }

  ngOnInit(): void {
  }

  navigateToCompanies() {
    this.router.navigate(["companies"]);
  }

}

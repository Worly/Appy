import { Component } from '@angular/core';
import { CompanyService } from 'src/app/services/companies/company.service';

@Component({
  selector: 'app-companies',
  templateUrl: './companies.component.html',
  styleUrls: ['./companies.component.css']
})
export class CompaniesComponent {
  constructor(public companyService: CompanyService) { } 
}

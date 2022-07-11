import { Component, Input, OnInit, Output, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { DialogComponent } from 'src/app/components/dialog/dialog.component';
import { Company } from 'src/app/dtos/company';
import { CompanyService } from 'src/app/services/companies/company.service';

@Component({
  selector: 'app-single-company',
  templateUrl: './single-company.component.html',
  styleUrls: ['./single-company.component.css']
})
export class SingleCompanyComponent implements OnInit {

  @ViewChild("deleteDialog") deleteDialog: DialogComponent;

  @Input()
  public company: Company;

  public deleteName: string;
  public isDeleting: boolean;
  
  constructor(private companyService: CompanyService, private router: Router) { 
    
  }

  ngOnInit(): void {
  }

  selectCompany() {
    this.companyService.selectCompany(this.company).subscribe(o => this.router.navigate(["home"]));
  }

  openDeleteDialog() {
    this.deleteName = "";
    this.deleteDialog.open();
  }

  deleteCompany() {
    this.isDeleting = true;
    this.companyService.deleteCompany(this.company).subscribe(() => {
      this.isDeleting = false;
      this.deleteDialog.close();
    });
  }
}

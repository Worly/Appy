import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { throwIfEmpty } from 'rxjs/operators';
import { DialogComponent } from 'src/app/components/dialog/dialog.component';
import { Company } from 'src/app/dtos/company';
import { CompanyService } from 'src/app/services/companies/company.service';

@Component({
  selector: 'app-company-edit',
  templateUrl: './company-edit.component.html',
  styleUrls: ['./company-edit.component.css']
})
export class CompanyEditComponent implements OnInit {

  @ViewChild(DialogComponent) dialog?: DialogComponent;

  @Input()
  company?: Company;

  isNew: boolean = false;

  name: string = "";

  public validationErrors: {
    [key: string]: string
  } = {};

  public isLoading: boolean = false;

  constructor(private companyService: CompanyService, private router: Router) { }

  ngOnInit(): void {
  }

  startEdit(): void {
    this.isNew = false;
    this.reset();
    this.dialog?.open();
  }

  startAddNew(): void {
    this.isNew = true;
    this.reset();
    this.dialog?.open();
  }

  reset(): void {
    if (this.isNew)
      this.name = "";
    else
      this.name = this.company?.name as string;

    this.validationErrors = {};
  }

  validate(): boolean {
    this.validationErrors = {};

    if (this.name == null || this.name == "")
      this.validationErrors["name"] = "Please enter a name";

    return Object.entries(this.validationErrors).length == 0;
  }

  save(): void {
    if (!this.validate())
      return;

    this.isLoading = true;

    let request;
    if (this.isNew)
      request = this.companyService.addNew(this.name);
    else
      request = this.companyService.edit(this.company?.id as number, this.name);

    request.subscribe({
      next: w => {

        if (this.isNew) {
          this.companyService.selectCompany(w).subscribe({
            next: () => {
              this.isLoading = false;
              this.dialog?.close();

              this.router.navigate(["home"])
            },
            error: () => {
              this.isLoading = false;
              this.dialog?.close();
            }
          });
        }
        else {
          this.isLoading = false;
          this.dialog?.close();
        }
      },
      error: e => {
        this.isLoading = false;
        this.validationErrors = e.error.errors;
      }
    });
  }
}

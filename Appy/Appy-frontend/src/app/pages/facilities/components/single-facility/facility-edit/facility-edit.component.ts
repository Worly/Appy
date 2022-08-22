import { Component, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { DialogComponent } from 'src/app/components/dialog/dialog.component';
import { Facility } from 'src/app/models/facility';
import { FacilityService } from '../../../services/facility.service';

@Component({
  selector: 'app-facility-edit',
  templateUrl: './facility-edit.component.html',
  styleUrls: ['./facility-edit.component.css']
})
export class FacilityEditComponent implements OnInit, OnDestroy {

  @ViewChild(DialogComponent) dialog?: DialogComponent;

  @Input()
  facility?: Facility;

  isNew: boolean = false;

  name: string = "";

  public validationErrors: {
    [key: string]: string
  } = {};

  public isLoading: boolean = false;

  private subs: Subscription[] = [];

  constructor(private facilityService: FacilityService, private router: Router) { }

  ngOnInit(): void {
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
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
      this.name = this.facility?.name as string;

    this.validationErrors = {};
  }

  validate(): boolean {
    this.validationErrors = {};

    if (this.name == null || this.name == "")
      this.validationErrors["name"] = "pages.facilities.errors.MISSING_NAME";

    return Object.entries(this.validationErrors).length == 0;
  }

  save(): void {
    if (!this.validate())
      return;

    this.isLoading = true;

    let request;
    if (this.isNew)
      request = this.facilityService.addNew(this.name);
    else
      request = this.facilityService.edit(this.facility?.id as number, this.name);

    this.subs.push(request.subscribe({
      next: (w: any) => {

        if (this.isNew) {
          this.subs.push(this.facilityService.selectFacility(w).subscribe({
            next: () => {
              this.isLoading = false;
              this.dialog?.close();

              this.router.navigate(["home"])
            },
            error: () => {
              this.isLoading = false;
              this.dialog?.close();
            }
          }));
        }
        else {
          this.isLoading = false;
          this.dialog?.close();
        }
      },
      error: (e: any) => {
        this.isLoading = false;
        this.validationErrors = e.error.errors;
      }
    }));
  }
}

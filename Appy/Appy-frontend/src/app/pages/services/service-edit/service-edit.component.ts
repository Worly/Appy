import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Data, ParamMap, Router } from '@angular/router';
import { Service } from 'src/app/models/service';
import { ServiceService } from 'src/app/services/service.service';
import { Location } from '@angular/common';
import { combineLatest, debounceTime, Observable, Subscription } from 'rxjs';
import { NotifyDialogService } from 'src/app/components/notify-dialog/notify-dialog.service';
import { TranslateService } from 'src/app/services/translate/translate.service';

@Component({
  selector: 'app-service-edit',
  templateUrl: './service-edit.component.html',
  styleUrls: ['./service-edit.component.scss']
})
export class ServiceEditComponent implements OnInit, OnDestroy {

  public isNew: boolean = false;
  public service?: Service = undefined;
  public originalName?: string;

  public isLoadingSave: boolean = false;
  public isLoadingDelete: boolean = false;
  public get isLoading(): boolean {
    return this.isLoadingSave || this.isLoadingDelete;
  }

  private subs: Subscription[] = [];

  constructor(
    private location: Location,
    private activatedRoute: ActivatedRoute,
    private serviceService: ServiceService,
    private notifyDialogService: NotifyDialogService,
    private translateService: TranslateService
  ) { }

  ngOnInit(): void {
    this.subs.push(combineLatest([this.activatedRoute.data, this.activatedRoute.paramMap])
      .pipe(debounceTime(0)).subscribe(([data, paramMap]: [Data, ParamMap]) => {
        this.isNew = data["isNew"] ?? false;

        if (this.isNew)
          this.service = new Service();
        else {
          var idParam = paramMap.get("id");
          if (idParam)
            this.load(Number.parseInt(idParam));
        }
      }));
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  private load(id: number) {
    this.subs.push(this.serviceService.get(id).subscribe((s: Service) => {
      this.service = s;
      this.originalName = s.name;
    }));
  }

  public cancel() {
    this.goBack();
  }

  public save() {
    if (!this.service?.validate())
      return;

    this.isLoadingSave = true;

    let action: Observable<Service>;

    if (this.isNew)
      action = this.serviceService.addNew(this.service as Service);
    else
      action = this.serviceService.save(this.service as Service);

    this.subs.push(action.subscribe({
      next: () => this.goBack(),
      error: (e: any) => {
        this.service?.applyServerValidationErrors(e.error.errors);
        this.isLoadingSave = false;
      }
    }));
  }

  public deleteService() {
    this.subs.push(this.notifyDialogService.yesNoDialog(this.translateService.translate("pages.services.DELETE_PROMPT")).subscribe((ok: boolean) => {
      if (!ok)
        return;

      this.isLoadingDelete = true;
      this.subs.push(this.serviceService.delete(this.service?.id as number).subscribe({
        next: () => this.goBack(),
        error: (e: any) => {
          this.service?.applyServerValidationErrors(e.error.errors);
          this.isLoadingDelete = false;
        }
      }));
    }));
  }

  public goBack() {
    this.location.back();
  }
}

import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Data, ParamMap } from '@angular/router';
import { Service } from 'src/app/models/service';
import { Location } from '@angular/common';
import { combineLatest, debounceTime, Observable, Subscription } from 'rxjs';
import { NotifyDialogService } from 'src/app/components/notify-dialog/notify-dialog.service';
import { ServiceService } from '../../services/service.service';
import { TranslateService } from 'src/app/components/translate/translate.service';
import { HttpErrorResponse } from '@angular/common/http';

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
  public isLoadingArchive: boolean = false;
  public get isLoading(): boolean {
    return this.isLoadingSave || this.isLoadingDelete || this.isLoadingArchive;
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
    if (this.service == null)
      return;

    if (this.service.displayName == null || this.service.displayName == "")
      this.service.displayName = this.service.name;

    if (!this.service.validate())
      return;

    this.isLoadingSave = true;

    let action: Observable<Service>;

    if (this.isNew)
      action = this.serviceService.addNew(this.service as Service);
    else
      action = this.serviceService.save(this.service as Service);

    this.subs.push(action.subscribe({
      next: () => this.goBack(),
      error: (e: any) => this.isLoadingSave = false
    }));
  }

  public deleteService() {
    this.subs.push(this.notifyDialogService.yesNoDialog(this.translateService.translate("pages.services.DELETE_PROMPT")).subscribe((ok: boolean) => {
      if (!ok)
        return;

      this.isLoadingDelete = true;
      this.subs.push(this.serviceService.delete(this.service?.id as number).subscribe({
        next: () => this.goBack(),
        error: (e: HttpErrorResponse) => {
          this.isLoadingDelete = false;

          if (e.error.error == "Archive")
            this.setArchivedService("pages.services.DELETE_ARCHIVE_PROMPT", true);
        }
      }));
    }));
  }

  public archiveService() {
    this.setArchivedService("pages.services.ARCHIVE_PROMPT", true);
  }

  public unarchiveService() {
    this.setArchivedService("pages.services.UNARCHIVE_PROMPT", false);
  }

  private setArchivedService(dialogPrompt: string, isArchived: boolean) {
    this.subs.push(this.notifyDialogService.yesNoDialog(this.translateService.translate(dialogPrompt)).subscribe((ok: boolean) => {
      if (!ok)
        return;

      this.isLoadingArchive = true;
      this.subs.push(this.serviceService.setArchived(this.service as Service, isArchived).subscribe({
        next: () => this.goBack(),
        error: (e: HttpErrorResponse) => this.isLoadingArchive = false
      }));
    }));
  }

  public goBack() {
    this.location.back();
  }
}

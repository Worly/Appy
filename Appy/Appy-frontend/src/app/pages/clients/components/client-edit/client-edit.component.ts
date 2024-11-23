import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Data, ParamMap, Router } from '@angular/router';
import { Location } from '@angular/common';
import { combineLatest, debounceTime, Observable, Subscription } from 'rxjs';
import { NotifyDialogService } from 'src/app/components/notify-dialog/notify-dialog.service';
import { TranslateService } from 'src/app/components/translate/translate.service';
import { HttpErrorResponse } from '@angular/common/http';
import { Client, ClientContact, ClientContactType } from 'src/app/models/client';
import { ClientService } from '../../services/client.service';
import { IconName } from '@fortawesome/fontawesome-svg-core';
import { getClientContactTypeIcon, openClientContactApp } from '../../clients.module';

@Component({
  selector: 'app-client-edit',
  templateUrl: './client-edit.component.html',
  styleUrls: ['./client-edit.component.scss']
})
export class ClientEditComponent implements OnInit, OnDestroy {

  public isNew: boolean = false;
  public client?: Client = undefined;
  public originalFullname?: string;

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
    private router: Router,
    private clientService: ClientService,
    private notifyDialogService: NotifyDialogService,
    private translateService: TranslateService
  ) { }

  ngOnInit(): void {
    this.subs.push(combineLatest([this.activatedRoute.data, this.activatedRoute.paramMap])
      .pipe(debounceTime(0)).subscribe(([data, paramMap]: [Data, ParamMap]) => {
        this.isNew = data["isNew"] ?? false;

        if (this.isNew)
          this.client = new Client();
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
    this.subs.push(this.clientService.get(id).subscribe((s: Client) => {
      this.client = s;
      this.originalFullname = s.getFullname();
    }));
  }

  public cancel() {
    this.goBack();
  }

  public save() {
    if (this.client == null)
      return;

    if (!this.client.validate())
      return;

    this.isLoadingSave = true;

    let action: Observable<Client>;

    if (this.isNew)
      action = this.clientService.addNew(this.client);
    else
      action = this.clientService.save(this.client);

    this.subs.push(action.subscribe({
      next: () => this.goBack(),
      error: (e: any) => this.isLoadingSave = false
    }));
  }

  public deleteClient() {
    this.subs.push(this.notifyDialogService.yesNoDialog(this.translateService.translate("pages.clients.DELETE_PROMPT")).subscribe((ok: boolean) => {
      if (!ok)
        return;

      this.isLoadingDelete = true;
      this.subs.push(this.clientService.delete(this.client?.id as number).subscribe({
        next: () => this.goBack(),
        error: (e: HttpErrorResponse) => {
          this.isLoadingDelete = false;

          if (e.error.error == "Archive")
            this.setArchivedClient("pages.clients.DELETE_ARCHIVE_PROMPT", true);
        }
      }));
    }));
  }

  public archiveClient() {
    this.setArchivedClient("pages.clients.ARCHIVE_PROMPT", true);
  }

  public unarchiveClient() {
    this.setArchivedClient("pages.clients.UNARCHIVE_PROMPT", false);
  }

  private setArchivedClient(dialogPrompt: string, isArchived: boolean) {
    this.subs.push(this.notifyDialogService.yesNoDialog(this.translateService.translate(dialogPrompt)).subscribe((ok: boolean) => {
      if (!ok)
        return;

      this.isLoadingArchive = true;
      this.subs.push(this.clientService.setArchived(this.client as Client, isArchived).subscribe({
        next: () => this.goBack(),
        error: (e: HttpErrorResponse) => this.isLoadingArchive = false
      }));
    }));
  }

  public addNewContact(type: ClientContactType) {
    if (this.client == null)
      return;

    if (this.client.contacts == null)
      this.client.contacts = [];

    var contact = new ClientContact();
    contact.type = type;

    this.client.contacts.push(contact);
  }

  public deleteContact(index: number) {
    this.client?.contacts?.splice(index, 1);
  }

  public moveContactUp(index: number) {
    if (index <= 0)
      return;

    var contact = this.client?.contacts?.splice(index, 1)[0];
    if (contact == null)
      return;

    this.client?.contacts?.splice(index - 1, 0, contact);
  }

  public openContact(contact: ClientContact) {
    openClientContactApp(contact.getDTO());
  }

  public getContactTypeIcon(type: ClientContactType): IconName {
    return getClientContactTypeIcon(type);
  }

  public goBack() {
    this.location.back();
  }

  public goToFilteredAppointments() {
    let filter = {
      client: this.client?.getDTO()
    }

    this.router.navigate(["appointments"], {
      queryParams: {
        filter: JSON.stringify(filter)
      }
    })
  }
}

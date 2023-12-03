import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ContextMenuComponent } from 'src/app/components/context-menu/context-menu.component';
import { SearchComponent } from 'src/app/components/search/search.component';
import { ToastService } from 'src/app/components/toast/toast.service';
import { TranslateService } from 'src/app/components/translate/translate.service';
import { Client, ClientDTO } from 'src/app/models/client';
import { ClientService } from '../../services/client.service';

@Component({
  selector: 'app-client-lookup',
  templateUrl: './client-lookup.component.html',
  styleUrls: ['./client-lookup.component.scss']
})
export class ClientLookupComponent implements OnInit, OnDestroy {

  @ViewChild(ContextMenuComponent) contextMenu?: ContextMenuComponent;
  @ViewChild(SearchComponent) search?: SearchComponent;

  private _value?: ClientDTO;
  @Input() set value(v: ClientDTO | undefined) {
    if (this._value == v)
      return;

    this._value = v;

    if (this.datasourceId != v?.id)
      this.setDatasource(v);
  }
  get value(): ClientDTO | undefined {
    return this._value;
  }

  @Input() showNewButton: boolean = true;
  @Input() showClearButton: boolean = false;

  @Output() valueChange: EventEmitter<ClientDTO> = new EventEmitter();

  @Output() clientSelected: EventEmitter<{ oldClient?: ClientDTO, newClient?: ClientDTO }> = new EventEmitter();

  datasourceId?: number;
  datasourceSub?: Subscription;

  clients?: Client[];
  filteredClients: Client[] = [];

  isLoadingNew: boolean = false;
  validationError: string | null = null;

  constructor(
    private router: Router,
    private clientService: ClientService,
    private toastService: ToastService,
    private translateService: TranslateService
  ) { }

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    if (this.datasourceSub != null) {
      this.datasourceSub.unsubscribe();
      this.datasourceSub = undefined;
    }
  }

  public load() {
    this.clientService.getAll().subscribe(s => this.clients = s);
  }

  private setDatasource(client: ClientDTO | undefined) {
    if (this.datasourceSub != null) {
      this.datasourceSub.unsubscribe();
      this.datasourceSub = undefined;
    }

    this.datasourceId = client?.id;
    this.clientChanged(client);

    if (client != null) {
      this.datasourceSub = this.clientService.getWithDatasource(client.id).subscribe(c => {
        this.clientChanged(c?.getDTO());
      });
    }
  }

  public selectClient(client: Client | undefined) {
    this.setDatasource(client);
  }

  private clientChanged(dto?: ClientDTO) {
    let old = this.value;
    this.value = dto;
    this.valueChange.emit(dto);
    this.clientSelected.emit({
      oldClient: old,
      newClient: dto
    });
  }

  addNew() {
    this.validationError = null;
    if (this.search?.search == null || this.search?.search == "") {
      this.validationError = "pages.clients.errors.MISSING_NICKNAME";
      return;
    }

    let client = new Client();
    client.nickname = this.search.search;

    this.isLoadingNew = true;
    this.clientService.addNew(client).subscribe({
      next: c => {
        this.isLoadingNew = false;
        this.selectClient(c);

        this.showAddNewSuccess(c);

        this.contextMenu?.close();
      },
      error: e => {
        this.isLoadingNew = false;
        this.validationError = client.getValidationErrors("nickname");
      }
    });
  }

  private showAddNewSuccess(client: Client) {
    this.toastService.show({
      text: this.translateService.translate("pages.clients.ADDED_SUCCESSFULY"),
      icon: ["far", "circle-check"],
      iconColor: "success",
      actions: [
        {
          text: this.translateService.translate("UNDO"),
          onClick: () => {
            this.clientService.delete(client.id).subscribe({
              next: () => {
                this.contextMenu?.open();
              }
            })
          }
        },
        {
          text: this.translateService.translate("EDIT"),
          onClick: () => {
            this.router.navigate(["clients", "edit", client.id]);
          }
        }
      ]
    });
  }

  goToClients() {
    this.router.navigate(["clients"]);
  }

  openContextMenu() {
    this.contextMenu?.toggle();
      this.search?.clearAndFocus();
    setTimeout(() => this.contextMenu?.container?.nativeElement.scrollTo({ top: 0 }));
  }

  clear() {
    this.value = undefined;
  }
}

import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Data, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { Client, ClientContact, ClientContactType } from 'src/app/models/client';
import { ClientService } from '../../services/client.service';
import { getClientContactTypeIcon, openClientContactApp } from '../../clients.module';
import { IconName } from '@fortawesome/fontawesome-svg-core';

@Component({
  selector: 'app-clients',
  templateUrl: './clients.component.html',
  styleUrls: ['./clients.component.scss']
})
export class ClientsComponent implements OnInit, OnDestroy {
  clients?: Client[] = undefined;
  filteredClients: Client[] = [];
  isArchive: boolean = false;

  private subs: Subscription[] = [];

  constructor(
    private activatedRoute: ActivatedRoute,
    private clientService: ClientService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.activatedRoute.data.subscribe((data: Data) => {
      if (data["archive"])
        this.isArchive = true;

      this.load();
    });
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  private load() {
    this.subs.push(this.clientService.getAll(this.isArchive).subscribe((s: Client[]) => this.clients = s));
  }

  public goToNew() {
    let relativeTo = this.activatedRoute;
    if (this.isArchive)
      relativeTo = relativeTo.parent as ActivatedRoute;

    this.router.navigate(["new"], { relativeTo: relativeTo });
  }

  public goToEdit(id: number) {
    let relativeTo = this.activatedRoute;
    if (this.isArchive)
      relativeTo = relativeTo.parent as ActivatedRoute;

    this.router.navigate(["edit", id], { relativeTo: relativeTo });
  }

  public toggleArchive() {
    if (this.isArchive)
      this.router.navigate([".."], { relativeTo: this.activatedRoute });
    else
      this.router.navigate(["archive"], { relativeTo: this.activatedRoute });
  }

  public openContact(contact: ClientContact) {
    openClientContactApp(contact.getDTO());
  }

  public getContactTypeIcon(type: ClientContactType): IconName {
    return getClientContactTypeIcon(type);
  }
}

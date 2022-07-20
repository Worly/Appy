import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { filter } from 'lodash';
import { Service, ServiceDTO } from 'src/app/models/service';
import { ServiceColorsService } from 'src/app/services/service-colors.service';
import { ServiceService } from 'src/app/services/service.service';

@Component({
  selector: 'app-service-lookup',
  templateUrl: './service-lookup.component.html',
  styleUrls: ['./service-lookup.component.scss']
})
export class ServiceLookupComponent implements OnInit {

  @Input() value?: ServiceDTO;
  @Output() valueChange: EventEmitter<ServiceDTO> = new EventEmitter();

  @Output() serviceSelected: EventEmitter<ServiceDTO> = new EventEmitter();

  services: Service[] = [];
  filteredServices: Service[] = [];

  private _search: string = "";
  set search(value: string) {
    if (this._search == value)
      return;

    this._search = value;

    this.applyFilter();
  }
  get search(): string {
    return this._search;
  }

  constructor(
    private serviceService: ServiceService,
    public serviceColorsService: ServiceColorsService
  ) { }

  ngOnInit(): void {
    this.load();
  }

  public load() {
    this.serviceService.getAll().subscribe(s => {
      this.services = s;
      this.applyFilter();
    });
  }

  public selectService(service: Service) {
    let dto = service.getDTO();

    this.value = dto;
    this.valueChange.emit(dto);
    this.serviceSelected.emit(dto);
  }

  private applyFilter() {
    if (this.search == null || this.search.trim() == "") {
      this.filteredServices = this.services;
      return;
    }

    this.filteredServices = [];

    let se = this.search?.trim().toLowerCase();

    for (let service of this.services) {
      if (service.name?.toLowerCase().includes(se))
        this.filteredServices.push(service);
    }
  }
}

import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { map, Observable } from "rxjs";
import { appConfig } from "../app.config";
import { Service, ServiceDTO } from "../models/service";

@Injectable({ providedIn: "root" })
export class ServiceService {
    constructor(private http: HttpClient) { }

    public getAll(): Observable<Service[]> {
        return this.http.get<ServiceDTO[]>(appConfig.apiUrl + "service/getAll")
            .pipe(map(services => services.map(s => new Service(s))));
    }

    public get(id: number): Observable<Service> {
        return this.http.get<ServiceDTO>(appConfig.apiUrl + "service/get/" + id)
            .pipe(map(s => new Service(s)));
    }

    public addNew(service: Service): Observable<Service> {
        return this.http.post<ServiceDTO>(appConfig.apiUrl + "service/addNew", service.getDTO())
            .pipe(map(s => new Service(s)));
    }

    public save(service: Service): Observable<Service> {
        return this.http.put<ServiceDTO>(appConfig.apiUrl + "service/edit/" + service.id, service.getDTO())
            .pipe(map(s => new Service(s)));
    }

    public delete(id: number): Observable<void> {
        return this.http.delete<void>(appConfig.apiUrl + "service/delete/" + id);
    }
}
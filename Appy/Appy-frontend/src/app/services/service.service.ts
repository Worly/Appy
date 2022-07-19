import { HttpClient } from "@angular/common/http";
import { Injectable, Injector } from "@angular/core";
import { map, Observable } from "rxjs";
import { appConfig } from "../app.config";
import { Service, ServiceDTO } from "../models/service";
import { BaseModelService } from "./base-model-service";

@Injectable({ providedIn: "root" })
export class ServiceService extends BaseModelService<Service> {
    constructor(injector: Injector) {
        super(injector, "service", Service);
    }
}
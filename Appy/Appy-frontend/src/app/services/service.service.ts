import { Injectable, Injector } from "@angular/core";
import { Service } from "../models/service";
import { BaseModelService } from "./base-model-service";

@Injectable({ providedIn: "root" })
export class ServiceService extends BaseModelService<Service> {
    constructor(injector: Injector) {
        super(injector, "service", Service);
    }
}
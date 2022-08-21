import { Injectable, Injector } from "@angular/core";
import { Service } from "src/app/models/service";
import { BaseModelService } from "src/app/shared/services/base-model-service";

@Injectable()
export class ServiceService extends BaseModelService<Service> {
    constructor(injector: Injector) {
        super(injector, "service", Service);
    }
}
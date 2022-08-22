import { Injectable } from "@angular/core";
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from "@angular/router";
import { Observable } from "rxjs";
import { FacilityService } from "./facility.service";

@Injectable({ providedIn: "root" })
export class SelectedFacilityGuard implements CanActivate {
    constructor(private facilityService: FacilityService, private router: Router) { }

    public canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree | Observable<boolean | UrlTree> | Promise<boolean | UrlTree> {
        if (this.facilityService.getSelected() == null)
            return this.router.createUrlTree(["/facilities"]);

        return true;
    }
}
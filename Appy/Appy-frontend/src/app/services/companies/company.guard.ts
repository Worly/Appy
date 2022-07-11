import { Injectable } from "@angular/core";
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from "@angular/router";
import { Observable } from "rxjs";
import { CompanyService } from "./company.service";

@Injectable({ providedIn: "root" })
export class SelectedCompanyGuard implements CanActivate {
    constructor(private companyService: CompanyService, private router: Router) { }

    public canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree | Observable<boolean | UrlTree> | Promise<boolean | UrlTree> {
        if (this.companyService.getSelected() == null)
            return this.router.createUrlTree(["/companies"]);

        return true;
    }
}
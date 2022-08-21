import { Injectable } from "@angular/core";
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from "@angular/router";
import { Observable } from "rxjs";
import { AuthService } from "./auth.service";

@Injectable({ providedIn: "root" })
export class LoggedInGuard implements CanActivate {
    constructor(private authService: AuthService, private router: Router) { }

    public canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree | Observable<boolean | UrlTree> | Promise<boolean | UrlTree> {
        if (!this.authService.isLoggedIn())
            return this.router.createUrlTree(["/login"]);

        return true;
    }
}

@Injectable({ providedIn: "root" })
export class NotLoggedInGuard implements CanActivate {
    constructor(private authService: AuthService, private router: Router) { }

    public canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree | Observable<boolean | UrlTree> | Promise<boolean | UrlTree> {
        return !this.authService.isLoggedIn();
    }
}
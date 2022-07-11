import { HttpClient } from "@angular/common/http";
import { Injectable, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { appConfig } from "src/app/app.config";
import jwt_decode from "jwt-decode";
import { CompanyService } from "../companies/company.service";

@Injectable({ providedIn: "root" })
export class AuthService {
    private readonly TOKEN_KEY = "JWT_TOKEN";

    private token: string;

    constructor(private router: Router, private httpClient: HttpClient, private companyService: CompanyService) {
    }

    public loadFromLocalStorage(): Observable<void> {
        return new Observable<void>(s => {
            var obs = this.setToken(localStorage.getItem(this.TOKEN_KEY));
            if (!obs)
                s.next();

            obs.subscribe({
                next: () => s.next(),
                error: () => s.error()
            });
        });
    }

    public logIn(email: string, password: string): Observable<void> {
        return new Observable<void>(s => {
            this.httpClient.post<any>(appConfig.apiUrl + "user/login", {
                email: email,
                password: password,
            }).subscribe({
                next: o => {
                    this.setToken(o.token).subscribe({
                        next: () => s.next(),
                        error: o => {
                            this.logOut();
                            s.error(o)
                        }
                    });
                },
                error: o => s.error(o)
            });
        });
    }

    public register(email: string, username: string, password: string): Observable<void> {
        return new Observable<void>(s => {
            this.httpClient.post<any>(appConfig.apiUrl + "user/register", {
                email: email,
                username: username,
                password: password
            }).subscribe({
                next: o => {
                    this.setToken(o.token).subscribe({
                        next: () => s.next(),
                        error: o => {
                            this.logOut();
                            s.error(o)
                        }
                    });
                },
                error: o => s.error(o)
            });
        });
    }

    private setToken(token: string): Observable<void> {
        if (token == null) {
            this.logOut();
            return null;
        }

        this.token = token;
        localStorage.setItem(this.TOKEN_KEY, token);

        return <any>this.companyService.loadMy();
    }

    public getToken(): string {
        return this.token;
    }

    public isLoggedIn(): boolean {
        return this.token != null;
    }

    public logOut(): void {
        this.token = null;
        localStorage.removeItem(this.TOKEN_KEY);
        this.companyService.clear();
        this.router.navigate(["login"]);
    }

    public getUsername(): string {
        if (!this.isLoggedIn())
            return null;

        var decoded = <any>jwt_decode(this.token);
        return decoded.username;
    }
}
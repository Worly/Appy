import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Router } from "@angular/router";
import { Observable } from "rxjs";
import { appConfig } from "src/app/app.config";
import jwt_decode from "jwt-decode";
import { FacilityService } from "src/app/pages/facilities/services/facility.service";

@Injectable({ providedIn: "root" })
export class AuthService {
    private readonly ACCESS_TOKEN_KEY = "ACCESS_TOKEN";
    private readonly REFRESH_TOKEN_KEY = "REFRESH_TOKEN";

    private accessToken: string | null = null;
    private refreshToken: string | null = null;

    constructor(private router: Router, private httpClient: HttpClient, private facilityService: FacilityService) {
    }

    public loadFromLocalStorage(): Observable<void> {
        return new Observable<void>(s => {
            var accessToken = localStorage.getItem(this.ACCESS_TOKEN_KEY) as string;
            var refreshToken = localStorage.getItem(this.REFRESH_TOKEN_KEY) as string;

            var obs = this.setTokens(accessToken, refreshToken);
            if (!obs)
                s.next();

            obs?.subscribe({
                next: () => s.next(),
                error: (e: any) => s.error(e)
            });
        });
    }

    public logIn(email: string, password: string): Observable<void> {
        return new Observable<void>(s => {
            this.httpClient.post<any>(appConfig.apiUrl + "user/login", {
                email: email,
                password: password,
            }).subscribe({
                next: (o: any) => {
                    this.setTokens(o.accessToken, o.refreshToken)?.subscribe({
                        next: () => s.next(),
                        error: (o: any) => {
                            this.logOut();
                            s.error(o)
                        }
                    });
                },
                error: (o: any) => s.error(o)
            });
        });
    }

    public register(email: string, name: string, surname: string, password: string): Observable<void> {
        return new Observable<void>(s => {
            this.httpClient.post<any>(appConfig.apiUrl + "user/register", {
                email: email,
                name: name,
                surname: surname,
                password: password
            }).subscribe({
                next: (o: any) => {
                    this.setTokens(o.accessToken, o.refreshToken)?.subscribe({
                        next: () => s.next(),
                        error: (o: any) => {
                            this.logOut();
                            s.error(o)
                        }
                    });
                },
                error: (o: any) => s.error(o)
            });
        });
    }

    public refreshTokens(): Observable<string> {
        return new Observable<string>(s => {
            this.httpClient.post<any>(appConfig.apiUrl + "user/refresh", {
                refreshToken: this.refreshToken
            }).subscribe({
                next: (o: any) => {
                    this.setTokens(o.accessToken, o.refreshToken, false);
                    s.next(o.accessToken);
                },
                error: (o: any) => s.error(o)
            });
        });
    }

    private setTokens(accessToken: string, refreshToken: string, loadFacilities: boolean = true): Observable<void> | null {
        if (accessToken == null) {
            this.logOut();
            return null;
        }

        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        localStorage.setItem(this.ACCESS_TOKEN_KEY, accessToken);
        localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);

        if (loadFacilities)
            return <any>this.facilityService.loadMy();
        return null;
    }

    public getAccessToken(): string | null {
        return this.accessToken;
    }

    public getRefreshToken(): string | null {
        return this.refreshToken;
    }

    public isLoggedIn(): boolean {
        return this.accessToken != null;
    }

    public logOut(): void {
        this.accessToken = null;
        this.refreshToken = null;
        localStorage.removeItem(this.ACCESS_TOKEN_KEY);
        localStorage.removeItem(this.REFRESH_TOKEN_KEY);
        this.facilityService.clear();
        this.router.navigate(["login"]);
    }

    public getName(): { name: string, surname: string } | null {
        if (!this.isLoggedIn())
            return null;

        var decoded = <any>jwt_decode(this.accessToken as string);
        return { name: decoded.name, surname: decoded.surname };
    }
}
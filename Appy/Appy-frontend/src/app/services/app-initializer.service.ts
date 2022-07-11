import { Injectable } from "@angular/core";
import { AuthService } from "./auth/auth.service";

@Injectable({ providedIn: "root" })
export class AppInitializerService {
    constructor(private authService: AuthService) { }

    public initialize(): Promise<void> {
        return new Promise((reslove, reject) => {
            
            this.authService.loadFromLocalStorage().subscribe({
                next: () => reslove(),
                error: e => reject(e)
            });

        });
    }
}
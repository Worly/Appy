import { isDevMode } from "@angular/core";

export var appConfig = {
    get apiUrl(): string {
        if (isDevMode())
            return "https://localhost:5001/";
        else
            return "/";
    },

    get homePage(): string {
        return "appointments"
    }
};
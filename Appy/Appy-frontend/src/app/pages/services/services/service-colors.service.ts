import { Injectable } from "@angular/core";
import { ColorSchemeService } from "src/app/services/color-scheme.service";
import colorConvert from "color-convert";

@Injectable({ providedIn: "root" })
export class ServiceColorsService {
    private colors: ServiceColor[] = [
        { id: 0, color: "#FFB5E8" },
        { id: 1, color: "#FF9CEE" },
        { id: 2, color: "#FFCCF9" },
        { id: 3, color: "#FCC2FF" },
        { id: 4, color: "#F6A6FF" },
        { id: 5, color: "#B28DFF" },
        { id: 6, color: "#C5A3FF" },
        { id: 7, color: "#D5AAFF" },
        { id: 8, color: "#ECD4FF" },
        { id: 9, color: "#FBE4FF" },
        { id: 10, color: "#DCD3FF" },
        { id: 11, color: "#A79AFF" },
        { id: 12, color: "#B5B9FF" },
        { id: 13, color: "#97A2FF" },
        { id: 14, color: "#AFCBFF" },
        { id: 15, color: "#AFF8DB" },
        { id: 16, color: "#C4FAF8" },
        { id: 17, color: "#85E3FF" },
        { id: 18, color: "#ACE7FF" },
        { id: 19, color: "#6EB5FF" },
        { id: 20, color: "#BFFCC6" },
        { id: 21, color: "#DBFFD6" },
        { id: 22, color: "#F3FFE3" },
        { id: 23, color: "#E7FFAC" },
        { id: 24, color: "#FFFFD1" },
        { id: 25, color: "#FFC9DE" },
        { id: 26, color: "#FFABAB" },
        { id: 27, color: "#FFBEBC" },
        { id: 28, color: "#FFCBC1" },
        { id: 29, color: "#FFF5BA" }
    ];

    private missingColor: ServiceColor = { id: -1, color: "#FFFFFF" };

    constructor(private colorSchemeService: ColorSchemeService) {}

    public get(colorId?: number): string {
        let color = this.colors.find(c => c.id == colorId)?.color ?? this.missingColor.color;

        return this.darkenIfDarkMode(color);
    }

    public getAll(): ServiceColor[] {
        return this.colors.map(c => {
            return {
                id: c.id,
                color: this.darkenIfDarkMode(c.color)
            }
        });
    }

    private darkenIfDarkMode(color: string): string {
        if (this.colorSchemeService.isDark()) {
            var hslColor = colorConvert.hex.hsv(color);
            hslColor[1] *= 1.2;
            hslColor[2] *= 0.7;
            color = "#" + colorConvert.hsv.hex(hslColor);
        }

        return color;
    }
}

export type ServiceColor = {
    id: number;
    color: string;
}
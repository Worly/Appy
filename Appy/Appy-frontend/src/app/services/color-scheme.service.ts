import { Injectable, Renderer2, RendererFactory2 } from "@angular/core";

export type ColorScheme = "light" | "dark" |"follow-os";

@Injectable({ providedIn: "root" })
export class ColorSchemeService {
    private _colorScheme: ColorScheme = "follow-os";
    public get colorScheme(): ColorScheme {
        return this._colorScheme;
    }
    public set colorScheme(value: ColorScheme) {
        if (value == this._colorScheme)
            return;

        this._colorScheme = value;

        localStorage.setItem(this.colorSchemeLocalStorageKey, value);
        this.renderer.setAttribute(document.firstElementChild, this.colorSchemeAttributeName, value);
    }

    private renderer: Renderer2;

    private colorSchemeAttributeName = "color-scheme";
    private colorSchemeLocalStorageKey = "COLOR_SCHEME";

    constructor(rendererFactory: RendererFactory2) {
        this.renderer = rendererFactory.createRenderer(null, null);

        this.colorScheme = <ColorScheme>localStorage.getItem(this.colorSchemeLocalStorageKey) ?? "follow-os";
    }

    public isDark(): boolean {
        switch (this.colorScheme) {
            case "dark":
                return true;
            case "light":
                return false;
            case "follow-os":
                return window.matchMedia("(prefers-color-scheme: dark)").matches;
        }
    }
}
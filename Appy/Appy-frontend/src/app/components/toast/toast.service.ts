import { Overlay, OverlayRef } from "@angular/cdk/overlay";
import { ComponentPortal } from "@angular/cdk/portal";
import { Injectable } from "@angular/core";
import { IconProp } from "@fortawesome/fontawesome-svg-core";
import { TranslateService } from "../translate/translate.service";
import { ToastComponent } from "./toast.component";

@Injectable()
export class ToastService {
    constructor(private overlay: Overlay, private translateService: TranslateService) {

    }

    private createToast(): [OverlayRef, ToastComponent] {
        let overlayRef = this.overlay.create({
            positionStrategy: this.overlay.position()
                .global()
                .centerHorizontally()
                .bottom("40px")
        });

        let wrapper = overlayRef.overlayElement.parentElement;
        if (wrapper != null)
            wrapper.style.zIndex = "99999";

        return [overlayRef, overlayRef.attach(new ComponentPortal(ToastComponent)).instance];
    }

    public show(text: string): void;
    public show(options: ToastOptions): void;
    public show(arg: string | ToastOptions): void {
        if (typeof arg == "string")
            arg = { text: arg };

        let [overlayRef, toastComponent] = this.createToast();

        let hidden = false;

        arg.actions?.forEach(a => {
            let original = a.onClick;
            a.onClick = function () {
                if (!hidden)
                    toastComponent.hide().subscribe(() => overlayRef.dispose());
                hidden = true;

                original();
            }
        });

        toastComponent.text = arg.text;
        toastComponent.icon = arg.icon;
        toastComponent.iconColor = arg.iconColor;
        toastComponent.customIconColor = arg.customIconColor;
        toastComponent.actions = arg.actions;

        let duration = arg.text.split(" ").length / 2 * 1000;
        if (duration < 2000)
            duration = 2000;

        if (arg.actions != null)
            duration += arg.actions.length * 1000;

        toastComponent.show();

        setTimeout(() => {
            if (!hidden)
                toastComponent.hide().subscribe(() => overlayRef.dispose());
            hidden = true;
        }, duration);
    }
}

export type ToastOptions = {
    text: string,
    icon?: IconProp,
    iconColor?: "success" | "danger" | "warning" | "normal" | "custom";
    customIconColor?: string;
    actions?: {
        text: string;
        onClick: (() => void);
    }[];
}
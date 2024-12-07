import { Overlay, OverlayRef } from "@angular/cdk/overlay";
import { ComponentPortal } from "@angular/cdk/portal";
import { Injectable } from "@angular/core";
import { IconName, IconProp } from "@fortawesome/fontawesome-svg-core";
import { ToastComponent } from "./toast.component";

@Injectable()
export class ToastService {
    constructor(private overlay: Overlay) { }

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
        var hide = () => {
            if (!hidden)
                toastComponent.hide().subscribe(() => overlayRef.dispose());
            hidden = true;
        }

        let autoClose = true;

        let actions = arg.actions?.map(a => {
            let action = {
                text: a.text,
                icon: a.icon,
                onClick: () => { },
                isLoading: false
            };

            let original = a.onClick;
            action.onClick = function () {
                if (original.length == 0) {
                    hide();
                }
                else {
                    autoClose = false;
                    action.isLoading = true;
                }

                original(hide);
            }

            return action;
        });

        toastComponent.text = arg.text;
        toastComponent.icon = arg.icon;
        toastComponent.iconColor = arg.iconColor;
        toastComponent.customIconColor = arg.customIconColor;
        toastComponent.actions = actions;

        let duration = arg.text.split(" ").length / 2 * 1000;
        if (duration < 2000)
            duration = 2000;

        if (arg.actions != null)
            duration += arg.actions.length * 1000;

        toastComponent.show();

        setTimeout(() => {
            if (!autoClose)
                return;

            hide();
        }, duration);
    }
}

export type ToastOptions = {
    text: string,
    icon?: IconProp,
    iconColor?: "success" | "danger" | "warning" | "normal" | "custom";
    customIconColor?: string;
    actions?: ToastAction[];
}

export type ToastAction = {
    text: string;
    icon?: IconName;
    onClick: (() => void) | ((closeToast: () => void) => void);
}
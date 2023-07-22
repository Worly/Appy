import { Overlay, OverlayRef } from "@angular/cdk/overlay";
import { ComponentPortal } from "@angular/cdk/portal";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { TranslateService } from "../translate/translate.service";
import { NotifyDialogComponent } from "./notify-dialog.component";

@Injectable()
export class NotifyDialogService {
    constructor(private overlay: Overlay, private translateService: TranslateService) {

    }

    private createDialog(): [OverlayRef, NotifyDialogComponent] {
        let overlayRef = this.overlay.create({
            positionStrategy: this.overlay.position()
                .global()
                .centerHorizontally()
                .centerVertically(),
            hasBackdrop: true,
            disposeOnNavigation: true
        });

        return [overlayRef, overlayRef.attach(new ComponentPortal(NotifyDialogComponent)).instance];
    }

    public yesNoDialog(text: string): Observable<boolean> {
        return new Observable<boolean>(s => {
            let [overlayRef, dialog] = this.createDialog();
            
            dialog.text = text;
            dialog.buttons = [
                {
                    text: this.translateService.translate("NO"),
                    look: "solid",
                    color: "danger",
                    onClick: () => {
                        s.next(false);
                        overlayRef.dispose();
                    }
                },
                {
                    text: this.translateService.translate("YES"),
                    look: "solid",
                    color: "success",
                    onClick: () => {
                        s.next(true),
                        overlayRef.dispose();
                    }
                }
            ];
        });
    }
}
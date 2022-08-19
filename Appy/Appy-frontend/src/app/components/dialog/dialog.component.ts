import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { AfterViewInit, Component, Input, OnInit, TemplateRef, ViewChild, ViewContainerRef } from '@angular/core';

@Component({
  selector: 'app-dialog',
  templateUrl: './dialog.component.html',
  styleUrls: ['./dialog.component.css']
})
export class DialogComponent implements OnInit {

  @ViewChild("template") template?: TemplateRef<any>;

  @Input() showCloseButton: boolean = true;

  private _isOpen: boolean = false;
  public get isOpen(): boolean {
    return this._isOpen;
  }

  overlayRef?: OverlayRef;

  constructor(private overlay: Overlay, private viewContainerRef: ViewContainerRef) { }

  ngOnInit(): void {
  }

  open() {
    this.close();

    this.overlayRef = this.overlay.create({
      positionStrategy: this.overlay.position()
        .global()
        .centerHorizontally()
        .centerVertically(),
      hasBackdrop: true,
      disposeOnNavigation: true
    });

    this.overlayRef.attach(new TemplatePortal(this.template as TemplateRef<any>, this.viewContainerRef));

    this._isOpen = true;
  }

  close() {
    this.overlayRef?.dispose();
    this.overlayRef = undefined;
    this._isOpen = false;
  }
}

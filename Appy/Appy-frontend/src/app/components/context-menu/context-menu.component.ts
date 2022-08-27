import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { ChangeDetectorRef, Component, ContentChildren, ElementRef, Input, OnDestroy, OnInit, QueryList, TemplateRef, ViewChild, ViewContainerRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { ButtonComponent } from '../button/button.component';

@Component({
  selector: 'app-context-menu',
  templateUrl: './context-menu.component.html',
  styleUrls: ['./context-menu.component.css']
})
export class ContextMenuComponent implements OnInit, OnDestroy {

  @ViewChild("template") template?: TemplateRef<any>;
  @ViewChild("container") container?: ElementRef<HTMLElement>;
  @ContentChildren(ButtonComponent) set buttons(buttons: QueryList<ButtonComponent>) {
    setTimeout(() => {
      if (buttons) {
        for (let button of buttons) {
          button.curved = false;
          button.curvedBottomLeft = false;
          button.curvedBottomRight = false;
          button.curvedTopLeft = false;
          button.curvedTopRight = false;
          button.width = "100%"
          this.subs.push(button.onClick.subscribe(() => this.close()));
        }
        if (buttons.length > 0) {
          buttons.first.curvedTopLeft = true;
          buttons.first.curvedTopRight = true;

          buttons.last.curvedBottomLeft = true;
          buttons.last.curvedBottomRight = true;
        }
      }
    });
  }

  @Input()
  relativeTo?: ElementRef;

  @Input()
  copyOriginWidth: boolean = false;

  overlayRef?: OverlayRef;
  keepOpen: boolean = false;
  keepClosed: boolean = false;

  private subs: Subscription[] = [];

  constructor(
    private changeDetector: ChangeDetectorRef,
    private viewContainerRef: ViewContainerRef,
    private overlay: Overlay) { }

  ngOnInit(): void {
    document.addEventListener("click", this.hideDropdown, true);
  }

  ngOnDestroy(): void {
    document.removeEventListener("click", this.hideDropdown, true);

    if (this.overlayRef != null)
      this.close();

    this.subs.forEach(s => s.unsubscribe());
  }

  public open(): void {
    this.overlayRef = this.overlay.create({
      positionStrategy: this.overlay
        .position()
        .flexibleConnectedTo(this.relativeTo as ElementRef<any>)
        .withPush(true)
        .withFlexibleDimensions(true)
        .withGrowAfterOpen(true)
        .withViewportMargin(10)
        .withPositions([
          {
            originX: "end",
            originY: "bottom",
            overlayX: "end",
            overlayY: "top",
            offsetX: -10
          },
          {
            originX: "end",
            originY: "top",
            overlayX: "end",
            overlayY: "bottom",
            offsetX: -10
          }
        ]),
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
      minHeight: 5,
      width: this.copyOriginWidth ? this.relativeTo?.nativeElement.offsetWidth : null
    });
    this.overlayRef.attach(new TemplatePortal(this.template as TemplateRef<any>, this.viewContainerRef));

    this.keepOpen = true;
    setTimeout(() => this.keepOpen = false, 10);
  }

  public close(): void {
    if (this.overlayRef == null)
      return;

    this.overlayRef.dispose();
    this.overlayRef = undefined;

    this.keepClosed = true;
    setTimeout(() => this.keepClosed = false, 10);
  }

  public toggle(): void {
    if (this.overlayRef == null) {
      if (!this.keepClosed)
        this.open();
    }
    else
      this.close();
  }

  public isOpen(): boolean {
    return this.overlayRef != null;
  }

  hideDropdown = (event: any) => {
    if (this.overlayRef == null)
      return;

    if (this.keepOpen)
      return;

    if (!this.overlayRef.overlayElement.contains(event.target))
      this.close();
  }

}
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
          this.subs.push(button.onClick.subscribe(() => this.closeOnButtonClick && this.close()));
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

  @Input() relativeTo?: ElementRef;
  @Input() copyOriginWidth: boolean = false;
  @Input() viewportMargin: number = 0;
  @Input() closeOnButtonClick: boolean = true;

  // When true, the menu opens as a centered full-screen modal on mobile-width
  // viewports instead of a button-anchored dropdown. Avoids the CDK reposition
  // jank when the on-screen keyboard shrinks the viewport (issue #26).
  @Input() fullscreenOnMobile: boolean = false;

  // Matches the app's mobile breakpoint (see action-bar.component.ts / app.component.scss).
  private static readonly MOBILE_MAX_WIDTH = 992;

  overlayRef?: OverlayRef;
  isFullscreen: boolean = false;
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
    this.isFullscreen = this.fullscreenOnMobile && window.innerWidth < ContextMenuComponent.MOBILE_MAX_WIDTH;

    this.overlayRef = this.isFullscreen
      ? this.overlay.create({
        // Centered modal: no trigger-relative positioning, so the on-screen
        // keyboard has nothing to reposition. Backdrop dims the page and
        // blocking the background scroll completes the modal feel.
        positionStrategy: this.overlay.position().global().centerHorizontally().centerVertically(),
        scrollStrategy: this.overlay.scrollStrategies.block(),
        hasBackdrop: true,
      })
      : this.overlay.create({
        positionStrategy: this.overlay
          .position()
          .flexibleConnectedTo(this.relativeTo as ElementRef<any>)
          .withPush(true)
          .withFlexibleDimensions(true)
          .withGrowAfterOpen(true)
          .withViewportMargin(this.viewportMargin)
          .withPositions([
            {
              originX: "end",
              originY: "bottom",
              overlayX: "end",
              overlayY: "top"
            },
            {
              originX: "end",
              originY: "top",
              overlayX: "end",
              overlayY: "bottom"
            }
          ]),
        scrollStrategy: this.overlay.scrollStrategies.reposition(),
        minHeight: 5,
        minWidth: this.copyOriginWidth ? this.relativeTo?.nativeElement.offsetWidth : null,
      });
    this.overlayRef.attach(new TemplatePortal(this.template as TemplateRef<any>, this.viewContainerRef));

    if (this.isFullscreen)
      this.subs.push(this.overlayRef.backdropClick().subscribe(() => this.close()));

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
import { AfterViewInit, ChangeDetectorRef, Component, ContentChildren, ElementRef, HostListener, Input, OnDestroy, OnInit, QueryList, TemplateRef, ViewChild } from '@angular/core';
import { GlobalPosition, InsidePlacement, OutsidePlacement, RelativePosition, Toppy, ToppyControl } from 'toppy';
import { ButtonComponent } from '../button/button.component';

@Component({
  selector: 'app-context-menu',
  templateUrl: './context-menu.component.html',
  styleUrls: ['./context-menu.component.css']
})
export class ContextMenuComponent implements OnInit, OnDestroy, AfterViewInit {

  @ViewChild("template") template: TemplateRef<any>;
  @ContentChildren(ButtonComponent) buttons: QueryList<ButtonComponent>;

  @Input()
  relativeTo: ElementRef;

  toppyControl: ToppyControl;
  keepOpen: boolean;

  constructor(private changeDetector: ChangeDetectorRef, private toppy: Toppy) { }

  ngOnInit(): void {
    document.addEventListener("click", this.hideDropdown, true);
  }

  ngOnDestroy(): void {
    document.removeEventListener("click", this.hideDropdown, true);

    if (this.toppyControl != null)
      this.toppyControl.close();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      for (let button of this.buttons) {
        button.curved = false;
        button.width = "100%"
        button.onClick.subscribe(() => this.toppyControl.close());
      }

      this.buttons.first.curvedTopLeft = true;
      this.buttons.first.curvedTopRight = true;

      this.buttons.last.curvedBottomLeft = true;
      this.buttons.last.curvedBottomRight = true;
    });

    this.toppyControl = this.toppy
      .position(new RelativePosition({
        src: this.relativeTo.nativeElement,
        placement: OutsidePlacement.BOTTOM_RIGHT
      }))
      .config({
        wrapperClass: "overflow-visible"
      })
      .content(this.template)
      .create();
  }

  public open(): void {
    this.toppyControl.open();
    this.keepOpen = true;

    setTimeout(() => this.keepOpen = false, 10);
  }

  hideDropdown = (event: any) => {
    if (this.toppyControl?.compRef?.instance?.wrapperEl?.firstElementChild == null)
      return;

    if (this.keepOpen)
      return;

    if (this.toppyControl.open && !this.toppyControl.compRef.instance.wrapperEl.firstElementChild.contains(event.target)) {
      this.toppyControl.close();
    }
  }

}
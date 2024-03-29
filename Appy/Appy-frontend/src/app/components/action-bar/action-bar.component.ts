import { Component, ContentChild, ElementRef, HostListener, Input, OnInit, ViewChild } from '@angular/core';
import { ActionDropdownComponent } from '../action-dropdown/action-dropdown.component';

@Component({
  selector: 'app-action-bar',
  templateUrl: './action-bar.component.html',
  styleUrls: ['./action-bar.component.scss']
})
export class ActionBarComponent implements OnInit {

  private _container?: ElementRef<HTMLElement>;
  @ViewChild("container", { read: ElementRef<HTMLElement> }) set container(value: ElementRef<HTMLElement> | undefined) {
    if (this._container == value)
      return;

    this._container = value;

    setTimeout(() => this.calculateContentHeight());
  }
  get container(): ElementRef<HTMLElement> | undefined {
    return this._container;
  }

  @ContentChild(ActionDropdownComponent) set actionDropdown(value: ActionDropdownComponent) {
    if (value == null)
      return;
      
    let element = value.elementRef.nativeElement;

    element.style.marginTop = "-10px";
    element.style.marginBottom = "-10px";
    element.style.marginLeft = "-15px";
    element.style.width = "55px";
  }

  @Input() floatAlways: boolean = false;

  @Input() leaveSpaceWhenAnchored: boolean = true;
  @Input() compact: boolean = false;

  private shouldFloat: boolean = false;

  public get isFloating(): boolean {
    return this.floatAlways || this.shouldFloat;
  }

  contentHeight: number = 0;

  constructor() { }

  ngOnInit(): void {
    this.recheckFloating();
  }

  calculateContentHeight() {
    if (this._container?.nativeElement == null) {
      this.contentHeight = 0;
      return;
    }

    this.contentHeight = this._container.nativeElement.getBoundingClientRect().height - 10;
  }

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.recheckFloating();
  }

  private recheckFloating() {
    this.shouldFloat = window.innerWidth < 992;
  }

}

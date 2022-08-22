import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';

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

  @Input() leaveSpaceWhenAnchored: boolean = true;
  @Input() compact: boolean = false;

  contentHeight: number = 0;

  constructor() { }

  ngOnInit(): void {
  }

  calculateContentHeight() {
    if (this._container?.nativeElement == null) {
      this.contentHeight = 0;
      return;
    }

    this.contentHeight = this._container.nativeElement.getBoundingClientRect().height - 10;
  }

}

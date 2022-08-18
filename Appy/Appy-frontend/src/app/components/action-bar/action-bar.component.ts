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
  }
  get container(): ElementRef<HTMLElement> | undefined {
    return this._container;
  }

  @Input() leaveSpaceWhenAnchored: boolean = true;

  get contentHeight(): number {
    if (this._container?.nativeElement == null)
      return 0;

    return this._container.nativeElement.getBoundingClientRect().height;
  }

  constructor() { }

  ngOnInit(): void {
  }

}

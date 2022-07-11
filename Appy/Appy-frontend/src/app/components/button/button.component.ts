import { Component, ElementRef, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { IconName, IconPrefix } from '@fortawesome/fontawesome-svg-core';

@Component({
  selector: 'app-button',
  templateUrl: './button.component.html',
  styleUrls: ['./button.component.scss']
})
export class ButtonComponent implements OnInit {

  @Input()
  text: string;

  @Input()
  curved: boolean = true;

  @Input() curvedTopLeft: boolean = false;
  @Input() curvedTopRight: boolean = false;
  @Input() curvedBottomLeft: boolean = false;
  @Input() curvedBottomRight: boolean = false;

  @Input()
  look: "solid" | "outlined" | "normal" | "transparent" = "normal";

  @Input()
  color: "success" | "danger" | "normal" = "normal";

  @Input()
  borderStyle: "solid" | "dashed" | "dotted" | "double" = "solid";

  @Input()
  borderWidth: string = "2px";

  @Input()
  alignContent: "left" | "center" | "right" = "left";

  @Input()
  disabled: boolean = false;

  @Input()
  set width(width: string) {
    this.elementRef.nativeElement.style.width = width;
  }

  @Input()
  iconPrefix: IconPrefix = "fas";

  @Input()
  icon: IconName;

  @Input()
  iconPlacement: "left" | "right" = "left";

  @Input()
  loadingIcon: IconName = "spinner";

  @Input()
  spinIcon: boolean = false;

  @Input()
  isCircle: boolean = true;

  @Input()
  isLoading: boolean = false;

  @Output()
  onClick = new EventEmitter();

  constructor(private elementRef: ElementRef) { }

  ngOnInit(): void {
  }

  onClicked(event: Event): void {
    if (this.disabled)
      return;

    event.stopPropagation();

    this.onClick.emit();
  }

}

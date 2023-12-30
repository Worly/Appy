import { Component, ElementRef, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { IconName, IconPrefix } from '@fortawesome/fontawesome-svg-core';

@Component({
  selector: 'app-button',
  templateUrl: './button.component.html',
  styleUrls: ['./button.component.scss']
})
export class ButtonComponent implements OnInit {

  @Input() text: string | null = null;

  @Input() curved: boolean = true;
  @Input() curvedTopLeft: boolean = false;
  @Input() curvedTopRight: boolean = false;
  @Input() curvedBottomLeft: boolean = false;
  @Input() curvedBottomRight: boolean = false;

  @Input() look: "solid" | "outlined" | "normal" | "transparent" | "custom" = "normal";
  @Input() color: "success" | "danger" | "warning" | "normal" = "normal";

  @Input() customColor: string = "#FFFFFF";
  @Input() customTextColor: string = "black";
  @Input() customBorderColor: string = "black";

  @Input() borderStyle: "solid" | "dashed" | "dotted" | "double" = "solid";
  @Input() borderWidth: string = "2px";

  @Input() alignContent: "left" | "center" | "right" = "left";
  @Input() textAlign: "left" | "center" | "rigth" = "left";

  @Input() disabled: boolean = false;

  @Input()
  set width(width: string) {
    this.elementRef.nativeElement.style.width = width;
  }

  @Input() iconPrefix: IconPrefix = "fas";

  @Input() icon?: IconName;

  @Input() iconPlacement: "left" | "right" = "left";

  @Input() loadingIcon: IconName = "spinner";

  @Input() spinIcon: boolean = false;

  @Input() isCircle: boolean = false;

  @Input() isLoading: boolean = false;

  @Output() onClick = new EventEmitter();

  constructor(public elementRef: ElementRef) { }

  ngOnInit(): void {
  }

  onClicked(event: Event): void {
    if (this.disabled)
      return;

    event.stopPropagation();

    this.onClick.emit();
  }

}

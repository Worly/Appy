import { Overlay } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-notify-dialog',
  templateUrl: './notify-dialog.component.html',
  styleUrls: ['./notify-dialog.component.scss']
})
export class NotifyDialogComponent implements OnInit {

  public text: string = "";
  public buttons: {
    text: string,
    look: "solid" | "outlined" | "normal" | "transparent",
    color: "success" | "danger" | "normal",
    onClick: () => void
  }[] = []

  constructor() { }

  ngOnInit(): void {
  }

  buttonClicked(button: {onClick: (() => void)}) {
    button.onClick();
  }
}

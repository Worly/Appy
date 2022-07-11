import { AfterViewInit, Component, Input, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { GlobalPosition, InsidePlacement, Toppy, ToppyControl } from 'toppy';

@Component({
  selector: 'app-dialog',
  templateUrl: './dialog.component.html',
  styleUrls: ['./dialog.component.css']
})
export class DialogComponent implements OnInit, AfterViewInit {

  @ViewChild("template") template?: TemplateRef<any>;

  @Input()
  showCloseButton: boolean = true;

  toppyControl?: ToppyControl;

  constructor(private toppy: Toppy) { }

  ngOnInit(): void {
  }

  ngAfterViewInit(): void {      
    this.toppyControl = this.toppy
    .position(new GlobalPosition({
      placement: InsidePlacement.CENTER,
      width: "fit-content",
      height: 'max-content',
    }))
    .config({
      wrapperClass: "overflow-visible",
      backdrop: true,
      closeOnDocClick: true,
      closeOnEsc: true
    })
    .content(this.template as TemplateRef<any>)
    .create();
  }

  open() {
    this.toppyControl?.open();
  }

  close() {
    this.toppyControl?.close();
  }
}

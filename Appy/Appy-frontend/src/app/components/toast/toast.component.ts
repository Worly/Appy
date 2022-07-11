import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';

@Component({
  selector: 'app-toast',
  templateUrl: './toast.component.html',
  styleUrls: ['./toast.component.css']
})
export class ToastComponent implements OnInit {

  showing: boolean = false;
  text: string = "";

  constructor() { }

  ngOnInit(): void {
  }

  public show(text: string): void {
    this.text = text;
    this.showing = true;
    setTimeout(() => this.showing = false, 2000);
  }

}

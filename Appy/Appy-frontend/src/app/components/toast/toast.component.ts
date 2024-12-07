import { Component, ElementRef, OnInit } from '@angular/core';
import { IconName, IconProp } from '@fortawesome/fontawesome-svg-core';
import { Observable, of, delay } from 'rxjs';

@Component({
  selector: 'app-toast',
  templateUrl: './toast.component.html',
  styleUrls: ['./toast.component.scss']
})
export class ToastComponent implements OnInit {
  text: string = "";
  icon?: IconProp;
  iconColor?: "success" | "danger" | "warning" | "normal" | "custom";
  customIconColor?: string;
  actions?: {
    text: string;
    onClick: (() => void);
    icon?: IconName;
    isLoading: boolean;
  }[];

  constructor(private elementRef: ElementRef) { }

  ngOnInit(): void {
  }

  show() {
    setTimeout(() => this.elementRef.nativeElement.classList.add("visible"));
  }

  hide(): Observable<void> {
    setTimeout(() => this.elementRef.nativeElement.classList.remove("visible"));

    return <any>of(0).pipe(delay(300));
  }

}

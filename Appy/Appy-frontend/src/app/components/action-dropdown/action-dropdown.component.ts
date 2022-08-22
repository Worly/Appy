import { Component, ContentChildren, ElementRef, Input, OnInit, QueryList, TemplateRef, ViewChild } from '@angular/core';
import { ButtonComponent } from '../button/button.component';

@Component({
  selector: 'app-action-dropdown',
  templateUrl: './action-dropdown.component.html',
  styleUrls: ['./action-dropdown.component.scss']
})
export class ActionDropdownComponent {
  @Input() isDropdown: boolean = true;

  @ContentChildren(ButtonComponent, { descendants: true }) set contentChildren(buttons: QueryList<ButtonComponent>) {
    this.isEmpty = buttons.length == 0;
  }

  isEmpty: boolean = false;
}

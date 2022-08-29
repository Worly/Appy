import { Component, ContentChildren, ElementRef, Input, OnInit, QueryList, TemplateRef, ViewChild } from '@angular/core';
import { ButtonComponent } from '../button/button.component';

@Component({
  selector: 'app-action-dropdown',
  templateUrl: './action-dropdown.component.html',
  styleUrls: ['./action-dropdown.component.scss']
})
export class ActionDropdownComponent {
  @Input() isDropdown: boolean = true;

  private _buttons: QueryList<ButtonComponent> | undefined;
  @ContentChildren(ButtonComponent, { descendants: true }) set buttons(value: QueryList<ButtonComponent> | undefined) {
    if (this._buttons == value)
      return;

    this._buttons = value;

    this.isEmpty = value == null || value.length == 0;
  }
  get buttons(): QueryList<ButtonComponent> | undefined {
    return this._buttons;
  }

  isEmpty: boolean = false;

  get isLoading(): boolean {
    return this.buttons?.some(b => b.isLoading) ?? false;
  }
}

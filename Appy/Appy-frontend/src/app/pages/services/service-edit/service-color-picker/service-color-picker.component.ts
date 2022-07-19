import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ServiceColorsService } from 'src/app/services/service-colors.service';

@Component({
  selector: 'app-service-color-picker',
  templateUrl: './service-color-picker.component.html',
  styleUrls: ['./service-color-picker.component.scss']
})
export class ServiceColorPickerComponent implements OnInit {

  @Input() colorId?: number = 0;
  @Output() colorIdChange: EventEmitter<number> = new EventEmitter();

  constructor(
    public serviceColorsService: ServiceColorsService
  ) { }

  ngOnInit(): void {
  }

  public selectColor(colorId: number) {
    this.colorId = colorId;
    this.colorIdChange.emit(colorId);
  }
}

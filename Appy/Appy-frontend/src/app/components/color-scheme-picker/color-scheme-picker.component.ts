import { Component, OnInit } from '@angular/core';
import { IconName } from '@fortawesome/fontawesome-svg-core';
import { ColorScheme, ColorSchemeService } from 'src/app/services/color-scheme.service';

@Component({
  selector: 'app-color-scheme-picker',
  templateUrl: './color-scheme-picker.component.html',
  styleUrls: ['./color-scheme-picker.component.scss']
})
export class ColorSchemePickerComponent implements OnInit {
  options: Scheme[] = [
    { scheme: "follow-os", icon: "circle-half-stroke", text: "FOLLOW_OS" },
    { scheme: "light", icon: "sun", text: "LIGHT" },
    { scheme: "dark", icon: "moon", text: "DARK" },
  ]

  selectedScheme: Scheme = this.options[0];

  constructor(private colorSchemeService: ColorSchemeService) {

  }

  ngOnInit(): void {
    this.selectedScheme = this.options.find(l => l.scheme == this.colorSchemeService.colorScheme) as Scheme;
  }

  public selectScheme(scheme: Scheme): void {
    this.selectedScheme = scheme;
    this.colorSchemeService.colorScheme = scheme.scheme;
  }
}

interface Scheme {
  scheme: ColorScheme;
  icon: IconName;
  text: string;
}

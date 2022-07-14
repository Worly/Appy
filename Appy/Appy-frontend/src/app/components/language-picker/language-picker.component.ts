import { Component, OnInit } from '@angular/core';
import { TranslateService } from 'src/app/services/translate/translate.service';

@Component({
  selector: 'app-language-picker',
  templateUrl: './language-picker.component.html',
  styleUrls: ['./language-picker.component.scss']
})
export class LanguagePickerComponent implements OnInit {

  languages: Language[] = [
    { displayName: "EN", code: "en" },
    { displayName: "HR", code: "hr" }
  ]

  selectedLanguage: Language = this.languages[0];

  constructor(private translateService: TranslateService) {

  }

  ngOnInit(): void {
    this.selectedLanguage = this.languages.find(l => l.code == this.translateService.getSelectedLanguageCode()) as Language;
  }

  public selectLanguage(language: Language): void {
    this.selectedLanguage = language;
    this.translateService.setLanguage(language.code);
  }
}

interface Language {
  displayName: string;
  code: string;
}

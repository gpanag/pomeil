import { Component, ChangeDetectionStrategy } from '@angular/core';
import { TranslateService } from './translate.service';

@Component({
    selector: 'app-translate',
    templateUrl: './translate.component.html',
    styleUrl: './translate.component.scss',
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class TranslateComponent {
  constructor(public translateService: TranslateService) { }

  ngOnInit() {
    if (localStorage.getItem('language')) {
      this.translateService.lang = localStorage.getItem('language');
      this.translateService.setLang(this.translateService.lang);
    }
    this.translateService.use(this.translateService.lang);
  }

  changeLang(lang: string) {
    this.translateService.use(lang);
    this.translateService.lang = lang;
    localStorage.setItem('language', lang);
  }
}

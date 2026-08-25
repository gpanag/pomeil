import { Component } from '@angular/core';
import localeEn from '@angular/common/locales/en';
import localeEe from '@angular/common/locales/ee';
import localeGr from '@angular/common/locales/el';
import localeNo from '@angular/common/locales/no';
import localePl from '@angular/common/locales/pl';
import localeUa from '@angular/common/locales/ru-UA';
import { registerLocaleData } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../api.service';
import { ImageDialog } from '../app.component';
import { TranslateService } from '../translate/translate.service';


registerLocaleData(localeEn, 'en');
registerLocaleData(localeEe, 'ee');
registerLocaleData(localeGr, 'gr');
registerLocaleData(localeNo, 'no');
registerLocaleData(localePl, 'pl');
registerLocaleData(localeUa, 'ua');


@Component({
  selector: 'app-article',
  templateUrl: './article.component.html',
  styleUrl: './article.component.scss'
})
export class ArticleComponent {

 id: number = -1;
  newItem: any;
  lang: string = 'en';
news: any;
  images: any[] = [];
  imagesIds: any[] = [];

  constructor(
    private apiService: ApiService,
    private route: ActivatedRoute,
    private dialog: MatDialog,
    private translateService: TranslateService,
  ) {
    this.lang = this.translateService.getLang();
    this.translateService.lang$.subscribe(value => {
      this.lang = value;
    });

    this.route.paramMap.subscribe((params: any) => {
      this.id = params.params.id;
      if (this.id === null) return;

      this.apiService.getArticlesFull().subscribe((data: any) => {
        this.news = data.data;
        for (let index = 0; index < this.news.length; index++) {
          const element = this.news[index];
          if ((element.id + 0) === (Number(this.id))) {
            this.newItem = element;
            this.images = [];
            if (this.newItem.image) this.images.push(this.newItem.image);
            if (this.newItem.more_images) {
              for (const img of this.newItem.more_images) this.images.push(img);
            }
          }
        }
      });
    });
  }

  openImageDialog(imagesData: any[], id: number) {
    this.dialog.open(ImageDialog, {
      position: {
        top: '10px',
        right: '10px'
      },
      height: '98%',
      width: '90vw',
      maxWidth: '90vw',
      panelClass: 'pomeil-image-pane',
      data: {
        id: id,
        pics: imagesData
      }
    });
  }

  /** Effective language for displaying article content: falls back to EN
      when the article has no body for the currently-selected language.
      Article #2 is EN-only in Strapi, so PL/GR/etc. would otherwise render
      blank. */
  effectiveLang(): string {
    const item = this.newItem;
    if (!item) return this.lang;
    const map: { [k: string]: string } = {
      ee: 'content_ee', gr: 'content_gr', no: 'content_no',
      pl: 'content_pl', ua: 'content_ua', en: 'content',
    };
    const key = map[this.lang] || 'content';
    const hasContent = Array.isArray(item[key]) && item[key].length > 0;
    return hasContent ? this.lang : 'en';
  }

  /** Title for the effective language with EN fallback. */
  effectiveTitle(): string {
    const item = this.newItem;
    if (!item) return '';
    const eff = this.effectiveLang();
    const map: { [k: string]: string } = {
      ee: 'title_ee', gr: 'title_gr', no: 'title_no',
      pl: 'title_pl', ua: 'title_ua', en: 'title',
    };
    return item[map[eff]] || item.title || '';
  }
}

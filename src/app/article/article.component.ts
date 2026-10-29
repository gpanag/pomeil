import { Component, ChangeDetectionStrategy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../api.service';
import { ImageDialog } from '../app.component';
import { TranslateService } from '../translate/translate.service';
import { dateLocale } from '../shared/app-locales';

// Article links use the stable `documentId`: Strapi v5 gives an entry a new numeric id every time it
// is re-published (same as partners, see partner.component.ts). Legacy numeric "/articles/N" URLs
// still resolve by id; this table pins the ones whose id has since moved.
// Article #2 (escape rooms) was id 5 until the 2026-10-27 translations re-published it as id 10.
const LEGACY_ARTICLE_ALIASES: { [legacyId: string]: string } = {
  '5': 'irc84b0q39zinyp3uuqm59v1', // POMEIL Escape Rooms Aim to Make It Easier for Migrants…
};

@Component({
    selector: 'app-article',
    templateUrl: './article.component.html',
    styleUrl: './article.component.scss',
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class ArticleComponent {
  /** DatePipe locale for the current UI language (ee→et, gr→el, ua→uk). */
  get dateLocale(): string { return dateLocale(this.lang); }

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
        const param = String(this.id);
        const docId = LEGACY_ARTICLE_ALIASES[param] || param;
        const element = this.news.find((a: any) => String(a.documentId) === docId)
          || this.news.find((a: any) => String(a.id) === param);
        if (element) {
          this.newItem = element;
          this.images = [];
          if (this.newItem.image) this.images.push(this.newItem.image);
          if (this.newItem.more_images) {
            for (const img of this.newItem.more_images) this.images.push(img);
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
      Article #2 has no Estonian body yet, so EE would otherwise render
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

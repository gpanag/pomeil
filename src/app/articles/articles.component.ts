import { trigger, state, style, transition, animate, query, stagger } from '@angular/animations';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../api.service';
import { TranslateService } from '../translate/translate.service';
import localeEn from '@angular/common/locales/en';
import localeEe from '@angular/common/locales/ee';
import localeGr from '@angular/common/locales/el';
import localeNo from '@angular/common/locales/no';
import localePl from '@angular/common/locales/pl';
import localeUa from '@angular/common/locales/ru-UA';
import { registerLocaleData } from '@angular/common';

registerLocaleData(localeEn, 'en');
registerLocaleData(localeEe, 'ee');
registerLocaleData(localeGr, 'gr');
registerLocaleData(localeNo, 'no');
registerLocaleData(localePl, 'pl');
registerLocaleData(localeUa, 'ua');

@Component({
  selector: 'app-articles',
  templateUrl: './articles.component.html',
  styleUrl: './articles.component.scss',
    animations: [
      // Each unique animation requires its own trigger. The first argument of the trigger function is the name
      // fader,
      trigger('rotatedState', [
        state('default', style({ transform: 'translateY(0)' })),
        state('rotated', style({ transform: 'rotateY(360deg)' })),
        transition('rotated <=> default', animate('800ms ease-in-out')),
        transition('default <=> rotated', animate('800ms ease-in-out'))
      ]),
      trigger('listAnimation', [
        transition('* <=> *', [ // each time the binding value changes
          query('.item-card:leave', [
            style({ transform: 'translateY(0)', opacity: 1 }),
            stagger(10, [
              animate('.1s ease-in-out', style({ transform: 'translateY(24px)', opacity: 0 }))
            ])
          ],
            { optional: true, limit: 20 }
          ),
          query('.item-card:enter', [
            style({ transform: 'translateY(24px)', opacity: 0 }),
            stagger(100, [
              animate('.8s ease-in-out', style({ transform: 'translateY(0)', opacity: 1 }))
            ])
          ],
            { optional: true, limit: 20 }
          )
        ])
      ]),
      trigger('rotatedStateList', [
        state('default', style({ transform: 'translateY(0)' })),
        state('rotated', style({ transform: 'translate(72px)' })),
        transition('rotated <=> default', animate('800ms ease-in-out')),
        transition('default <=> rotated', animate('800ms ease-in-out'))
      ]),
      trigger('listAnimationList', [
        transition('* <=> *', [ // each time the binding value changes
          query('.item-list:leave', [
            style({ transform: 'translateY(0) translateX(0)', opacity: 1 }),
            stagger(10, [
              animate('.1s ease-in-out', style({ transform: 'translateY(72px) translateX(300px)', opacity: 0 }))
            ])
          ],
            { optional: true, limit: 20 }
          ),
          query('.item-list:enter', [
            style({ transform: 'translateY(72px) translateX(300px)', opacity: 0 }),
            stagger(100, [
              animate('.8s ease-in-out', style({ transform: 'translateY(0) translateX(0)', opacity: 1 }))
            ])
          ],
            { optional: true, limit: 20 }
          )
        ])
      ]),
    ],
})
export class ArticlesComponent {
 listGrid: boolean = false;
  suffleCards = true;

  news: any = [];

  lang: string = 'gr';



  newsCount: number = 0;

 

  pageSize: number = 10;
  pageIndex: number = 1;

  constructor(
    private apiService: ApiService,
    private router: Router,
    private translateService: TranslateService,
  ) {
    this.lang = this.translateService.getLang();
    this.translateService.lang$.subscribe(v => { this.lang = v; });

    this.apiService.getArticles(this.pageIndex, this.pageSize).subscribe((data: any) => {
      const items: any[] = data.data || [];
      items.sort((a, b) => {
        const da = new Date(a?.publishedAt || 0).getTime();
        const db = new Date(b?.publishedAt || 0).getTime();
        return db - da;
      });
      this.news = items;
    });
  }

  /** Per-language title for an article card. */
  articleTitle(item: any): string {
    const k: { [k: string]: string } = {
      ee: 'title_ee', gr: 'title_gr', no: 'title_no',
      pl: 'title_pl', ua: 'title_ua', en: 'title',
    };
    const key = k[this.lang] || 'title';
    return item?.[key] || item?.title || '';
  }

  openNew(item: any) {

    this.router.navigate(['/articles/' + item.id]);


  }

  onPaginateChange(e: any) {
    this.pageIndex = e.pageIndex;
    this.pageSize = e.pageSize;
    this.apiService.getNewsFull(e.pageIndex, e.pageSize).subscribe((data: any) => {

      this.news = data.data;
    });
  }
}

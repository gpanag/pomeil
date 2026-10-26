import { trigger, state, style, transition, animate, query, stagger } from '@angular/animations';
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../api.service';
import { TranslateService } from '../translate/translate.service';
import { localizedField } from '../shared/localized-field';

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
            transition('* <=> *', [
                query('.item-card:leave', [
                    style({ transform: 'translateY(0)', opacity: 1 }),
                    stagger(10, [
                        animate('.1s ease-in-out', style({ transform: 'translateY(24px)', opacity: 0 }))
                    ])
                ], { optional: true, limit: 20 }),
                query('.item-card:enter', [
                    style({ transform: 'translateY(24px)', opacity: 0 }),
                    stagger(100, [
                        animate('.8s ease-in-out', style({ transform: 'translateY(0)', opacity: 1 }))
                    ])
                ], { optional: true, limit: 20 })
            ])
        ]),
        trigger('rotatedStateList', [
            state('default', style({ transform: 'translateY(0)' })),
            state('rotated', style({ transform: 'translate(72px)' })),
            transition('rotated <=> default', animate('800ms ease-in-out')),
            transition('default <=> rotated', animate('800ms ease-in-out'))
        ]),
        trigger('listAnimationList', [
            transition('* <=> *', [
                query('.item-list:leave', [
                    style({ transform: 'translateY(0) translateX(0)', opacity: 1 }),
                    stagger(10, [
                        animate('.1s ease-in-out', style({ transform: 'translateY(72px) translateX(300px)', opacity: 0 }))
                    ])
                ], { optional: true, limit: 20 }),
                query('.item-list:enter', [
                    style({ transform: 'translateY(72px) translateX(300px)', opacity: 0 }),
                    stagger(100, [
                        animate('.8s ease-in-out', style({ transform: 'translateY(0) translateX(0)', opacity: 1 }))
                    ])
                ], { optional: true, limit: 20 })
            ])
        ]),
    ],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class ArticlesComponent {
 listGrid: boolean = false;
  suffleCards = true;

  news: any = [];

  lang: string = 'gr';



  newsCount: number = 0;

 

  pageSize: number = 10;
  // mat-paginator counts pages from 0; Strapi counts from 1 (see loadArticles).
  pageIndex: number = 0;

  constructor(
    private apiService: ApiService,
    private router: Router,
    private translateService: TranslateService,
  ) {
    this.lang = this.translateService.getLang();
    this.translateService.lang$.subscribe(v => { this.lang = v; });

    this.loadArticles();
  }

  /**
   * Fetch the current page of articles and the total the paginator needs.
   * Strapi pages are 1-based, the paginator's pageIndex is 0-based.
   */
  private loadArticles() {
    this.apiService.getArticles(this.pageIndex + 1, this.pageSize).subscribe((data: any) => {
      const items: any[] = data.data || [];
      items.sort((a, b) => {
        const da = new Date(a?.publishedAt || 0).getTime();
        const db = new Date(b?.publishedAt || 0).getTime();
        return db - da;
      });
      this.news = items;
      this.newsCount = data?.meta?.pagination?.total ?? items.length;
    });
  }

  /** Per-language title for an article card (English fallback). */
  articleTitle(item: any): string { return localizedField(item, 'title', this.lang); }

  openNew(item: any) {

    this.router.navigate(['/articles/' + item.id]);


  }

  onPaginateChange(e: any) {
    this.pageIndex = e.pageIndex;
    this.pageSize = e.pageSize;
    this.loadArticles();
  }
}

import { trigger, state, style, transition, animate, query, stagger } from '@angular/animations';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../api.service';
import { MatDialog } from '@angular/material/dialog';
import { ImageDialog } from '../app.component';
import { TranslateService } from '../translate/translate.service';

@Component({
  selector: 'app-newsletters',
  templateUrl: './newsletters.component.html',
  styleUrl: './newsletters.component.scss',
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
export class NewslettersComponent {
  listGrid: boolean = false;
  suffleCards = true;
  id: number = -1;
  news: any = [];
  newItem: any;
  lang: string = 'en';
  images: any[] = [];
  imagesIds: any[] = [];


  newsCount: number = 0;

  pageSize: number = 10;
  /** 0-based for mat-paginator binding; +1 when calling the Strapi API. */
  pageIndex: number = 0;

  constructor(
    private apiService: ApiService,
    private router: Router,
    private dialog: MatDialog,
    private translateService: TranslateService,
  ) {

    this.lang = this.translateService.getLang();
    this.apiService.getNewslettersFull(this.pageIndex + 1, this.pageSize).subscribe((data: any) => {

      this.news = data.data;
      this.newsCount = data.meta?.pagination?.total ?? this.news.length;
      // console.log(this.news)
      for (let index = 0; index < this.news.length; index++) {
        const element = this.news[index];
  
        switch (this.lang) {
          case 'en':
            for (let index = 0; index < this.news.length; index++) {
              const element = this.news[index];
              if (element.image) {
                this.images.push(element.image);
              }
            }
            break;
          case 'ee':
            for (let index = 0; index < this.news.length; index++) {
              const element = this.news[index];
              if (element.image_ee) {
                this.images.push(element.image_ee);
              }
            }
            break;
          case 'gr':
            for (let index = 0; index < this.news.length; index++) {
              const element = this.news[index];
              if (element.image_gr) {
                this.images.push(element.image_gr);
              }
            }
            break;
          case 'no':
            for (let index = 0; index < this.news.length; index++) {
              const element = this.news[index];
              if (element.image_no) {
                this.images.push(element.image_no);
              }
            }
            break;
          case 'pl':
            for (let index = 0; index < this.news.length; index++) {
              const element = this.news[index];
              if (element.image_pl) {
                this.images.push(element.image_pl);
              }
            }
            break;
          case 'ua':
            for (let index = 0; index < this.news.length; index++) {
              const element = this.news[index];
              if (element.image_ua) {
                this.images.push(element.image_ua);
              }
            }
            break;
          default:
            break;
        }
    
          // console.log(this.images)
        // }
      }
    });

    this.translateService.lang$.subscribe(data => {
      this.lang = data;
      this.images = [];
      switch (this.lang) {
        case 'en':
          for (let index = 0; index < this.news.length; index++) {
            const element = this.news[index];
            if (element.image) {
              this.images.push(element.image);
            }
          }
          break;
        case 'ee':
          for (let index = 0; index < this.news.length; index++) {
            const element = this.news[index];
            if (element.image_ee) {
              this.images.push(element.image_ee);
            }
          }
          break;
        case 'gr':
          for (let index = 0; index < this.news.length; index++) {
            const element = this.news[index];
            if (element.image_gr) {
              this.images.push(element.image_gr);
            }
          }
          break;
        case 'no':
          for (let index = 0; index < this.news.length; index++) {
            const element = this.news[index];
            if (element.image_no) {
              this.images.push(element.image_no);
            }
          }
          break;
        case 'pl':
          for (let index = 0; index < this.news.length; index++) {
            const element = this.news[index];
            if (element.image_pl) {
              this.images.push(element.image_pl);
            }
          }
          break;
        case 'ua':
          for (let index = 0; index < this.news.length; index++) {
            const element = this.news[index];
            if (element.image_ua) {
              this.images.push(element.image_ua);
            }
          }
          break;
        default:
          break;
      }
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

  onPaginateChange(e: any) {
    this.pageIndex = e.pageIndex;
    this.pageSize = e.pageSize;
    this.apiService.getNewslettersFull(this.pageIndex + 1, this.pageSize).subscribe((data: any) => {
      this.news = data.data;
      this.newsCount = data.meta?.pagination?.total ?? this.news.length;
    });
  }
}
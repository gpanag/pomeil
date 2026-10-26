import { Component, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../api.service';
import { TranslateService } from '../translate/translate.service';
import { trigger, state, style, transition, animate, query, stagger } from '@angular/animations';
import { ImageDialog } from '../app.component';
import { MatDialog } from '@angular/material/dialog';
import { localizedField } from '../shared/localized-field';

@Component({
    selector: 'app-outputs',
    templateUrl: './outputs.component.html',
    styleUrl: './outputs.component.scss',
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
export class OutputsComponent {
  /** Per-language work-package title with English fallback. */
  wpTitle(wp: any): string { return localizedField(wp, 'title', this.lang); }
  /** A file whose Strapi media caption is "English only" has no translations; the template tags it. */
  isEnglishOnly(file: any): boolean { return (file?.caption || '').trim().toLowerCase() === 'english only'; }
  workpackages: any;

  lang: string = 'en';

  images: any[] = [];

  constructor(private apiService: ApiService, private dialog: MatDialog, private translateService: TranslateService) {

    this.lang = this.translateService.getLang();
    this.translateService.lang$.subscribe(value => {
      this.lang = value;
    });




    this.apiService.getWorkpackagesFull().subscribe((data: any) => {

      this.workpackages = data.data;
      console.log(this.workpackages)

      for (let index = 0; index < this.workpackages.length; index++) {
        const element = this.workpackages[index];

        if (element.image_en) {

          for (let indexb = 0; indexb < element.image_en.length; indexb++) {

            const elementb = element.image_en[indexb];
            this.images.push(elementb);
          }

        }
        // }
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
}

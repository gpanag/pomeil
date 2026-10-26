import { trigger, state, style, transition, animate, query, stagger } from '@angular/animations';
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../api.service';
import { TranslateService } from '../translate/translate.service';

@Component({
    selector: 'app-partnership',
    templateUrl: './partnership.component.html',
    styleUrl: './partnership.component.scss',
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
export class PartnershipComponent {
  listGrid: boolean = false;
  suffleCards = true;

  partners: any = [];

  lang: string = 'gr';

  darkTheme: boolean = false;

  constructor(private apiService: ApiService,  private router: Router, private translateService: TranslateService) {

    this.lang = this.translateService.getLang();
    this.translateService.lang$.subscribe(value => {
      this.lang = value;
    }); 


    this.apiService.getPartnersFull().subscribe((data: any) => {
    
      // const randomizedData = data.data.sort(() => Math.random() - 0.5); 
      this.partners = data.data;
      // console.log(this.partners)

    });


  }
  openPartner(id: string) {
    this.router.navigate(['partner/' + id])
  }
}

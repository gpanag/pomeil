import { Component } from '@angular/core';
import { ApiService } from '../api.service';
import { trigger, transition, style, animate } from '@angular/animations';
import { TranslateService } from '../translate/translate.service';

@Component({
  selector: 'app-leaflets',
  templateUrl: './leaflets.component.html',
  styleUrl: './leaflets.component.scss',
  animations: [
    trigger('previewAnimation', [
      // Transition from any state to any state (* => *)
      // This runs whenever the bound value changes
      transition('* => *', [
        style({ opacity: 0, transform: 'scale(0.95)' }),
        animate('400ms cubic-bezier(0.25, 0.8, 0.25, 1)',
          style({ opacity: 1, transform: 'scale(1)' })
        )
      ])
    ])
  ]
})
export class LeafletsComponent {

  leaflets: any[] = [];
  selectedLeaflet: any = null;
  lang: string = 'en';

  constructor(
    private apiService: ApiService,
    private translateService: TranslateService,
  ) {
    this.lang = this.translateService.getLang();
    this.translateService.lang$.subscribe(value => {
      this.lang = value;
    });

    this.apiService.getLeaflets().subscribe((data: any) => {
      this.leaflets = data.data || [];
      // Sort by title so leaflet#1/#2/#3 render in order. Strapi sorts
      // by publishedAt:asc by default, but title-sort is stable across
      // republishes.
      this.leaflets.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      if (this.leaflets.length > 0) {
        this.selectedLeaflet = this.leaflets[0];
      }
    });
  }

  /** Image URL for a leaflet preview — picks the per-language variant
      (`image_xx`) when present, with EN fallback. */
  leafletImageUrl(leaflet: any): string {
    if (!leaflet) return '';
    const langKey: { [k: string]: string } = {
      ee: 'image_ee', gr: 'image_gr', no: 'image_no',
      pl: 'image_pl', ua: 'image_ua', en: 'image',
    };
    const key = langKey[this.lang] || 'image';
    return leaflet[key]?.url || leaflet.image?.url || '';
  }

  selectLeaflet(leaflet: any): void {
    this.selectedLeaflet = leaflet;
  }
}

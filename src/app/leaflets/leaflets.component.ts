import { Component, ChangeDetectionStrategy } from '@angular/core';
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
                animate('400ms cubic-bezier(0.25, 0.8, 0.25, 1)', style({ opacity: 1, transform: 'scale(1)' }))
            ])
        ])
    ],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class LeafletsComponent {

  leaflets: any[] = [];
  selectedLeaflet: any = null;
  lang: string = 'en';
  /** Which page of the selected leaflet is shown (0-based). */
  currentPageIndex: number = 0;

  constructor(
    private apiService: ApiService,
    private translateService: TranslateService,
  ) {
    this.lang = this.translateService.getLang();
    this.translateService.lang$.subscribe(value => {
      this.lang = value;
      // A language may have fewer pages than the one before it (EN fallback),
      // so never leave the pager pointing past the end.
      this.clampPageIndex();
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
      (`image_xx`) when present, with EN fallback. Page 1 (the front side). */
  leafletImageUrl(leaflet: any): string {
    return this.leafletPageUrl(leaflet, 'image');
  }

  /** URL of one page of a leaflet in the active language, EN as fallback.
      `base` is the Strapi field prefix: `image` = page 1, `image2` = page 2.
      Leaflets #1–#3 are single-sided, so `image2*` is simply absent there. */
  private leafletPageUrl(leaflet: any, base: 'image' | 'image2'): string {
    if (!leaflet) return '';
    const suffix: { [k: string]: string } = {
      ee: '_ee', gr: '_gr', no: '_no', pl: '_pl', ua: '_ua', en: '',
    };
    const key = base + (suffix[this.lang] ?? '');
    return leaflet[key]?.url || leaflet[base]?.url || '';
  }

  /** Every page of `leaflet` in the active language, in reading order. */
  leafletPages(leaflet: any): string[] {
    return [
      this.leafletPageUrl(leaflet, 'image'),
      this.leafletPageUrl(leaflet, 'image2'),
    ].filter(url => !!url);
  }

  /** Pages of the leaflet currently shown in the preview pane. */
  get previewPages(): string[] {
    return this.leafletPages(this.selectedLeaflet);
  }

  /** The page image the preview pane is showing right now. */
  get previewPageUrl(): string {
    const pages = this.previewPages;
    return pages[this.currentPageIndex] || pages[0] || '';
  }

  previousPage(): void {
    if (this.currentPageIndex > 0) this.currentPageIndex--;
  }

  nextPage(): void {
    if (this.currentPageIndex < this.previewPages.length - 1) this.currentPageIndex++;
  }

  private clampPageIndex(): void {
    const lastIndex = Math.max(0, this.previewPages.length - 1);
    if (this.currentPageIndex > lastIndex) this.currentPageIndex = lastIndex;
  }

  selectLeaflet(leaflet: any): void {
    this.selectedLeaflet = leaflet;
    this.currentPageIndex = 0;
  }

  trackByIndex = (index: number) => index;
}

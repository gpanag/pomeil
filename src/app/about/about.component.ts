import { Component, ChangeDetectionStrategy } from '@angular/core';
import { ApiService } from '../api.service';
import { TranslateService } from '../translate/translate.service';

@Component({
    selector: 'app-about',
    templateUrl: './about.component.html',
    styleUrl: './about.component.scss',
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class AboutComponent {
  about: any;
  objectives: any[] = [];
  lang: string = 'en';

  /**
   * Map of UI language code -> Strapi field suffix on the `about`
   * entity. Each language has its own `content_blocks_{lang}` field
   * (with the bare `content_blocks` reserved for English).
   */
  private static readonly ABOUT_FIELD_BY_LANG: { [key: string]: string } = {
    en: 'content_blocks',
    ee: 'content_blocks_ee',
    gr: 'content_blocks_gr',
    no: 'content_blocks_no',
    pl: 'content_blocks_pl',
    ua: 'content_blocks_ua',
  };

  /** Same idea for objective entries — different field name. */
  private static readonly OBJECTIVE_FIELD_BY_LANG: { [key: string]: string } = {
    en: 'content',
    ee: 'content_ee',
    gr: 'content_gr',
    no: 'content_no',
    pl: 'content_pl',
    ua: 'content_ua',
  };

  constructor(private apiService: ApiService, private translateService: TranslateService) {
    this.lang = this.translateService.getLang();
    this.translateService.lang$.subscribe(value => {
      this.lang = value;
    });

    this.apiService.getAbout().subscribe((data: any) => {
      this.about = data?.data;
    });

    this.apiService.getObjectivesFull().subscribe((data: any) => {
      this.objectives = data?.data || [];
    });
  }

  /** Language-aware Strapi content slot for the about prose. */
  contentBlocks(): any[] {
    if (!this.about) return [];
    const field = AboutComponent.ABOUT_FIELD_BY_LANG[this.lang] || 'content_blocks';
    const blocks = this.about[field] || this.about['content_blocks'] || [];
    return blocks;
  }

  /** Language-aware Strapi content for one objective. */
  objectiveContent(obj: any): any[] {
    if (!obj) return [];
    const field = AboutComponent.OBJECTIVE_FIELD_BY_LANG[this.lang] || 'content';
    return obj[field] || obj['content'] || [];
  }

  /**
   * A paragraph counts as a "heading" when every non-empty inline child
   * is bold. Strapi's editor often emits headings as bold paragraphs
   * rather than dedicated heading types, and we want to render those
   * with display typography in the prose flow.
   */
  isHeading(par: any): boolean {
    if (!par || !Array.isArray(par.children) || par.children.length === 0) return false;
    const hasContent = par.children.some((c: any) => (c.text || '').trim().length > 0);
    if (!hasContent) return false;
    return par.children.every(
      (c: any) => !c.text?.trim() || c.bold === true
    );
  }

  /**
   * The very first non-empty, non-heading paragraph in the article is
   * the body lede — that's the one that gets a drop-cap. Class-driven
   * rather than position-driven so an editor adding a heading split
   * doesn't drag the drop-cap onto a heading word.
   */
  isBodyLede(par: any, index: number): boolean {
    if (!par || this.isHeading(par)) return false;
    const text = (par.children || [])
      .map((c: any) => c.text || '')
      .join('')
      .trim();
    if (!text) return false;
    const blocks = this.contentBlocks();
    for (let i = 0; i < index; i++) {
      const earlier = blocks[i];
      if (!earlier || this.isHeading(earlier)) continue;
      const earlierText = (earlier.children || [])
        .map((c: any) => c.text || '')
        .join('')
        .trim();
      if (earlierText) return false; // there's already a body para before this one
    }
    return true;
  }

  /** Two-digit ordinal label (O01..O30) for objective cards. */
  ordinalLabel(idx: number): string {
    return 'O' + (idx + 1).toString().padStart(2, '0');
  }
}

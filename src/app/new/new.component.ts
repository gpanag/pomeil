import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../api.service';
import { ImageDialog } from '../app.component';
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
  selector: 'app-new',
  templateUrl: './new.component.html',
  styleUrl: './new.component.scss'
})
export class NewComponent {
  id: string = '';
  newItem: any;
  lang: string = 'en';
news: any;
  images: any[] = [];
  imagesIds: any[] = [];

  /** Static second-page QR overlay shown only for English newsletter
      article views (partner feedback 2026-05-28 item 1). */
  readonly qrPageUrl = '/assets/qrs.png';

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
      if (this.id) {
        this.apiService.getNew(this.id).subscribe((res: any) => {
          this.newItem = res?.data;
          this.images = [];
          if (this.newItem?.image) {
            this.images.push(this.newItem.image);
          }
          if (this.newItem?.more_images) {
            for (const img of this.newItem.more_images) {
              this.images.push(img);
            }
          }
        });
      }
    });
  }

  /** Cover image URL for the current lang: prefers a Strapi `image_xx`
      variant if present, then the base `image`. */
  coverImageUrl(): string {
    const item: any = this.newItem;
    if (!item) return '';
    const langKey: { [k: string]: string } = {
      ee: 'image_ee', gr: 'image_gr', no: 'image_no', pl: 'image_pl', ua: 'image_ua', en: 'image'
    };
    const key = langKey[this.lang] || 'image';
    if (item[key]?.url) return item[key].url;
    return item.image?.url || '';
  }

  openImageDialog(imagesData: any[], id: number | string) {
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

  /** Returns the language-specific Strapi content slot for the current
      article, falling back to English. Consecutive heading paragraphs
      are merged into one — Strapi editors sometimes break a single
      heading across multiple paragraph blocks (the Greek translation
      of newsletter#5 splits "POMEIL ESCAPE ROOMS – ΜΑΘΕΤΕ ΓΙΑ ΤΗΝ
      ΕΠΙΧΕΙΡΗΜΑΤΙΚΟΤΗΤΑ ΜΕΣΩ" and "ΕΝΟΣ ΠΑΙΧΝΙΔΙΟΥ" into two blocks)
      and we want them to render as one continuous title. */
  contentBlocks(): any[] {
    if (!this.newItem) return [];
    const map: { [key: string]: string } = {
      ee: 'content_ee',
      gr: 'content_gr',
      no: 'content_no',
      pl: 'content_pl',
      ua: 'content_ua',
    };
    const key = map[this.lang] ?? 'content';
    const raw = this.newItem?.[key] ?? this.newItem?.['content'] ?? [];
    return this.mergeConsecutiveHeadings(raw);
  }

  /** Walks the block list and folds runs of consecutive heading
      paragraphs into a single paragraph. Empty paragraphs are NOT
      treated as continuation — a heading separated by a blank block
      is left as a separate heading on purpose. */
  private mergeConsecutiveHeadings(blocks: any[]): any[] {
    if (!Array.isArray(blocks) || blocks.length === 0) return blocks ?? [];
    const result: any[] = [];
    let i = 0;
    while (i < blocks.length) {
      const block = blocks[i];
      if (this.isHeading(block)) {
        const mergedChildren: any[] = [...(block?.children ?? [])];
        let j = i + 1;
        while (j < blocks.length && this.isHeading(blocks[j])) {
          // Insert a literal space between heading fragments so
          // "…ΜΕΣΩ" and "ΕΝΟΣ…" don't render glued together.
          mergedChildren.push({ text: ' ', type: 'text' });
          mergedChildren.push(...(blocks[j]?.children ?? []));
          j++;
        }
        result.push({ ...block, children: mergedChildren });
        i = j;
      } else {
        result.push(block);
        i++;
      }
    }
    return result;
  }

  /** A Strapi block is treated as a heading-like paragraph when every
      non-empty inline child is marked bold. This catches both the
      "title paragraph" pattern and the case where an editor accidentally
      split a heading across two paragraph blocks (the failure mode that
      bit us on the Greek translation of newsletter#5). */
  isHeading(par: any): boolean {
    const children = par?.children;
    if (!Array.isArray(children) || children.length === 0) return false;
    const nonEmpty = children.filter((c: any) => (c?.text ?? '').trim().length > 0);
    if (nonEmpty.length === 0) return false;
    return nonEmpty.every((c: any) => !!c?.bold);
  }

  /** True for the first non-empty, non-heading block of the current
      article — that's the paragraph that gets the drop-cap. */
  isBodyLede(par: any, index: number, content: any[] = this.contentBlocks()): boolean {
    if (!par) return false;
    if (this.isHeading(par)) return false;
    const text = (par?.children ?? []).map((c: any) => c?.text ?? '').join('').trim();
    if (!text) return false;
    for (let i = 0; i < index; i++) {
      const earlier = content[i];
      if (this.isHeading(earlier)) continue;
      const earlierText = (earlier?.children ?? []).map((c: any) => c?.text ?? '').join('').trim();
      if (earlierText) return false;
    }
    return true;
  }
}

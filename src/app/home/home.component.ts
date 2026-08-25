import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { ApiService } from '../api.service';
import { TranslateService } from '../translate/translate.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit, OnDestroy {
  innerHeight = window.innerHeight;

  /** Two background slots, swapped to cross-fade between cover photos. */
  imageA = '';
  imageB = '';
  /** Which slot is the active (visible) one — 'A' or 'B'. */
  activeSlot: 'A' | 'B' = 'A';
  private cycleHandle?: number;
  private currentIndex = 0;

  lang: string = 'en';

  /** Strapi About — verbatim project document. We render its content_blocks
      directly instead of paraphrasing project copy on the home. */
  about: any;

  /** Strapi Objectives — verbatim O1..O6 statements from the project
      proposal. Sorted by `order` from the API. */
  objectives: any[] = [];

  readonly images = [
    'url("assets/images/image_1.jpg")',
    'url("assets/images/image_2.jpg")',
    'url("assets/images/image_3.jpg")',
    'url("assets/images/image_4.jpg")',
    'url("assets/images/image_5.jpg")',
    'url("assets/images/image_6.jpg")',
  ];

  @HostListener('window:resize')
  onResize() {
    this.innerHeight = window.innerHeight;
  }

  constructor(
    private translateService: TranslateService,
    private apiService: ApiService,
  ) {
    this.lang = this.translateService.getLang();
    this.translateService.lang$.subscribe(value => {
      this.lang = value;
    });
  }

  ngOnInit(): void {
    // Cover image cross-fade — seed both slots, then cycle.
    this.currentIndex = Math.floor(Math.random() * this.images.length);
    this.imageA = this.images[this.currentIndex];
    this.imageB = this.images[(this.currentIndex + 1) % this.images.length];

    if (typeof window !== 'undefined' && window.matchMedia &&
        !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.cycleHandle = window.setInterval(() => {
        this.currentIndex = (this.currentIndex + 1) % this.images.length;
        const nextImage = this.images[this.currentIndex];
        if (this.activeSlot === 'A') {
          this.imageB = nextImage;
          this.activeSlot = 'B';
        } else {
          this.imageA = nextImage;
          this.activeSlot = 'A';
        }
      }, 9000);
    }

    // Pull verbatim project content for the manifesto + objectives sections.
    this.apiService.getAbout().subscribe((res: any) => {
      this.about = res?.data;
    });
    this.apiService.getObjectivesFull().subscribe((res: any) => {
      this.objectives = res?.data ?? [];
    });
  }

  ngOnDestroy(): void {
    if (this.cycleHandle !== undefined) {
      window.clearInterval(this.cycleHandle);
      this.cycleHandle = undefined;
    }
  }

  /** Pick the language-specific content_blocks slot from the About record.
      Falls back to English. Returns the array Strapi gives us so the
      template renders verbatim. */
  aboutBlocks(): any[] {
    if (!this.about) return [];
    const map: { [key: string]: string } = {
      ee: 'content_blocks_ee',
      gr: 'content_blocks_gr',
      no: 'content_blocks_no',
      pl: 'content_blocks_pl',
      ua: 'content_blocks_ua',
    };
    const key = map[this.lang] ?? 'content_blocks';
    return this.about?.[key] ?? this.about?.['content_blocks'] ?? [];
  }

  /** Same selector for objective records (their slot keys are `content`
      / `content_ee` / `content_gr` / …). */
  objectiveContent(obj: any): any[] {
    if (!obj) return [];
    const map: { [key: string]: string } = {
      ee: 'content_ee',
      gr: 'content_gr',
      no: 'content_no',
      pl: 'content_pl',
      ua: 'content_ua',
    };
    const key = map[this.lang] ?? 'content';
    return obj?.[key] ?? obj?.['content'] ?? [];
  }
}

import { Component, Inject, OnDestroy, OnInit, HostListener } from '@angular/core';
import { Subject, takeUntil, filter } from 'rxjs';
import { ChildrenOutletContexts, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { flip } from './animations';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TranslateService } from './translate/translate.service';

/**
 * Maps the project's internal language codes to the proper IETF/ISO
 * tags that `:lang()` and `<html lang>` consumers expect. Greek and
 * Estonian and Ukrainian especially differ between the country code
 * the project's i18n service uses (`gr`, `ee`, `ua`) and the spoken-
 * language code the web platform expects (`el`, `et`, `uk`).
 */
const LANG_TO_HTML_TAG: { [key: string]: string } = {
  en: 'en',
  ee: 'et',
  gr: 'el',
  no: 'no',
  pl: 'pl',
  ua: 'uk',
};

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  // animations: [
  //   flip
  // ]
})
export class AppComponent implements OnInit {
  title = 'pomeil';
  innerWidth = window.innerWidth;
  firstTimeHide = true;
  hideLogo: boolean = true;
  isDarkTheme: boolean = false;
  /** True when the active route is an individual escape-room page (not the
   *  hub). Drives the floating language picker that's only needed inside
   *  rooms — both because the toolbar gets hidden in fullscreen and
   *  because in-room language switching is the user-facing reason it
   *  exists. */
  isInEscapeRoom = false;
  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.innerWidth = window.innerWidth;
  }

  ngOnInit(): void {
    // Reflect the active translation language as the document's html
    // `lang` attribute. CSS `:lang(el)` can then disable Greek
    // text-transform: uppercase (which would otherwise leave accents
    // on capital letters — non-conventional in modern Greek
    // typography).
    this.applyHtmlLang(this.translateService.getLang());
    this.translateService.lang$.subscribe(value => this.applyHtmlLang(value));

    // Track whether the active route is inside a specific escape room
    // (e.g. /escape-rooms/empathy) — used to render the floating language
    // picker that survives the toolbar being hidden in fullscreen mode.
    // The hub `/escape-rooms` itself does NOT match (no trailing slug).
    this.isInEscapeRoom = this.matchesEscapeRoom(this.router.url);
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(event => {
        const url = (event as NavigationEnd).urlAfterRedirects || (event as NavigationEnd).url;
        this.isInEscapeRoom = this.matchesEscapeRoom(url);
      });
  }

  private matchesEscapeRoom(url: string): boolean {
    const path = (url || '').split('?')[0];
    return /^\/escape-rooms\/[a-z0-9-]+/.test(path);
  }

  private applyHtmlLang(lang: string): void {
    const tag = LANG_TO_HTML_TAG[lang] || lang || 'en';
    if (typeof document !== 'undefined') {
      document.documentElement.lang = tag;
    }
  }

  @HostListener('window:scroll', ['$event'])
  onWindowScroll(e: any) {

    if (window.pageYOffset > 100) {
      this.firstTimeHide = false;
      let element = document.getElementById('bottom-toolbar');
      if (element) {

        element.classList.add('sticky');
        element.classList.add('show-toolbar');
        element.classList.remove('hide-toolbar');
        this.hideLogo = false;
      }
    } else {
      let element = document.getElementById('bottom-toolbar');
      // element.classList.remove('sticky');
      if (element) {
        element.classList.remove('show-toolbar');
        if (this.firstTimeHide === false) {
          element.classList.add('hide-toolbar');
        }
      }
      this.hideLogo = true;
    }
  }

  constructor(
    private contexts: ChildrenOutletContexts,
    private translateService: TranslateService,
    private router: Router,
  ) {
  }

  prepareRoute(outlet: RouterOutlet) {
  
    // return outlet && outlet.activatedRouteData && outlet.activatedRouteData['animation'];
    return this.contexts.getContext('primary')?.route?.snapshot?.data?.['animation'];
  }
}


@Component({
  selector: "image-dialog",
  templateUrl: "./image-dialog.html",
  styleUrls: ["./image-dialog.scss"]
})
export class ImageDialog implements OnInit, OnDestroy {

  /** Sorted by id ascending so prev/next walk the gallery in upload order. */
  pics: any[] = [];
  currentIndex = 0;
  picSource: string = '';
  picText: string = '';
  /** True when the image has portrait aspect (≤ 0.9) — engages
      vertical-scroll mode so newsletter PDFs are readable at width
      rather than being shrunk to fit a 16:9 frame. */
  isPortrait = false;

  private destroy$ = new Subject<void>();

  constructor(
    public dialogRef: MatDialogRef<ImageDialog>,
    @Inject(MAT_DIALOG_DATA) public data: any,
  ) { }

  ngOnInit() {
    this.pics = [...(this.data?.pics || [])].sort((a: any, b: any) => a.id - b.id);
    const startIdx = this.pics.findIndex(p => p.id === this.data?.id);
    this.currentIndex = startIdx >= 0 ? startIdx : 0;
    this.applyCurrent();

    /* Material's MatDialogRef.keydownEvents() emits keydowns inside the
       dialog regardless of which focusable element is active, with
       NgZone change-detection guaranteed — so it's the right primitive
       for arrow-key gallery navigation. window/document HostListeners
       miss zone events that originate inside the CDK overlay. */
    this.dialogRef.keydownEvents()
      .pipe(takeUntil(this.destroy$))
      .subscribe(event => {
        if (event.key === 'ArrowLeft') {
          this.back();
          event.preventDefault();
        } else if (event.key === 'ArrowRight') {
          this.forward();
          event.preventDefault();
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private applyCurrent(): void {
    const pic = this.pics[this.currentIndex];
    if (!pic) return;
    this.picSource = pic.url;
    this.picText = pic.alternativeText || '';
    /* Strapi exposes width/height on the upload — use them if present so
       the layout switches to scroll-mode the instant the source changes,
       without waiting for the <img> load event to flip the flag. */
    this.isPortrait = !!(pic.height && pic.width && pic.height / pic.width >= 1.1);
  }

  get total(): number { return this.pics.length; }
  get hasMultiple(): boolean { return this.pics.length > 1; }
  get showBack(): boolean { return this.hasMultiple && this.currentIndex > 0; }
  get showForward(): boolean { return this.hasMultiple && this.currentIndex < this.pics.length - 1; }

  back(): void {
    if (!this.showBack) return;
    this.currentIndex--;
    this.applyCurrent();
    /* Keep `data.id` in sync so any caller still relying on it after
       close gets the last-viewed image. */
    this.data.id = this.pics[this.currentIndex]?.id;
  }

  forward(): void {
    if (!this.showForward) return;
    this.currentIndex++;
    this.applyCurrent();
    this.data.id = this.pics[this.currentIndex]?.id;
  }

  /** Switch image orientation flag once the actual <img> resolves so
      we recover gracefully if Strapi metadata is missing. */
  onImageLoad(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img.naturalWidth && img.naturalHeight) {
      this.isPortrait = img.naturalHeight / img.naturalWidth >= 1.1;
    }
  }

  /* Esc-to-close is provided by Material's default disableClose=false,
     so we don't need to wire it here. */

  onNoClick(): void {
    this.dialogRef.close();
  }
}
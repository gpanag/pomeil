import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  HostListener,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { LearningFlowService } from '../learning-flow.service';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Subject, takeUntil, catchError, of } from 'rxjs';
import { Flipbook, FlipbookPage, Spread, FlipbookBlock } from './flipbook.interfaces';
import { TranslateService } from '../../translate/translate.service';

type Direction = 'forward' | 'back' | 'none';

@Component({
    selector: 'app-flipbook',
    templateUrl: './flipbook.component.html',
    styleUrls: ['./flipbook.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})
export class FlipbookComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  private breakpoints = inject(BreakpointObserver);
  private learningService = inject(LearningFlowService);
  private translate = inject(TranslateService);

  flipbook: Flipbook | null = null;
  loading = true;
  error: string | null = null;

  /** True for narrow viewports — single page mode. */
  isMobile = false;

  /** Spread index (desktop). */
  spreadIndex = 0;

  /** Page index (mobile). */
  pageIndex = 0;

  /** Last navigation direction — drives entry animation. */
  direction: Direction = 'none';

  /** Local-only state for in-page interactivity (checklists, exercise inputs). */
  private checklistState = new Map<string, boolean>();
  private exerciseAnswers = new Map<string, string>();

  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    // This view is OnPush and the translate pipe is impure: without an explicit
    // re-check, labels rendered before the language file arrives stay as raw
    // keys (seen live on a direct /flipbook/... load, 2026-09-21).
    this.translate.langData$.pipe(takeUntil(this.destroy$)).subscribe(() => this.cdr.markForCheck());
    this.translate.lang$.pipe(takeUntil(this.destroy$)).subscribe(() => this.cdr.markForCheck());

    this.breakpoints
      .observe([Breakpoints.Handset, Breakpoints.TabletPortrait])
      .pipe(takeUntil(this.destroy$))
      .subscribe(state => {
        this.isMobile = state.matches;
        this.cdr.markForCheck();
      });

    const skillId = this.route.snapshot.paramMap.get('skillId');
    // Reading the module online counts as "module opened" for the learning-flow
    // gate (score < 80% → must open the module before the next skill).
    if (skillId) this.learningService.markModuleAcknowledged(skillId);
    if (!skillId) {
      this.error = 'No skill specified';
      this.loading = false;
      return;
    }

    this.http
      .get<Flipbook>(`assets/flipbooks/${skillId}.json`)
      .pipe(
        catchError(() => of(null)),
        takeUntil(this.destroy$),
      )
      .subscribe(book => {
        if (!book) {
          this.error = 'This curriculum is not yet available. Check back soon.';
        } else {
          this.flipbook = book;
        }
        this.loading = false;
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // --- Navigation ----------------------------------------------------------

  get totalPages(): number {
    return this.flipbook?.pages.length ?? 0;
  }

  /**
   * Total number of spreads. Spread 0 = cover alone (right side).
   * Subsequent spreads pair the remaining pages two at a time.
   */
  get totalSpreads(): number {
    if (this.totalPages === 0) return 0;
    if (this.totalPages === 1) return 1;
    return 1 + Math.ceil((this.totalPages - 1) / 2);
  }

  get currentSpread(): Spread | null {
    if (!this.flipbook) return null;
    const pages = this.flipbook.pages;
    if (this.spreadIndex === 0) {
      return {
        index: 0,
        left: null,
        right: pages[0] ?? null,
        leftPageNumber: null,
        rightPageNumber: pages[0] ? 1 : null,
      };
    }
    const leftIdx = (this.spreadIndex - 1) * 2 + 1;
    const rightIdx = leftIdx + 1;
    return {
      index: this.spreadIndex,
      left: pages[leftIdx] ?? null,
      right: pages[rightIdx] ?? null,
      leftPageNumber: pages[leftIdx] ? leftIdx + 1 : null,
      rightPageNumber: pages[rightIdx] ? rightIdx + 1 : null,
    };
  }

  get currentPage(): FlipbookPage | null {
    return this.flipbook?.pages[this.pageIndex] ?? null;
  }

  get atStart(): boolean {
    return this.isMobile ? this.pageIndex === 0 : this.spreadIndex === 0;
  }

  get atEnd(): boolean {
    if (!this.flipbook) return true;
    return this.isMobile
      ? this.pageIndex >= this.totalPages - 1
      : this.spreadIndex >= this.totalSpreads - 1;
  }

  next(): void {
    if (this.atEnd) return;
    this.direction = 'forward';
    if (this.isMobile) this.pageIndex++;
    else this.spreadIndex++;
    this.cdr.markForCheck();
  }

  prev(): void {
    if (this.atStart) return;
    this.direction = 'back';
    if (this.isMobile) this.pageIndex--;
    else this.spreadIndex--;
    this.cdr.markForCheck();
  }

  jumpTo(spreadOrPage: number): void {
    this.direction = spreadOrPage > (this.isMobile ? this.pageIndex : this.spreadIndex)
      ? 'forward'
      : 'back';
    if (this.isMobile) {
      this.pageIndex = Math.max(0, Math.min(this.totalPages - 1, spreadOrPage));
    } else {
      this.spreadIndex = Math.max(0, Math.min(this.totalSpreads - 1, spreadOrPage));
    }
    this.cdr.markForCheck();
  }

  exit(): void {
    this.router.navigate(['/learning/flow']);
  }

  // --- Keyboard navigation -------------------------------------------------

  @HostListener('window:keydown', ['$event'])
  onKey(e: KeyboardEvent): void {
    // Don't hijack keys while typing in form fields.
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

    if (e.key === 'ArrowRight' || e.key === 'PageDown') {
      e.preventDefault();
      this.next();
    } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      e.preventDefault();
      this.prev();
    } else if (e.key === 'Home') {
      e.preventDefault();
      this.jumpTo(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      this.jumpTo(this.isMobile ? this.totalPages - 1 : this.totalSpreads - 1);
    } else if (e.key === 'Escape') {
      this.exit();
    }
  }

  // --- Animation key (forces re-mount per spread/page) --------------------

  /** Used as *ngFor key so CSS animation re-fires on each navigation. */
  get animKey(): number {
    return this.isMobile ? this.pageIndex : this.spreadIndex;
  }

  trackByValue = (_: number, value: number) => value;

  // --- Block-level helpers -------------------------------------------------

  /** Type-narrowing helper for *ngIf templates. */
  asContent(p: FlipbookPage | null): { title: string; blocks: FlipbookBlock[] } | null {
    return p && p.type === 'content' ? p : null;
  }
  asCover(p: FlipbookPage | null) {
    return p && p.type === 'cover' ? p : null;
  }
  asBackCover(p: FlipbookPage | null) {
    return p && p.type === 'back-cover' ? p : null;
  }

  // --- Local interactivity (non-persistent) -------------------------------

  isChecked(pageIdx: number, itemIdx: number): boolean {
    return this.checklistState.get(`${pageIdx}:${itemIdx}`) ?? false;
  }
  toggleChecked(pageIdx: number, itemIdx: number): void {
    const key = `${pageIdx}:${itemIdx}`;
    this.checklistState.set(key, !this.checklistState.get(key));
    this.cdr.markForCheck();
  }
  exerciseAnswer(pageIdx: number, rowIdx: number): string {
    return this.exerciseAnswers.get(`${pageIdx}:${rowIdx}`) ?? '';
  }
  setExerciseAnswer(pageIdx: number, rowIdx: number, value: string): void {
    this.exerciseAnswers.set(`${pageIdx}:${rowIdx}`, value);
  }

  // --- Misc ---------------------------------------------------------------

  /** Resolve the absolute index of a page in flipbook.pages, given spread side. */
  pageIndexFor(spread: Spread | null, side: 'left' | 'right'): number {
    if (!spread) return -1;
    return side === 'left'
      ? (spread.leftPageNumber ?? 0) - 1
      : (spread.rightPageNumber ?? 0) - 1;
  }

  navigatePrimary(action: { route?: string; href?: string }): void {
    if (action.route) this.router.navigate([action.route]);
    else if (action.href) window.open(action.href, '_blank');
  }
}

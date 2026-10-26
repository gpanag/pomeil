import { Component, OnDestroy, OnInit, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { BreakpointObserver } from '@angular/cdk/layout';
import { MatSidenav } from '@angular/material/sidenav';
import { NavigationEnd, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '../../auth/auth.service';
import { LearningFlowService } from '../learning-flow.service';
import { LearningGuideDialogComponent } from '../learning-guide-dialog/learning-guide-dialog.component';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  exact: boolean;
  /** Optional gate — if returns false, the item is hidden. */
  visibleWhen?: () => boolean;
}

@Component({
    selector: 'app-learning-layout',
    templateUrl: './learning-layout.component.html',
    styleUrls: ['./learning-layout.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class LearningLayoutComponent implements OnInit, OnDestroy {
  @ViewChild('sidenav') sidenav!: MatSidenav;

  isMobile = false;
  private destroy$ = new Subject<void>();

  private allNavItems: NavItem[] = [
    { label: 'NAVIGATION.LEARNING_OVERVIEW', icon: 'school', route: '/learning', exact: true },
    { label: 'NAVIGATION.LEARNING_FLOW', icon: 'play_circle', route: '/learning/flow', exact: false },
    // NOTE: do not add an entry for /escape-rooms here. That page is a
    // test-only gallery — rooms opened from it record no score, skip the
    // module gate and advance nothing. Learners reach rooms only through
    // Learning Flow, which opens them with ?mode=learning.
    { label: 'NAVIGATION.DASHBOARD', icon: 'dashboard', route: '/learning/dashboard', exact: false,
      visibleWhen: () => this.hasPlayedAnyRoom },
    { label: 'NAVIGATION.YOUR_MODULES', icon: 'auto_stories', route: '/learning/your-modules', exact: false,
      visibleWhen: () => this.hasSelectedAnySkill || this.hasPlayedAnyRoom },
    { label: 'NAVIGATION.ALL_MODULES', icon: 'menu_book', route: '/learning/modules', exact: false },
    { label: 'NAVIGATION.QUESTIONNAIRE', icon: 'quiz', route: '/learning/questionnaire', exact: false,
      visibleWhen: () => this.hasCompletedAllSelected },
  ];

  /** Filtered list bound to template — recomputed each CD cycle. */
  get navItems(): NavItem[] {
    return this.allNavItems.filter(item => !item.visibleWhen || item.visibleWhen());
  }

  totalSkills = 30;

  get completedCount(): number {
    const scores = this.learningService.getAllRoomScores();
    return Object.keys(scores).length;
  }

  get hasPlayedAnyRoom(): boolean {
    return this.completedCount > 0;
  }

  get hasSelectedAnySkill(): boolean {
    return (this.learningService.getSelectedSkills() || []).length > 0;
  }

  /** True when every selected skill has a recorded room score. */
  get hasCompletedAllSelected(): boolean {
    const selected = this.learningService.getSelectedSkills() || [];
    if (selected.length === 0) return false;
    const scores = this.learningService.getAllRoomScores();
    return selected.every(id => !!scores[id]);
  }

  constructor(
    private breakpointObserver: BreakpointObserver,
    private router: Router,
    public auth: AuthService,
    private learningService: LearningFlowService,
    private dialog: MatDialog
  ) {}

  /** "Guide" button in the sidenav — how the journey works + how to play a room. */
  openGuide(): void {
    this.dialog.open(LearningGuideDialogComponent, {
      width: '640px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      autoFocus: false,
      data: { section: 'all' },
    });
  }

  ngOnInit(): void {
    this.breakpointObserver
      .observe('(max-width: 960px)')
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        this.isMobile = result.matches;
      });

    // Auto-close sidenav on navigation in mobile mode
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        if (this.isMobile && this.sidenav?.opened) {
          this.sidenav.close();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleSidenav(): void {
    this.sidenav.toggle();
  }
}

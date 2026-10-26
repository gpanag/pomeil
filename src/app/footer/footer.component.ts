import { Component, HostListener, ChangeDetectionStrategy } from '@angular/core';

@Component({
    selector: 'app-footer',
    templateUrl: './footer.component.html',
    styleUrl: './footer.component.scss',
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class FooterComponent {
  isDarkTheme: boolean = false;
  innerWidth = window.innerWidth;
  
  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.innerWidth = window.innerWidth;
  }
}

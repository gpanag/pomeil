import { Component, ChangeDetectionStrategy } from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
    selector: 'app-socials-menu',
    templateUrl: './socials-menu.component.html',
    styleUrl: './socials-menu.component.scss',
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class SocialsMenuComponent {
  constructor(iconRegistry: MatIconRegistry, sanitizer: DomSanitizer) {
    iconRegistry.addSvgIcon('facebook', sanitizer.bypassSecurityTrustResourceUrl('assets/icons/facebook.svg'));
    iconRegistry.addSvgIcon('instagram', sanitizer.bypassSecurityTrustResourceUrl('assets/icons/instagram.svg'));
    iconRegistry.addSvgIcon('twitter', sanitizer.bypassSecurityTrustResourceUrl('assets/icons/twitter.svg'));
    iconRegistry.addSvgIcon('youtube', sanitizer.bypassSecurityTrustResourceUrl('assets/icons/youtube.svg'));
    iconRegistry.addSvgIcon('linkedin', sanitizer.bypassSecurityTrustResourceUrl('assets/icons/linkedin.svg'));
  }
}

import { Component, Input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import iconData from './icon-data';

/**
 * Renders one of the 51 icons extracted from the Figma file (icon-data.ts). The actual screen
 * bundle (project/screens/Components.bundle.js) inlines most icon SVGs directly rather than
 * routing through this component/icon-data.js — use this for the handful of named icons that
 * do map cleanly (nav icons, generic UI chrome); inline the raw <path> for one-off icons that
 * don't have a named entry, exactly as the source does.
 */
@Component({
  selector: 'app-icon',
  standalone: true,
  template: `<svg [attr.width]="size" [attr.height]="size" [attr.viewBox]="viewBox()" fill="none" [innerHTML]="body()"></svg>`,
})
export class IconComponent {
  @Input({ required: true }) name!: string;
  @Input() size = 20;

  constructor(private readonly sanitizer: DomSanitizer) {}

  viewBox() {
    return iconData[this.name]?.viewBox ?? '0 0 24 24';
  }

  body() {
    const raw = iconData[this.name]?.body ?? '';
    return this.sanitizer.bypassSecurityTrustHtml(raw);
  }
}

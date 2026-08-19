import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * The EMHIP logo lockup — the three overlapping brand loops with the wordmark and strapline.
 *
 * The artwork lives in `client/public/brand/emhip-logo.svg` rather than inline markup, so
 * replacing it with an updated brand file is a straight file swap with no code change. The
 * path resolves against the document's `<base href>`, so it survives a sub-path deployment.
 */
@Component({
  selector: 'emhip-logo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <img
      class="logo"
      src="brand/emhip-logo.svg"
      alt="EMHIP — Ethnicity and Mental Health Improvement Project"
      [style.width.px]="width()"
      [attr.height]="null"
    />
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .logo {
        display: block;
        height: auto;
        max-width: 100%;
      }
    `,
  ],
})
export class EmhipLogoComponent {
  /** Rendered width in pixels; the lockup keeps its own aspect ratio. */
  readonly width = input(200);
}

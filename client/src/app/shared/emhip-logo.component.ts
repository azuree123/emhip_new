import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * The EMHIP logo lockup: the brand mark (the open arc from the design system, also used on the
 * DIALOG score card) alongside the wordmark. Used on the sign-in pages, where there is no
 * navigation chrome to identify the product.
 *
 * The mark is inline SVG rather than an image file so it stays crisp at any size, needs no
 * network request on the login screen, and inherits the brand colours from one place. If a
 * supplied logo file replaces it later, only this component changes.
 */
@Component({
  selector: 'emhip-logo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="logo" [class.logo--stacked]="stacked()">
      <svg
        class="logo__mark"
        [attr.width]="markSize()"
        [attr.height]="markSize()"
        viewBox="0 0 106 104"
        fill="none"
        role="img"
        [attr.aria-label]="showWordmark() ? null : 'EMHIP'"
        [attr.aria-hidden]="showWordmark() ? 'true' : null"
      >
        <g transform="matrix(1,0,0,-1,0,88.882)">
          <path
            d="M 52.972 88.882 C 23.764 88.882 0 65.555 0 36.882 L 19.456 36.882 C 19.456 55.024 34.491 69.783 52.972 69.783 C 71.453 69.783 86.488 55.024 86.488 36.882 C 86.488 28.056 82.976 19.768 76.597 13.547 L 90.312 0 C 100.392 9.835 105.943 22.932 105.943 36.884 C 105.944 65.556 82.18 88.882 52.972 88.882 Z"
            fill="#eb3c2c"
          />
        </g>
        <g transform="matrix(1,0,0,-1,0,104)">
          <path
            d="M 19.456 52 L 0 52 C 0 39.462 4.61 27.351 12.981 17.899 C 23.054 6.525 37.63 0 52.972 0 L 52.972 19.099 C 43.264 19.099 34.041 23.229 27.665 30.428 C 22.372 36.406 19.456 44.068 19.456 52 Z"
            fill="#941c3c"
          />
        </g>
      </svg>

      @if (showWordmark()) {
        <div class="logo__text">
          <span class="logo__wordmark">EMHIP</span>
          @if (tagline()) {
            <span class="logo__tagline">{{ tagline() }}</span>
          }
        </div>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .logo {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .logo--stacked {
        flex-direction: column;
        gap: 10px;
        text-align: center;
      }
      .logo__mark {
        flex-shrink: 0;
      }
      .logo__text {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .logo__wordmark {
        font-family: 'Plus Jakarta Sans', sans-serif;
        font-weight: 700;
        font-size: 22px;
        letter-spacing: 0.5px;
        line-height: 1.1;
        color: #941c3c;
      }
      .logo__tagline {
        font-size: 12px;
        line-height: 1.3;
        color: #6b6b6b;
      }
    `,
  ],
})
export class EmhipLogoComponent {
  /** Pixel size of the square brand mark. */
  readonly markSize = input(40);
  readonly showWordmark = input(true);
  readonly stacked = input(false);
  /** Optional supporting line under the wordmark, e.g. the service name. */
  readonly tagline = input<string | null>(null);
}

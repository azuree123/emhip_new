import { ChangeDetectionStrategy, Component, DOCUMENT, afterNextRender, inject } from '@angular/core';

/** sharpai (white-labelled LeadConnector) loader — sizes and wires up the form iframe. Allowed by the nginx CSP. */
const FORM_EMBED_SCRIPT = 'https://ai.sharpai.app/js/form_embed.js';

/**
 * EMHIP Support — the sharpai support form, embedded as a page of the portal rather than
 * appended to index.html under every screen.
 */
@Component({
  selector: 'app-support',
  standalone: true,
  templateUrl: './support.component.html',
  styleUrl: './support.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupportComponent {
  private readonly document = inject(DOCUMENT);

  constructor() {
    // form_embed.js scans the page for its iframes when it runs, so it is added only once the
    // iframe has rendered — and re-added on every visit, since leaving the page destroys the iframe.
    // The script guards its own global listeners, so loading it again is harmless.
    afterNextRender(() => {
      this.document.querySelector(`script[src="${FORM_EMBED_SCRIPT}"]`)?.remove();
      const script = this.document.createElement('script');
      script.src = FORM_EMBED_SCRIPT;
      this.document.body.appendChild(script);
    });
  }
}

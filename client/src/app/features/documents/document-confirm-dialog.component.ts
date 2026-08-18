import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

/**
 * The confirmation modal behind every destructive document action, in the same chrome as the
 * reports "Export to Excel" dialog (dimmed overlay, white r12 card, gray header bar).
 *
 * Two shapes, driven by the optional inputs:
 *  - `reasonLabel` set — soft delete: an optional free-text reason passed to DELETE /documents/{id}.
 *  - `typedConfirmation` set — purge: the operator has to type the phrase back before the
 *    confirm button unlocks, because purging removes the stored file as well as the record.
 */
@Component({
  selector: 'app-document-confirm-dialog',
  standalone: true,
  templateUrl: './document-confirm-dialog.component.html',
  styleUrl: './document-confirm-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentConfirmDialogComponent {
  readonly title = input.required<string>();
  readonly message = input.required<string>();
  readonly confirmLabel = input('Confirm');
  /** 'danger' paints the confirm button maroon and adds the warning strip. */
  readonly tone = input<'default' | 'danger'>('default');
  /** When set, an optional reason textarea is shown and its value comes back with `confirmed`. */
  readonly reasonLabel = input<string | null>(null);
  /** When set, the operator must type this phrase exactly before confirming. */
  readonly typedConfirmation = input<string | null>(null);
  /** Extra red-tinted warning shown above the actions (purge's "the file is removed too"). */
  readonly warning = input<string | null>(null);
  readonly busy = input(false);
  readonly error = input<string | null>(null);

  /** Emits the typed reason (or null when there is no reason field / it was left blank). */
  readonly confirmed = output<string | null>();
  readonly cancelled = output<void>();

  protected readonly reason = signal('');
  protected readonly typed = signal('');

  protected readonly canConfirm = computed(() => {
    if (this.busy()) {
      return false;
    }
    const phrase = this.typedConfirmation();
    return !phrase || this.typed().trim().toUpperCase() === phrase.toUpperCase();
  });

  protected onReasonInput(event: Event): void {
    this.reason.set((event.target as HTMLTextAreaElement).value);
  }

  protected onTypedInput(event: Event): void {
    this.typed.set((event.target as HTMLInputElement).value);
  }

  protected confirm(): void {
    if (!this.canConfirm()) {
      return;
    }
    const reason = this.reason().trim();
    this.confirmed.emit(reason ? reason : null);
  }

  protected cancel(): void {
    if (this.busy()) {
      return;
    }
    this.cancelled.emit();
  }
}

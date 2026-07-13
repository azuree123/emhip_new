import { Component, EventEmitter, Output, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AddNoteRequest, GuestOverviewDto, NoteColor } from '../../core/api-models';
import { GuestsApiService } from '../../core/guests-api.service';
import { formatDate, noteColorDot } from './guest-workspace.util';

/**
 * Notes tab — no dedicated "list all notes" endpoint exists on GuestsApiService, so this
 * reuses the pinned notes already carried on GuestOverviewDto (fetched once by the parent
 * workspace component) and adds a form to create a new note via addNote. After a successful
 * save it asks the parent to reload the overview so a newly pinned note appears immediately.
 */
@Component({
  selector: 'app-guest-notes-tab',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './guest-notes-tab.component.html',
  styleUrl: './guest-notes-tab.component.scss',
})
export class GuestNotesTabComponent {
  private readonly guestsApi = inject(GuestsApiService);

  readonly overview = input.required<GuestOverviewDto>();
  @Output() readonly refresh = new EventEmitter<void>();

  readonly submitting = signal(false);
  readonly submitError = signal<string | null>(null);

  readonly noteColorDot = noteColorDot;
  readonly formatDate = formatDate;

  readonly colors: NoteColor[] = ['Yellow', 'Green', 'Orange', 'Purple'];

  form: AddNoteRequest = { body: '', color: 'Yellow', isPinned: true };

  submit(): void {
    if (!this.form.body.trim()) {
      this.submitError.set('Note text is required.');
      return;
    }
    this.submitting.set(true);
    this.submitError.set(null);
    this.guestsApi.addNote(this.overview().id, this.form).subscribe({
      next: () => {
        this.submitting.set(false);
        this.form = { body: '', color: 'Yellow', isPinned: true };
        this.refresh.emit();
      },
      error: () => {
        this.submitting.set(false);
        this.submitError.set('Could not save this note. Please try again.');
      },
    });
  }
}

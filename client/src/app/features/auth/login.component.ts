import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../core/auth.service';
import { EmhipLogoComponent } from '../../shared/emhip-logo.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, EmhipLogoComponent],
  templateUrl: './login.component.html',
  styleUrl: './auth-page.scss',
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  /** Why the user landed here without asking to (idle sign-out, expired session). */
  readonly notice = signal<string | null>(
    (() => {
      const reason = this.route.snapshot.queryParamMap.get('reason');
      if (reason === 'idle') return 'You were signed out after a period of inactivity, to protect guest records on an unattended screen.';
      if (reason === 'expired') return 'Your session expired. Please sign in again.';
      return null;
    })(),
  );

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    const { email, password } = this.form.getRawValue();
    this.auth.login(email, password).subscribe({
      next: () => this.router.navigateByUrl('/dashboard'),
      error: (err: HttpErrorResponse) => {
        this.submitting.set(false);
        this.errorMessage.set(
          err.status === 401
            ? 'Invalid email or password.'
            : err.status === 429
              ? 'Too many sign-in attempts. Please wait a minute and try again.'
              : 'Something went wrong. Please try again.',
        );
      },
    });
  }
}

import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AdminUsersApiService, AdminRolesApiService, RoleSummaryDto, UserSummaryDto } from '../../core/admin-api.service';
import { AuthService } from '../../core/auth.service';

interface UserForm {
  email: string;
  displayName: string;
  hubId: string;
  isActive: boolean;
  temporaryPassword: string;
  roles: string[];
}

function emptyForm(defaultHubId: string): UserForm {
  return { email: '', displayName: '', hubId: defaultHubId, isActive: true, temporaryPassword: '', roles: [] };
}

/**
 * Admin-only "Hub Workers" screen — staff account provisioning. There's no self-registration by
 * design (see AdminUsersController); admins create accounts here with a temporary password and
 * assign roles, which is what actually grants API access via the granular permission system.
 */
@Component({
  selector: 'app-hub-workers',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './hub-workers.component.html',
  styleUrl: './admin.scss',
})
export class HubWorkersComponent implements OnInit {
  private readonly usersApi = inject(AdminUsersApiService);
  private readonly rolesApi = inject(AdminRolesApiService);
  private readonly auth = inject(AuthService);

  readonly users = signal<UserSummaryDto[]>([]);
  readonly roles = signal<RoleSummaryDto[]>([]);
  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);

  readonly modalOpen = signal(false);
  readonly editingUserId = signal<string | null>(null);
  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);
  form: UserForm = emptyForm('');

  readonly resetPasswordUserId = signal<string | null>(null);
  resetPasswordValue = '';

  ngOnInit(): void {
    this.load();
    this.rolesApi.getRoles().subscribe((roles) => this.roles.set(roles));
  }

  load(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.usersApi.getUsers().subscribe({
      next: (users) => {
        this.users.set(users);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set('Could not load hub workers.');
        this.loading.set(false);
      },
    });
  }

  openCreate(): void {
    this.editingUserId.set(null);
    this.form = emptyForm(this.auth.current().hubId);
    this.saveError.set(null);
    this.modalOpen.set(true);
  }

  openEdit(user: UserSummaryDto): void {
    this.editingUserId.set(user.id);
    this.form = {
      email: user.email,
      displayName: user.displayName,
      hubId: user.hubId,
      isActive: user.isActive,
      temporaryPassword: '',
      roles: [...user.roles],
    };
    this.saveError.set(null);
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
  }

  toggleRole(roleName: string): void {
    this.form.roles = this.form.roles.includes(roleName)
      ? this.form.roles.filter((r) => r !== roleName)
      : [...this.form.roles, roleName];
  }

  submit(): void {
    if (this.saving()) return;
    this.saving.set(true);
    this.saveError.set(null);

    const editingId = this.editingUserId();
    const request: Observable<unknown> = editingId
      ? this.usersApi.updateUser(editingId, {
          displayName: this.form.displayName,
          hubId: this.form.hubId,
          isActive: this.form.isActive,
          roles: this.form.roles,
        })
      : this.usersApi.createUser({
          email: this.form.email,
          displayName: this.form.displayName,
          hubId: this.form.hubId,
          temporaryPassword: this.form.temporaryPassword,
          roles: this.form.roles,
        });

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.modalOpen.set(false);
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.saveError.set(err.error?.message ?? 'Could not save this hub worker.');
      },
    });
  }

  deactivate(user: UserSummaryDto): void {
    if (!confirm(`Deactivate ${user.displayName}? They will no longer be able to sign in.`)) return;
    this.usersApi.deactivateUser(user.id).subscribe(() => this.load());
  }

  openResetPassword(user: UserSummaryDto): void {
    this.resetPasswordUserId.set(user.id);
    this.resetPasswordValue = '';
  }

  closeResetPassword(): void {
    this.resetPasswordUserId.set(null);
  }

  submitResetPassword(): void {
    const userId = this.resetPasswordUserId();
    if (!userId || !this.resetPasswordValue) return;
    this.usersApi.resetPassword(userId, this.resetPasswordValue).subscribe(() => this.closeResetPassword());
  }
}

import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AdminRolesApiService, PermissionGroupDto, RoleSummaryDto } from '../../core/admin-api.service';

interface RoleForm {
  name: string;
  description: string;
  permissions: string[];
}

function emptyForm(): RoleForm {
  return { name: '', description: '', permissions: [] };
}

const BUILT_IN_ROLES = ['Cmhw', 'HubManager', 'Admin'];

/**
 * Admin-only "Roles & Permissions" screen — the editor for the granular permission catalog
 * (AdminRolesController). Permissions themselves are a fixed catalog; roles are admin-editable
 * named sets of them, which is what actually gets enforced via ASP.NET Core policies.
 */
@Component({
  selector: 'app-role-management',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './role-management.component.html',
  styleUrl: './admin.scss',
})
export class RoleManagementComponent implements OnInit {
  private readonly rolesApi = inject(AdminRolesApiService);

  readonly roles = signal<RoleSummaryDto[]>([]);
  readonly permissionGroups = signal<PermissionGroupDto[]>([]);
  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);

  readonly modalOpen = signal(false);
  readonly editingRoleId = signal<string | null>(null);
  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);
  form: RoleForm = emptyForm();

  readonly isBuiltIn = (roleName: string) => BUILT_IN_ROLES.includes(roleName);

  ngOnInit(): void {
    this.load();
    this.rolesApi.getPermissionCatalog().subscribe((groups) => this.permissionGroups.set(groups));
  }

  load(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.rolesApi.getRoles().subscribe({
      next: (roles) => {
        this.roles.set(roles);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set('Could not load roles.');
        this.loading.set(false);
      },
    });
  }

  openCreate(): void {
    this.editingRoleId.set(null);
    this.form = emptyForm();
    this.saveError.set(null);
    this.modalOpen.set(true);
  }

  openEdit(role: RoleSummaryDto): void {
    this.editingRoleId.set(role.id);
    this.form = { name: role.name, description: role.description ?? '', permissions: [...role.permissions] };
    this.saveError.set(null);
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
  }

  togglePermission(permission: string): void {
    this.form.permissions = this.form.permissions.includes(permission)
      ? this.form.permissions.filter((p) => p !== permission)
      : [...this.form.permissions, permission];
  }

  submit(): void {
    if (this.saving()) return;
    this.saving.set(true);
    this.saveError.set(null);

    const editingId = this.editingRoleId();
    const request: Observable<unknown> = editingId
      ? this.rolesApi.updateRole(editingId, { description: this.form.description || null, permissions: this.form.permissions })
      : this.rolesApi.createRole({
          name: this.form.name,
          description: this.form.description || null,
          permissions: this.form.permissions,
        });

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.modalOpen.set(false);
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.saveError.set(err.error?.message ?? 'Could not save this role.');
      },
    });
  }

  deleteRole(role: RoleSummaryDto): void {
    if (!confirm(`Delete role "${role.name}"? Staff assigned to it will lose the permissions it grants.`)) return;
    this.rolesApi.deleteRole(role.id).subscribe(() => this.load());
  }
}

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface UserSummaryDto {
  id: string;
  email: string;
  displayName: string;
  hubId: string;
  isActive: boolean;
  roles: string[];
}

export interface CreateUserRequest {
  email: string;
  displayName: string;
  hubId: string;
  temporaryPassword: string;
  roles: string[];
}

export interface UpdateUserRequest {
  displayName: string;
  hubId: string;
  isActive: boolean;
  roles: string[];
}

export interface RoleSummaryDto {
  id: string;
  name: string;
  description: string | null;
  permissions: string[];
}

export interface CreateRoleRequest {
  name: string;
  description: string | null;
  permissions: string[];
}

export interface UpdateRoleRequest {
  description: string | null;
  permissions: string[];
}

export interface PermissionGroupDto {
  group: string;
  permissions: string[];
}

/** Maps 1:1 to AdminUsersController — user provisioning, always admin-created (no self-registration). */
@Injectable({ providedIn: 'root' })
export class AdminUsersApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/admin/users`;

  getUsers(): Observable<UserSummaryDto[]> {
    return this.http.get<UserSummaryDto[]>(this.base);
  }

  createUser(request: CreateUserRequest): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(this.base, request);
  }

  updateUser(userId: string, request: UpdateUserRequest): Observable<void> {
    return this.http.put<void>(`${this.base}/${userId}`, request);
  }

  deactivateUser(userId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${userId}`);
  }

  resetPassword(userId: string, newPassword: string): Observable<void> {
    return this.http.post<void>(`${this.base}/${userId}/reset-password`, { newPassword });
  }
}

/** Maps 1:1 to AdminRolesController — role editor, permissions are a fixed catalog, roles are editable sets of them. */
@Injectable({ providedIn: 'root' })
export class AdminRolesApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/admin/roles`;

  getRoles(): Observable<RoleSummaryDto[]> {
    return this.http.get<RoleSummaryDto[]>(this.base);
  }

  getPermissionCatalog(): Observable<PermissionGroupDto[]> {
    return this.http.get<PermissionGroupDto[]>(`${this.base}/permissions`);
  }

  createRole(request: CreateRoleRequest): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(this.base, request);
  }

  updateRole(roleId: string, request: UpdateRoleRequest): Observable<void> {
    return this.http.put<void>(`${this.base}/${roleId}`, request);
  }

  deleteRole(roleId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${roleId}`);
  }
}

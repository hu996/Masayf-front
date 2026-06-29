import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { catchError, finalize, forkJoin, of, switchMap } from 'rxjs';
import { AdminPermissionsService } from '../services/admin-permissions.service';
import { AdminRolesService } from '../services/admin-roles.service';
import { AdminUsersService } from '../services/admin-users.service';
import { AdminPermissionGroup } from '../models/admin-permission.model';
import { AdminRoleRow } from '../models/admin-role.model';
import { AdminUserRow } from '../models/admin-user.model';

type TargetMode = 'role' | 'user';

@Component({
  selector: 'app-admin-permissions',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  templateUrl: './admin-permissions.component.html',
  styleUrl: './admin-permissions.component.scss'
})
export class AdminPermissionsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly permissionsService = inject(AdminPermissionsService);
  private readonly rolesService = inject(AdminRolesService);
  private readonly usersService = inject(AdminUsersService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly errorMessage = signal('');
  readonly catalog = signal<AdminPermissionGroup[]>([]);
  readonly roles = signal<AdminRoleRow[]>([]);
  readonly users = signal<AdminUserRow[]>([]);
  readonly selectedPermissions = signal<string[]>([]);
  readonly mode = signal<TargetMode>('role');

  readonly form = this.fb.nonNullable.group({
    targetId: ['']
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    forkJoin({
      catalog: this.permissionsService.getCatalog().pipe(catchError(() => of([] as AdminPermissionGroup[]))),
      roles: this.rolesService.getRoles().pipe(catchError(() => of([] as AdminRoleRow[]))),
      users: this.usersService.getUsers('').pipe(catchError(() => of([] as AdminUserRow[])))
    }).pipe(
      finalize(() => this.loading.set(false))
    ).subscribe(({ catalog, roles, users }) => {
      this.catalog.set(catalog);
      this.roles.set(roles);
      this.users.set(users);

      const firstTarget = this.getTargets()[0];
      if (firstTarget) {
        this.selectTarget(String(firstTarget.id));
      }
    });
  }

  getTargets(): Array<AdminRoleRow | AdminUserRow> {
    return this.mode() === 'role' ? this.roles() : this.users();
  }

  changeMode(mode: TargetMode): void {
    if (this.mode() === mode) {
      return;
    }

    this.mode.set(mode);
    this.form.reset({ targetId: '' });
    this.selectedPermissions.set([]);
    const firstTarget = this.getTargets()[0];
    if (firstTarget) {
      this.selectTarget(String(firstTarget.id));
    }
  }

  selectTarget(targetId: string): void {
    this.form.patchValue({ targetId });

    if (this.mode() === 'role') {
      this.rolesService.getRolePermissions(targetId).pipe(catchError(() => of([] as string[]))).subscribe((keys) => {
        this.selectedPermissions.set(keys);
      });
      return;
    }

    this.permissionsService.getUserPermissions(targetId).pipe(catchError(() => of([] as string[]))).subscribe((keys) => {
      this.selectedPermissions.set(keys);
    });
  }

  isSelected(permissionKey: string): boolean {
    return this.selectedPermissions().includes(permissionKey);
  }

  togglePermission(permissionKey: string, checked: boolean): void {
    this.selectedPermissions.update((current) =>
      checked ? [...new Set([...current, permissionKey])] : current.filter((item) => item !== permissionKey)
    );
  }

  save(): void {
    const targetId = this.form.controls.targetId.value;
    if (!targetId) {
      this.errorMessage.set('اختر دورًا أو مستخدمًا أولًا.');
      return;
    }

    this.saving.set(true);
    const keys = [...new Set(this.selectedPermissions())];
    const request = this.mode() === 'role'
      ? this.rolesService.updateRolePermissions(targetId, keys)
      : this.permissionsService.updateUserPermissions(targetId, keys);

    request.pipe(
      catchError((error: unknown) => {
        this.errorMessage.set(error instanceof Error ? error.message : 'تعذر حفظ الصلاحيات.');
        return of(null);
      }),
      finalize(() => this.saving.set(false))
    ).subscribe((result) => {
      if (result !== null) {
        this.load();
      }
    });
  }

  currentTargetLabel(): string {
    const targetId = this.form.controls.targetId.value;
    const target = this.getTargets().find((item) => String(item.id) === targetId);
    return target ? this.targetLabel(target) : '—';
  }

  targetLabel(target: AdminRoleRow | AdminUserRow): string {
    return this.mode() === 'role' ? (target as AdminRoleRow).name : (target as AdminUserRow).fullName;
  }
}

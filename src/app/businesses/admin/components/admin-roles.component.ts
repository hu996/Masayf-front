import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, finalize, of, switchMap } from 'rxjs';
import { AdminPermissionGroup } from '../models/admin-permission.model';
import { AdminRoleFormValue, AdminRoleRow } from '../models/admin-role.model';
import { AdminPermissionsService } from '../services/admin-permissions.service';
import { AdminRolesService } from '../services/admin-roles.service';

@Component({
  selector: 'app-admin-roles',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  templateUrl: './admin-roles.component.html',
  styleUrl: './admin-roles.component.scss'
})
export class AdminRolesComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly rolesService = inject(AdminRolesService);
  private readonly permissionsService = inject(AdminPermissionsService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly errorMessage = signal('');
  readonly roles = signal<AdminRoleRow[]>([]);
  readonly selectedRoleId = signal<string | null>(null);
  readonly catalog = signal<AdminPermissionGroup[]>([]);
  readonly selectedPermissions = signal<string[]>([]);

  readonly filterForm = this.fb.nonNullable.group({
    search: ['']
  });

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    description: ['']
  });

  readonly selectedRole = computed(() => this.roles().find((role) => String(role.id) === this.selectedRoleId()) ?? null);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    const search = this.filterForm.controls.search.value;

    this.rolesService.getRoles(search).pipe(
      switchMap((roles) =>
        this.permissionsService.getCatalog().pipe(
          catchError(() => of([] as AdminPermissionGroup[])),
          switchMap((catalog) => {
            this.roles.set(roles);
            this.catalog.set(catalog);
            if (!this.selectedRoleId() && roles.length) {
              this.selectRole(roles[0]);
            }
            return of(null);
          })
        )
      ),
      catchError((error: unknown) => {
        this.errorMessage.set(error instanceof Error ? error.message : 'تعذر تحميل الأدوار.');
        return of(null);
      }),
      finalize(() => this.loading.set(false))
    ).subscribe();
  }

  selectRole(role: AdminRoleRow): void {
    this.selectedRoleId.set(String(role.id));
    this.form.patchValue({
      name: role.name,
      description: role.description ?? ''
    });

    if (role.permissionKeys?.length) {
      this.selectedPermissions.set([...role.permissionKeys]);
      return;
    }

    this.rolesService.getRolePermissions(String(role.id)).pipe(
      catchError(() => of([] as string[]))
    ).subscribe((permissionKeys) => this.selectedPermissions.set(permissionKeys));
  }

  togglePermission(permissionKey: string, checked: boolean): void {
    this.selectedPermissions.update((current) =>
      checked ? [...new Set([...current, permissionKey])] : current.filter((item) => item !== permissionKey)
    );
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    const payload = this.buildPayload();
    const currentId = this.selectedRoleId();
    const request = currentId
      ? this.rolesService.updateRole(currentId, payload).pipe(
        switchMap((role) => this.rolesService.updateRolePermissions(String(role.id), payload.permissionKeys).pipe(switchMap(() => of(role))))
      )
      : this.rolesService.createRole(payload).pipe(
        switchMap((role) => this.rolesService.updateRolePermissions(String(role.id), payload.permissionKeys).pipe(switchMap(() => of(role))))
      );

    request.pipe(
      catchError((error: unknown) => {
        this.errorMessage.set(error instanceof Error ? error.message : 'تعذر حفظ الدور.');
        return of(null);
      }),
      finalize(() => this.saving.set(false))
    ).subscribe((role) => {
      if (role) {
        this.selectedRoleId.set(String(role.id));
        this.load();
      }
    });
  }

  remove(role: AdminRoleRow): void {
    if (!confirm(`حذف الدور "${role.name}"؟`)) {
      return;
    }

    this.rolesService.deleteRole(String(role.id)).pipe(
      catchError((error: unknown) => {
        this.errorMessage.set(error instanceof Error ? error.message : 'تعذر حذف الدور.');
        return of(null);
      })
    ).subscribe((result) => {
      if (result !== null) {
        this.resetForm();
        this.load();
      }
    });
  }

  resetForm(): void {
    this.selectedRoleId.set(null);
    this.form.reset({ name: '', description: '' });
    this.selectedPermissions.set([]);
  }

  isSelected(permissionKey: string): boolean {
    return this.selectedPermissions().includes(permissionKey);
  }

  isSelectedRole(role: AdminRoleRow): boolean {
    return String(role.id) === this.selectedRoleId();
  }

  private buildPayload(): AdminRoleFormValue {
    return {
      name: this.form.controls.name.value.trim(),
      description: this.form.controls.description.value.trim() || undefined,
      permissionKeys: [...new Set(this.selectedPermissions())]
    };
  }
}

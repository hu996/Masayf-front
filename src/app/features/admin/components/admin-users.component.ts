import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { catchError, finalize, of } from 'rxjs';
import { AdminUserFormValue, AdminUserRow } from '../models/admin-user.model';
import { AdminUsersService } from '../services/admin-users.service';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  templateUrl: './admin-users.component.html',
  styleUrl: './admin-users.component.scss'
})
export class AdminUsersComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(AdminUsersService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly errorMessage = signal('');
  readonly items = signal<AdminUserRow[]>([]);
  readonly editingId = signal<string | null>(null);

  readonly filterForm = this.fb.nonNullable.group({
    search: ['']
  });

  readonly form = this.fb.nonNullable.group({
    fullName: [''],
    userName: [''],
    email: [''],
    password: [''],
    roles: this.fb.nonNullable.control<string[]>(['Moderator'])
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    const search = this.filterForm.controls.search.value;
    this.service.getUsers(search).pipe(
      catchError((error: unknown) => {
        this.errorMessage.set(error instanceof Error ? error.message : 'تعذر تحميل المستخدمين.');
        return of([] as AdminUserRow[]);
      }),
      finalize(() => this.loading.set(false))
    ).subscribe((items) => this.items.set(items));
  }

  save(): void {
    this.saving.set(true);
    const payload = this.buildPayload();
    const request = this.editingId()
      ? this.service.updateUser(this.editingId()!, payload)
      : this.service.createUser({ ...payload, password: payload.password || 'ChangeMe123!' });

    request.pipe(
      catchError((error: unknown) => {
        this.errorMessage.set(error instanceof Error ? error.message : 'تعذر حفظ المستخدم.');
        return of(null);
      }),
      finalize(() => this.saving.set(false))
    ).subscribe((result) => {
      if (result) {
        this.resetForm();
        this.load();
      }
    });
  }

  edit(item: AdminUserRow): void {
    this.editingId.set(String(item.id));
    this.form.patchValue({
      fullName: item.fullName,
      userName: item.userName,
      email: item.email,
      password: '',
      roles: item.roles?.length ? item.roles : ['Moderator']
    });
  }

  toggle(item: AdminUserRow): void {
    this.service.toggleActive(String(item.id)).subscribe(() => this.load());
  }

  resetForm(): void {
    this.editingId.set(null);
    this.form.reset({
      fullName: '',
      userName: '',
      email: '',
      password: '',
      roles: ['Moderator']
    });
  }

  private buildPayload(): AdminUserFormValue {
    return {
      fullName: this.form.controls.fullName.value,
      userName: this.form.controls.userName.value,
      email: this.form.controls.email.value,
      password: this.form.controls.password.value || undefined,
      roles: this.form.controls.roles.value?.length ? this.form.controls.roles.value : ['Moderator']
    };
  }
}

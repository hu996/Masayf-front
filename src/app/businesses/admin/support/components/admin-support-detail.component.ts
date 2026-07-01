import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FileUploaderComponent } from '@app/shared/components/file-uploader/file-uploader.component';
import { resolveMediaUrl } from '@app/core/utils/media-url.util';
import { SupportService } from '@app/core/services/support.service';
import { AdminUsersService } from '../../users/services/admin-users.service';
import { AdminAccessService } from '../../shared/services/admin-access.service';
import {
  SupportTicketAttachment,
  SupportTicketDetails,
  SupportTicketReply,
  SupportTicketStatus,
  normalizeSupportStatus,
  supportPriorityLabel,
  supportTicketStatusOptions,
  supportTypeLabel
} from '@app/core/models/support-ticket.model';
import { ToastService } from '@app/core/services/toast.service';

@Component({
  selector: 'app-admin-support-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FileUploaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-support-detail.component.html',
  styleUrl: './admin-support-detail.component.scss'
})
export class AdminSupportDetailComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly support = inject(SupportService);
  private readonly usersService = inject(AdminUsersService);
  private readonly access = inject(AdminAccessService);
  private readonly toast = inject(ToastService);

  readonly ticket = signal<SupportTicketDetails | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly actionError = signal('');
  readonly replyAttachments = signal<File[]>([]);
  readonly assignees = signal<Array<{ id: string; label: string }>>([]);

  readonly canReply = computed(() => this.access.canAccess('admin.support.reply'));
  readonly canAssign = computed(() => this.access.canAccess('admin.support.assign'));
  readonly canClose = computed(() => this.access.canAccess('admin.support.close'));
  readonly canDelete = computed(() => this.access.canAccess('admin.support.delete'));

  readonly replyForm = this.fb.nonNullable.group({
    message: ['', [Validators.required, Validators.minLength(3)]],
    status: ['InProgress' as SupportTicketStatus],
    assigneeUserId: ['']
  });

  readonly statusOptions = supportTicketStatusOptions;

  ngOnInit(): void {
    this.loadAssignees();

    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const id = params.get('id') ?? '';
      if (!id) {
        void this.router.navigateByUrl('/admin/support');
        return;
      }

      this.loadTicket(id);
    });
  }

  back(): void {
    void this.router.navigateByUrl('/admin/support');
  }

  loadTicket(id: string): void {
    this.loading.set(true);
    this.error.set('');
    this.actionError.set('');

    this.support.getTicket(id).pipe(
      catchError((error: unknown) => {
        this.error.set(error instanceof Error ? error.message : 'تعذر تحميل تفاصيل التذكرة.');
        return of(null);
      }),
      finalize(() => this.loading.set(false))
    ).subscribe((ticket) => {
      if (!ticket) {
        this.ticket.set(null);
        return;
      }

      this.ticket.set(ticket);
      this.replyForm.patchValue({
        status: ticket.status,
        assigneeUserId: ticket.assignedToId ?? ''
      });
    });
  }

  saveReply(): void {
    if (!this.canReply()) {
      return;
    }

    const ticket = this.ticket();
    if (!ticket) {
      return;
    }

    if (this.replyForm.controls.message.invalid) {
      this.replyForm.controls.message.markAsTouched();
      return;
    }

    this.saving.set(true);
    this.actionError.set('');

    this.support.replyTicket(
      ticket.id,
      {
        message: this.replyForm.controls.message.value.trim(),
        isInternal: false
      },
      this.replyAttachments()
    ).pipe(
      catchError((error: unknown) => {
        this.actionError.set(error instanceof Error ? error.message : 'تعذر إرسال الرد.');
        return of(null);
      }),
      finalize(() => this.saving.set(false))
    ).subscribe((updated) => {
      if (!updated) {
        return;
      }

      this.ticket.set(updated);
      this.replyForm.patchValue({
        message: '',
        status: updated.status,
        assigneeUserId: updated.assignedToId ?? ''
      });
      this.replyAttachments.set([]);
      this.toast.show('تم إرسال الرد بنجاح.', 'success');
      void this.router.navigateByUrl(`/admin/support/${updated.id}`);
    });
  }

  saveStatus(): void {
    if (!this.canClose()) {
      return;
    }

    const ticket = this.ticket();
    if (!ticket) {
      return;
    }

    this.saving.set(true);
    this.actionError.set('');

    this.support.updateStatus(ticket.id, {
      status: normalizeSupportStatus(this.replyForm.controls.status.value),
      note: null
    }).pipe(
      catchError((error: unknown) => {
        this.actionError.set(error instanceof Error ? error.message : 'تعذر تحديث الحالة.');
        return of(null);
      }),
      finalize(() => this.saving.set(false))
    ).subscribe((updated) => {
      if (!updated) {
        return;
      }

      this.ticket.set(updated);
      this.toast.show('تم حفظ حالة التذكرة.', 'success');
    });
  }

  assign(): void {
    if (!this.canAssign()) {
      return;
    }

    const ticket = this.ticket();
    const assigneeUserId = this.replyForm.controls.assigneeUserId.value.trim();
    if (!ticket || !assigneeUserId) {
      return;
    }

    this.saving.set(true);
    this.actionError.set('');

    this.support.assignTicket(ticket.id, { assigneeUserId }).pipe(
      catchError((error: unknown) => {
        this.actionError.set(error instanceof Error ? error.message : 'تعذر إسناد التذكرة.');
        return of(null);
      }),
      finalize(() => this.saving.set(false))
    ).subscribe((updated) => {
      if (!updated) {
        return;
      }

      this.ticket.set(updated);
      this.toast.show('تم إسناد التذكرة بنجاح.', 'success');
    });
  }

  deleteTicket(): void {
    if (!this.canDelete()) {
      return;
    }

    const ticket = this.ticket();
    if (!ticket) {
      return;
    }

    if (!globalThis.confirm(`هل تريد حذف التذكرة ${ticket.ticketNumber}؟`)) {
      return;
    }

    this.saving.set(true);
    this.actionError.set('');

    this.support.deleteTicket(ticket.id).pipe(
      catchError((error: unknown) => {
        this.actionError.set(error instanceof Error ? error.message : 'تعذر حذف التذكرة.');
        return of(null);
      }),
      finalize(() => this.saving.set(false))
    ).subscribe((result) => {
      if (result === null) {
        return;
      }

      this.toast.show('تم حذف التذكرة.', 'success');
      this.back();
    });
  }

  statusLabel(status?: string | null): string {
    return supportTicketStatusOptions.find((item) => item.value === normalizeSupportStatus(status))?.label ?? 'جديدة';
  }

  priorityLabel(priority?: string | null): string {
    return supportPriorityLabel(priority);
  }

  typeLabel(type?: string | null): string {
    return supportTypeLabel(type);
  }

  attachmentUrl(url?: string | null): string {
    return resolveMediaUrl(url, '');
  }

  trackByReply(_: number, reply: SupportTicketReply): string {
    return String(reply.id || reply.createdAt || '');
  }

  trackByAttachment(_: number, attachment: SupportTicketAttachment): string {
    return String(attachment.id || attachment.resolvedUrl || attachment.fileName);
  }

  private loadAssignees(): void {
    this.usersService.getUsers('').pipe(
      catchError(() => of([] as Array<{ id: string; fullName?: string | null; userName?: string | null; email?: string | null; roleName?: string | null }>))
    ).subscribe((users) => {
      this.assignees.set(
        users.map((user) => ({
          id: String(user.id),
          label: `${user.fullName || user.userName || user.email} · ${user.roleName || 'Admin'}`
        }))
      );
    });
  }
}

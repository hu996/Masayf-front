import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AdminUsersService } from '../../users/services/admin-users.service';
import { AdminAccessService } from '../../shared/services/admin-access.service';
import { SupportService } from '@app/core/services/support.service';
import {
  SupportTicketAttachment,
  SupportTicketDetails,
  SupportTicketFilters,
  SupportTicketPriority,
  SupportTicketReply,
  SupportTicketReplyRequest,
  SupportTicketStatus,
  SupportTicketStats,
  SupportTicketSummary,
  supportPriorityLabel,
  supportTicketPriorityOptions,
  supportTicketStatusOptions,
  supportTicketTypeOptions,
  supportTypeLabel,
  normalizeSupportStatus
} from '@app/core/models/support-ticket.model';
import { ToastService } from '@app/core/services/toast.service';
import { resolveMediaUrl } from '@app/core/utils/media-url.util';

type AssigneeOption = { id: string; label: string };

@Component({
  selector: 'app-admin-support',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-support.component.html',
  styleUrl: './admin-support.component.scss'
})
export class AdminSupportComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly support = inject(SupportService);
  private readonly usersService = inject(AdminUsersService);
  private readonly access = inject(AdminAccessService);
  private readonly toast = inject(ToastService);

  readonly tickets = signal<SupportTicketSummary[]>([]);
  readonly stats = signal<SupportTicketStats>({
    total: 0,
    newCount: 0,
    inProgressCount: 0,
    resolvedCount: 0,
    closedCount: 0,
    rejectedCount: 0
  });
  readonly assignees = signal<AssigneeOption[]>([]);
  readonly selectedTicket = signal<SupportTicketDetails | null>(null);
  readonly loadingTickets = signal(true);
  readonly loadingStats = signal(true);
  readonly loadingTicket = signal(false);
  readonly saving = signal(false);
  readonly ticketsError = signal('');
  readonly statsError = signal('');
  readonly ticketError = signal('');
  readonly actionError = signal('');
  readonly pageNumber = signal(1);
  readonly pageSize = signal(10);
  readonly totalCount = signal(0);
  readonly selectedTicketId = signal<string | null>(null);

  readonly filtersForm = this.fb.nonNullable.group({
    search: [''],
    type: [''],
    status: [''],
    priority: [''],
    fromDate: [''],
    toDate: ['']
  });

  readonly replyForm = this.fb.nonNullable.group({
    message: ['', [Validators.required, Validators.minLength(3)]],
    isInternal: [false],
    status: ['InProgress' as SupportTicketStatus],
    assigneeUserId: ['']
  });

  readonly typeOptions = supportTicketTypeOptions;
  readonly statusOptions = supportTicketStatusOptions;
  readonly priorityOptions = supportTicketPriorityOptions;

  readonly totalPages = computed(() => Math.max(1, Math.ceil((this.totalCount() || this.tickets().length || 1) / this.pageSize())));

  readonly quickStats = computed(() => {
    const stats = this.stats();
    const items = this.tickets();

    if (stats.total > 0) {
      return stats;
    }

    return {
      total: items.length,
      newCount: items.filter((item) => normalizeSupportStatus(item.status) === 'New').length,
      inProgressCount: items.filter((item) => normalizeSupportStatus(item.status) === 'InProgress').length,
      resolvedCount: items.filter((item) => normalizeSupportStatus(item.status) === 'Resolved').length,
      closedCount: items.filter((item) => normalizeSupportStatus(item.status) === 'Closed').length,
      rejectedCount: items.filter((item) => normalizeSupportStatus(item.status) === 'Rejected').length
    };
  });

  readonly drawerOpen = computed(() => Boolean(this.selectedTicketId()));

  ngOnInit(): void {
    this.loadAssignees();
    this.loadTickets();
    this.loadStats();

    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const id = params.get('id')?.trim() || null;
      this.selectedTicketId.set(id);

      if (!id) {
        this.selectedTicket.set(null);
        this.ticketError.set('');
        this.replyForm.reset({
          message: '',
          isInternal: false,
          status: 'InProgress',
          assigneeUserId: ''
        });
        return;
      }

      this.loadTicket(id);
    });
  }

  refresh(): void {
    this.loadTickets();
    this.loadStats();
    const id = this.selectedTicketId();
    if (id) {
      this.loadTicket(id, false);
    }
  }

  applyFilters(): void {
    this.pageNumber.set(1);
    this.loadTickets();
    this.loadStats();
  }

  resetFilters(): void {
    this.filtersForm.reset({
      search: '',
      type: '',
      status: '',
      priority: '',
      fromDate: '',
      toDate: ''
    });
    this.pageNumber.set(1);
    this.refresh();
  }

  setPage(page: number): void {
    const next = Math.min(Math.max(page, 1), this.totalPages());
    if (next === this.pageNumber()) {
      return;
    }

    this.pageNumber.set(next);
    this.loadTickets();
  }

  openDetails(ticket: SupportTicketSummary): void {
    void this.router.navigate(['/admin/support', ticket.id]);
  }

  closeDetails(): void {
    void this.router.navigate(['/admin/support']);
  }

  loadTickets(): void {
    this.loadingTickets.set(true);
    this.ticketsError.set('');

    const filters = this.filtersForm.getRawValue();
    const payload: SupportTicketFilters = {
      search: filters.search.trim() || undefined,
      type: filters.type || undefined,
      status: filters.status || undefined,
      priority: filters.priority || undefined,
      fromDate: filters.fromDate || undefined,
      toDate: filters.toDate || undefined,
      pageNumber: this.pageNumber(),
      pageSize: this.pageSize()
    };

    this.support.getTickets(payload).pipe(
      catchError((error: unknown) => {
        this.tickets.set([]);
        this.totalCount.set(0);
        this.ticketsError.set(this.resolveErrorMessage(error, 'تعذر تحميل تذاكر الدعم.'));
        return of(null);
      }),
      finalize(() => this.loadingTickets.set(false))
    ).subscribe((result) => {
      if (!result) {
        return;
      }

      this.tickets.set(result.items ?? []);
      this.totalCount.set(result.totalCount ?? result.items.length ?? 0);
      this.pageNumber.set(Math.min(this.pageNumber(), this.totalPages()));

      this.stats.set(result.stats ?? this.stats());
    });
  }

  loadStats(): void {
    this.loadingStats.set(true);
    this.statsError.set('');

    this.support.getStats().pipe(
      catchError((error: unknown) => {
        this.statsError.set(this.resolveErrorMessage(error, 'تعذر تحميل إحصاءات الدعم.'));
        return of(null);
      }),
      finalize(() => this.loadingStats.set(false))
    ).subscribe((stats) => {
      if (stats) {
        this.stats.set(stats);
        return;
      }

      this.stats.set(this.quickStats());
    });
  }

  loadTicket(id: string, focusDrawer = true): void {
    this.loadingTicket.set(true);
    this.ticketError.set('');
    this.actionError.set('');

    this.support.getTicket(id).pipe(
      catchError((error: unknown) => {
        this.selectedTicket.set(null);
        this.ticketError.set(this.resolveErrorMessage(error, 'تعذر تحميل تفاصيل التذكرة.'));
        return of(null);
      }),
      finalize(() => this.loadingTicket.set(false))
    ).subscribe((ticket) => {
      if (!ticket) {
        return;
      }

      this.selectedTicket.set(ticket);
      this.replyForm.patchValue({
        message: '',
        isInternal: false,
        status: ticket.status,
        assigneeUserId: ticket.assignedToId ? String(ticket.assignedToId) : ''
      });

      if (focusDrawer) {
        this.selectedTicketId.set(id);
      }
    });
  }

  saveStatus(): void {
    if (!this.canClose()) {
      return;
    }

    const ticket = this.selectedTicket();
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
        this.actionError.set(this.resolveErrorMessage(error, 'تعذر تحديث الحالة.'));
        return of(null);
      }),
      finalize(() => this.saving.set(false))
    ).subscribe((updated) => {
      if (!updated) {
        return;
      }

      this.syncAfterAction(updated);
      this.toast.show('تم تحديث حالة التذكرة.', 'success');
    });
  }

  assign(): void {
    if (!this.canAssign()) {
      return;
    }

    const ticket = this.selectedTicket();
    const assigneeUserId = this.replyForm.controls.assigneeUserId.value.trim();
    if (!ticket || !assigneeUserId) {
      this.replyForm.controls.assigneeUserId.markAsTouched();
      return;
    }

    this.saving.set(true);
    this.actionError.set('');

    this.support.assignTicket(ticket.id, { assigneeUserId }).pipe(
      catchError((error: unknown) => {
        this.actionError.set(this.resolveErrorMessage(error, 'تعذر إسناد التذكرة.'));
        return of(null);
      }),
      finalize(() => this.saving.set(false))
    ).subscribe((updated) => {
      if (!updated) {
        return;
      }

      this.syncAfterAction(updated);
      this.toast.show('تم إسناد التذكرة بنجاح.', 'success');
    });
  }

  saveReply(): void {
    if (!this.canReply()) {
      return;
    }

    const ticket = this.selectedTicket();
    if (!ticket) {
      return;
    }

    if (this.replyForm.controls.message.invalid) {
      this.replyForm.controls.message.markAsTouched();
      return;
    }

    const payload: SupportTicketReplyRequest = {
      message: this.replyForm.controls.message.value.trim(),
      isInternal: this.replyForm.controls.isInternal.value
    };

    this.saving.set(true);
    this.actionError.set('');

    this.support.replyTicket(ticket.id, payload).pipe(
      catchError((error: unknown) => {
        this.actionError.set(this.resolveErrorMessage(error, 'تعذر إرسال الرد.'));
        return of(null);
      }),
      finalize(() => this.saving.set(false))
    ).subscribe((updated) => {
      if (!updated) {
        return;
      }

      this.syncAfterAction(updated);
      this.replyForm.patchValue({ message: '', isInternal: false, status: updated.status });
      this.toast.show('تم إرسال الرد بنجاح.', 'success');
    });
  }

  deleteTicket(): void {
    if (!this.canDelete()) {
      return;
    }

    const ticket = this.selectedTicket();
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
        this.actionError.set(this.resolveErrorMessage(error, 'تعذر حذف التذكرة.'));
        return of(false);
      }),
      finalize(() => this.saving.set(false))
    ).subscribe((deleted) => {
      if (deleted === false) {
        return;
      }

      this.toast.show('تم حذف التذكرة.', 'success');
      this.selectedTicket.set(null);
      this.selectedTicketId.set(null);
      this.closeDetails();
      this.refresh();
    });
  }

  canReply(): boolean {
    return this.access.canAccess('admin.support.reply');
  }

  canAssign(): boolean {
    return this.access.canAccess('admin.support.assign');
  }

  canClose(): boolean {
    return this.access.canAccess('admin.support.close');
  }

  canDelete(): boolean {
    return this.access.canAccess('admin.support.delete');
  }

  statusLabel(status?: string | null): string {
    return supportTicketStatusOptions.find((item) => item.value === normalizeSupportStatus(status))?.label ?? 'جديدة';
  }

  statusTone(status?: string | null): string {
    return supportTicketStatusOptions.find((item) => item.value === normalizeSupportStatus(status))?.tone ?? 'neutral';
  }

  priorityLabel(priority?: string | null): string {
    return supportPriorityLabel(priority);
  }

  priorityTone(priority?: string | null): string {
    return supportTicketPriorityOptions.find((item) => item.value === String(priority || '').trim())?.tone ?? 'neutral';
  }

  typeLabel(type?: string | null): string {
    return supportTypeLabel(type);
  }

  attachmentUrl(url?: string | null): string {
    return resolveMediaUrl(url, '');
  }

  attachmentPreview(attachment: SupportTicketAttachment): string {
    return this.attachmentUrl(attachment.resolvedUrl || attachment.imageUrl || attachment.filePath);
  }

  trackByTicket(_: number, ticket: SupportTicketSummary): string {
    return String(ticket.id);
  }

  trackByReply(_: number, reply: SupportTicketReply): string {
    return String(reply.id || reply.createdAt);
  }

  trackByAttachment(_: number, attachment: SupportTicketAttachment): string {
    return String(attachment.id || attachment.fileName || attachment.resolvedUrl);
  }

  ticketHeader(): string {
    const ticket = this.selectedTicket();
    if (!ticket) {
      return 'اختر تذكرة لعرض التفاصيل';
    }

    return ticket.ticketNumber;
  }

  firstResponseTime(ticket: SupportTicketDetails): string {
    if (!ticket.replies.length) {
      return 'لم يتم الرد بعد';
    }

    return this.durationBetween(ticket.createdAt, ticket.replies[0].createdAt);
  }

  resolvedTime(ticket: SupportTicketDetails): string {
    if (!ticket.closedAt) {
      return 'غير محسوبة';
    }

    return this.durationBetween(ticket.createdAt, ticket.closedAt);
  }

  formatDateTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('ar-EG', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(date);
  }

  formatTicketSize(bytes?: number | null): string {
    if (!bytes || bytes <= 0) {
      return '—';
    }

    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
  }

  private loadAssignees(): void {
    this.usersService.getUsers('').pipe(
      catchError(() => of([]))
    ).subscribe((users) => {
      this.assignees.set(
        users.map((user) => ({
          id: String(user.id),
          label: `${user.fullName || user.userName || user.email} · ${user.roleDisplayName || user.roleName || 'Admin'}`
        }))
      );
    });
  }

  private syncAfterAction(updated: SupportTicketDetails): void {
    this.selectedTicket.set(updated);
    this.replyForm.patchValue({
      status: updated.status,
      assigneeUserId: updated.assignedToId ? String(updated.assignedToId) : ''
    });
    this.loadTickets();
    this.loadStats();
  }

  private durationBetween(startValue: string, endValue: string): string {
    const start = new Date(startValue).getTime();
    const end = new Date(endValue).getTime();
    if (Number.isNaN(start) || Number.isNaN(end) || end < start) {
      return '—';
    }

    const minutes = Math.max(1, Math.round((end - start) / 60000));
    if (minutes < 60) {
      return `${minutes} دقيقة`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours < 24) {
      return remainingMinutes ? `${hours} ساعة و${remainingMinutes} دقيقة` : `${hours} ساعة`;
    }

    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return remainingHours ? `${days} يوم و${remainingHours} ساعة` : `${days} يوم`;
  }

  private resolveErrorMessage(error: unknown, fallback: string): string {
    if (error && typeof error === 'object') {
      const status = Number((error as { status?: unknown }).status ?? 0);

      if (status === 503) {
        return 'خدمة الدعم غير متاحة الآن. قد تكون قاعدة البيانات أو الـ API متوقفة مؤقتًا.';
      }

      if (status === 0) {
        return 'تعذر الاتصال بالخادم. تأكد أن الـ backend يعمل وأن الشهادة/البروكسي مضبوطان.';
      }
    }

    return error instanceof Error && error.message ? error.message : fallback;
  }
}

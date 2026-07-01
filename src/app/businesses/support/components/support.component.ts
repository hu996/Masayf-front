import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SupportService } from '@app/core/services/support.service';
import {
  SupportTicketDetails,
  SupportTicketType,
  SupportTicketPriority,
  supportTicketPriorityOptions,
  supportTicketTypeOptions,
  supportTypeLabel
} from '@app/core/models/support-ticket.model';
import { resolveMediaUrl } from '@app/core/utils/media-url.util';
import { FileUploaderComponent } from '@app/shared/components/file-uploader/file-uploader.component';

@Component({
  selector: 'app-support',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FileUploaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './support.component.html',
  styleUrl: './support.component.scss'
})
export class SupportComponent {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly support = inject(SupportService);

  readonly attachments = signal<File[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly submittedTicket = signal<SupportTicketDetails | null>(null);

  readonly typeOptions = supportTicketTypeOptions;
  readonly priorityOptions = supportTicketPriorityOptions;

  readonly form = this.fb.nonNullable.group({
    type: ['Complaint' as SupportTicketType, Validators.required],
    subject: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(160)]],
    message: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(4000)]],
    category: [''],
    fullName: [''],
    email: ['', [Validators.email]],
    phone: [''],
    priority: ['Normal' as SupportTicketPriority, Validators.required],
    allowContactBack: [true],
    isAnonymous: [false]
  });

  isAnonymous(): boolean {
    return Boolean(this.form.controls.isAnonymous.value);
  }

  ngOnInit(): void {
    this.applyContactValidators(this.form.controls.isAnonymous.value);
    this.form.controls.isAnonymous.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((anonymous) => {
      this.form.patchValue({ allowContactBack: !anonymous }, { emitEvent: false });
      this.applyContactValidators(anonymous);
    });
  }

  submit(): void {
    this.error.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set(this.buildValidationMessage());
      return;
    }

    const value = this.form.getRawValue();
    const isAnonymous = Boolean(value.isAnonymous);
    const phone = value.phone.trim().replace(/\D/g, '');
    const email = value.email.trim();
    const category = value.category.trim();

    if (phone && phone.length !== 11) {
      this.form.controls.phone.setErrors({ pattern: true });
      this.form.controls.phone.markAsTouched();
      this.error.set('رقم الهاتف يجب أن يكون 11 رقمًا بالأرقام فقط.');
      return;
    }

    this.loading.set(true);

    this.support
      .submitTicket(
        {
          type: value.type,
          subject: value.subject.trim(),
          message: value.message.trim(),
          category: category || null,
          fullName: isAnonymous ? null : value.fullName.trim() || null,
          email: isAnonymous ? null : email || null,
          phone: isAnonymous ? null : phone || null,
          priority: value.priority,
          allowContactBack: Boolean(value.allowContactBack && !isAnonymous),
          isAnonymous
        },
        this.attachments()
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (ticket) => {
          this.submittedTicket.set(ticket);
          this.resetForm();
          this.error.set('');
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.error.set(error instanceof Error ? error.message : 'تعذر إرسال البلاغ الآن. حاول مرة أخرى.');
          this.loading.set(false);
        }
      });
  }

  resetForm(): void {
    this.form.reset({
      type: 'Complaint',
      subject: '',
      message: '',
      category: '',
      fullName: '',
      email: '',
      phone: '',
      priority: 'Normal',
      allowContactBack: true,
      isAnonymous: false
    });
    this.applyContactValidators(false);
    this.attachments.set([]);
  }

  onPhoneInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const numeric = input.value.replace(/\D/g, '').slice(0, 11);
    input.value = numeric;
    this.form.controls.phone.setValue(numeric);
    this.form.controls.phone.markAsDirty();
  }

  phoneErrorMessage(): string {
    const control = this.form.controls.phone;
    if (!control.touched && !control.dirty) return '';
    if (control.hasError('required')) return 'رقم الهاتف مطلوب.';
    if (control.hasError('pattern')) return 'رقم الهاتف يجب أن يكون 11 رقمًا فقط.';
    return '';
  }

  emailErrorMessage(): string {
    const control = this.form.controls.email;
    if (!control.touched && !control.dirty) return '';
    if (control.hasError('required')) return 'البريد الإلكتروني مطلوب.';
    if (control.hasError('email')) return 'البريد الإلكتروني غير صحيح.';
    return '';
  }

  fullNameErrorMessage(): string {
    const control = this.form.controls.fullName;
    if (!control.touched && !control.dirty) return '';
    if (control.hasError('required')) return 'الاسم الكامل مطلوب.';
    return '';
  }

  typeLabel(type?: string | null): string {
    return supportTypeLabel(type);
  }

  priorityLabel(priority?: string | null): string {
    return supportTicketPriorityOptions.find((item) => item.value === priority)?.label ?? 'عادية';
  }

  attachmentUrl(ticket: SupportTicketDetails, index: number): string {
    const attachment = ticket.attachments[index];
    return resolveMediaUrl(attachment?.resolvedUrl || attachment?.filePath || attachment?.imageUrl, '');
  }

  private buildValidationMessage(): string {
    const missing: string[] = [];
    const anonymous = this.isAnonymous();

    if (this.form.controls.type.invalid) missing.push('نوع البلاغ');
    if (this.form.controls.subject.invalid) missing.push('العنوان');
    if (this.form.controls.message.invalid) missing.push('التفاصيل');
    if (!anonymous && this.form.controls.fullName.invalid) missing.push('الاسم الكامل');
    if (!anonymous && this.form.controls.email.invalid) missing.push('البريد الإلكتروني');
    if (!anonymous && this.form.controls.phone.invalid) {
      missing.push('رقم الهاتف');
    }

    return missing.length ? `راجع الحقول التالية: ${missing.join('، ')}.` : 'راجع الحقول المطلوبة قبل الإرسال.';
  }

  private applyContactValidators(anonymous: boolean): void {
    if (anonymous) {
      this.form.controls.fullName.clearValidators();
      this.form.controls.email.clearValidators();
      this.form.controls.phone.clearValidators();
    } else {
      this.form.controls.fullName.setValidators([Validators.required, Validators.minLength(2), Validators.maxLength(120)]);
      this.form.controls.email.setValidators([Validators.required, Validators.email]);
      this.form.controls.phone.setValidators([Validators.required, Validators.pattern(/^\d{11}$/)]);
    }

    this.form.controls.fullName.updateValueAndValidity({ emitEvent: false });
    this.form.controls.email.updateValueAndValidity({ emitEvent: false });
    this.form.controls.phone.updateValueAndValidity({ emitEvent: false });
  }
}

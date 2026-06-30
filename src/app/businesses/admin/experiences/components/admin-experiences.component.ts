import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { catchError, finalize, of } from 'rxjs';
import { AdminExperienceModerationDetail, AdminExperienceRow } from '../models/admin-experience.model';
import { AdminExperiencesService } from '../services/admin-experiences.service';
import { resolveMediaImageUrl, resolveMediaUrl } from '@app/core/utils/media-url.util';

@Component({
  selector: 'app-admin-experiences',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  templateUrl: './admin-experiences.component.html',
  styleUrl: './admin-experiences.component.scss'
})
export class AdminExperiencesComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(AdminExperiencesService);

  readonly loading = signal(true);
  readonly items = signal<AdminExperienceRow[]>([]);
  readonly selected = signal<AdminExperienceModerationDetail | null>(null);
  readonly busyId = signal<string | null>(null);
  readonly errorMessage = signal('');

  readonly rejectForm = this.fb.nonNullable.group({
    reason: ['']
  });

  readonly selectedImages = computed(() => this.selected()?.photoGallery ?? this.selected()?.images ?? []);
  readonly selectedStatusLabel = computed(() => this.statusLabel(this.selected()?.moderationStatus ?? this.selected()?.status));

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.service.getPending().pipe(
      catchError((error: unknown) => {
        this.errorMessage.set(error instanceof Error ? error.message : 'تعذر تحميل التجارب المعلقة.');
        return of([] as AdminExperienceRow[]);
      }),
      finalize(() => this.loading.set(false))
    ).subscribe((items) => this.items.set(items));
  }

  open(item: AdminExperienceRow): void {
    const id = String(item.id);
    this.service.details(id).pipe(
      catchError(() => this.service.getById(id)),
      catchError((error: unknown) => {
        this.errorMessage.set(error instanceof Error ? error.message : 'تعذر فتح تفاصيل التجربة.');
        return of(null);
      })
    ).subscribe((detail) => this.selected.set(detail));
  }

  approve(item: AdminExperienceRow | AdminExperienceModerationDetail): void {
    if (!confirm(`اعتماد التجربة "${item.title}"؟`)) {
      return;
    }

    const id = String(item.id);
    this.busyId.set(id);
    this.service.approve(id).pipe(finalize(() => this.busyId.set(null))).subscribe({
      next: () => {
        this.selected.set(null);
        this.load();
      }
    });
  }

  reject(item: AdminExperienceRow | AdminExperienceModerationDetail): void {
    const reason = this.rejectForm.controls.reason.value.trim();
    if (!reason) {
      this.errorMessage.set('من فضلك اكتب سبب الرفض.');
      return;
    }

    if (!confirm(`رفض التجربة "${item.title}"؟`)) {
      return;
    }

    const id = String(item.id);
    this.busyId.set(id);
    this.service.reject(id, reason).pipe(finalize(() => this.busyId.set(null))).subscribe({
      next: () => {
        this.rejectForm.reset({ reason: '' });
        this.selected.set(null);
        this.load();
      }
    });
  }

  statusLabel(status?: string | number | null): string {
    const value = String(status ?? '').toLowerCase();
    if (!value) return 'معلّق';
    if (value.includes('pendingreview')) return 'قيد المراجعة';
    if (value.includes('pending')) return 'معلّق';
    if (value.includes('published') || value.includes('approved')) return 'منشور';
    if (value.includes('rejected')) return 'مرفوض';
    if (value.includes('flagged')) return 'معلّم';
    return String(status);
  }

  coverImage(item: AdminExperienceRow | AdminExperienceModerationDetail | null | undefined): string {
    return resolveMediaUrl(
      item?.coverImageUrl,
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80'
    );
  }

  imageUrl(image: string | { imageUrl: string } | null | undefined): string {
    return resolveMediaImageUrl(image, 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80');
  }
}

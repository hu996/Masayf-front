import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, HostListener, Input, OnChanges, OnDestroy, Output, PLATFORM_ID, SimpleChanges, inject } from '@angular/core';

interface FilePreviewItem {
  file: File;
  previewUrl: string;
  isImage: boolean;
}

@Component({
  selector: 'app-file-uploader',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './file-uploader.component.html',
  styleUrl: './file-uploader.component.scss'
})
export class FileUploaderComponent implements OnChanges, OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  @Input() label = 'رفع الملفات';
  @Input() hint = 'اسحب أو اختر الملفات من جهازك.';
  @Input() accept = 'image/*';
  @Input() multiple = true;
  @Input() disabled = false;
  @Input() maxFiles = 6;
  @Input() maxFileSizeMb = 8;
  @Input() files: File[] = [];

  @Output() filesChange = new EventEmitter<File[]>();
  @Output() filesInvalid = new EventEmitter<string>();

  previews: FilePreviewItem[] = [];
  error = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['files']) {
      this.rebuildPreviews();
    }
  }

  ngOnDestroy(): void {
    this.revokePreviews();
  }

  @HostListener('dragover', ['$event'])
  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  @HostListener('drop', ['$event'])
  onDrop(event: DragEvent): void {
    event.preventDefault();
    const droppedFiles = Array.from(event.dataTransfer?.files ?? []);
    this.addFiles(droppedFiles);
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const selectedFiles = Array.from(input.files ?? []);
    this.addFiles(selectedFiles);
    input.value = '';
  }

  remove(index: number): void {
    if (index < 0 || index >= this.files.length) {
      return;
    }

    const nextFiles = this.files.filter((_, currentIndex) => currentIndex !== index);
    this.setError('');
    this.updateFiles(nextFiles);
  }

  clear(): void {
    this.setError('');
    this.updateFiles([]);
  }

  isEmpty(): boolean {
    return !this.files.length;
  }

  private addFiles(selectedFiles: File[]): void {
    if (this.disabled || !selectedFiles.length) {
      return;
    }

    const acceptedFiles: File[] = [];
    for (const file of selectedFiles) {
      const validation = this.validateFile(file);
      if (validation !== true) {
        this.setError(validation);
        return;
      }
      acceptedFiles.push(file);
    }

    const merged = [...this.files, ...acceptedFiles];

    if (merged.length > this.maxFiles) {
      this.setError(`يمكن رفع حتى ${this.maxFiles} ملفات فقط.`);
      return;
    }

    this.setError('');
    this.updateFiles(merged);
  }

  private validateFile(file: File): true | string {
    const allowedTypes = ['image/png', 'image/jpg', 'image/jpeg', 'image/webp'];
    const extension = file.name.split('.').pop()?.toLowerCase() ?? '';

    if (!allowedTypes.includes(file.type) && !['png', 'jpg', 'jpeg', 'webp'].includes(extension)) {
      return 'نوع الملف غير مسموح. المسموح PNG أو JPG أو JPEG أو WEBP فقط.';
    }

    if (file.size > this.maxFileSizeMb * 1024 * 1024) {
      return `حجم الملف أكبر من المسموح (${this.maxFileSizeMb} MB).`;
    }

    return true;
  }

  private updateFiles(nextFiles: File[]): void {
    this.filesChange.emit(nextFiles);
    this.rebuildPreviews(nextFiles);
  }

  private rebuildPreviews(nextFiles: File[] = this.files): void {
    this.revokePreviews();
    if (!this.isBrowser) {
      this.previews = [];
      return;
    }

    this.previews = nextFiles.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
      isImage: file.type.startsWith('image/')
    }));
  }

  private revokePreviews(): void {
    if (!this.isBrowser) {
      return;
    }

    this.previews.forEach((item) => {
      try {
        URL.revokeObjectURL(item.previewUrl);
      } catch {
        // ignore
      }
    });
  }

  private setError(message: string): void {
    this.error = message;
    this.filesInvalid.emit(message);
  }
}

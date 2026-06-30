import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { catchError, finalize, of } from 'rxjs';
import { MediaImage } from '@app/core/models/api.models';
import { resolveMediaImageUrl, resolveMediaUrl } from '@app/core/utils/media-url.util';
import { AdminPlaceRow } from '../models/admin-place.model';
import { AdminPlacesService } from '../services/admin-places.service';

@Component({
  selector: 'app-admin-places',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  templateUrl: './admin-places.component.html',
  styleUrl: './admin-places.component.scss'
})
export class AdminPlacesComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(AdminPlacesService);

  readonly loading = signal(true);
  readonly items = signal<AdminPlaceRow[]>([]);
  readonly images = signal<MediaImage[]>([]);
  readonly selected = signal<AdminPlaceRow | null>(null);
  readonly errorMessage = signal('');

  readonly form = this.fb.nonNullable.group({
    search: ['']
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.service.getPlaces().pipe(
      catchError((error: unknown) => {
        this.errorMessage.set(error instanceof Error ? error.message : 'تعذر تحميل الأماكن.');
        return of([] as AdminPlaceRow[]);
      }),
      finalize(() => this.loading.set(false))
    ).subscribe((items) => this.items.set(items));
  }

  open(item: AdminPlaceRow): void {
    this.selected.set(item);
    this.service.getImages(String(item.id)).pipe(catchError(() => of([] as MediaImage[]))).subscribe((images) => this.images.set(images));
  }

  placeImage(item: AdminPlaceRow): string {
    return resolveMediaUrl(item.mainImageUrl, 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=900&q=80');
  }

  imageUrl(image: MediaImage | string | null | undefined): string {
    return resolveMediaImageUrl(image, 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=900&q=80');
  }
}

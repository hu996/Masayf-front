import { Component, input, ChangeDetectionStrategy, computed } from '@angular/core';
import { MediaImage } from '@app/core/models/api.models';

@Component({
  selector: 'app-image-gallery',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './image-gallery.component.html',
  styleUrl: './image-gallery.component.scss'
})
export class ImageGalleryComponent {
  readonly images = input<Array<string | MediaImage>>([]);
  readonly title = input('الصور');

  readonly normalizedImages = computed(() =>
    (this.images() ?? [])
      .map((image) => typeof image === 'string' ? { imageUrl: image } : image)
      .filter((image) => Boolean(image?.imageUrl?.trim()))
      .sort((a, b) => (Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0)))
  );
}

import { Component, input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-image-gallery',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './image-gallery.component.html',
  styleUrl: './image-gallery.component.scss'
})
export class ImageGalleryComponent {
  readonly images = input<string[]>([]);
}

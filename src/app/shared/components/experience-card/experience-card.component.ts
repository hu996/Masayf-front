import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { Experience } from '../../../core/models/api.models';
import { resolveMediaUrl } from '../../../core/utils/media-url.util';
import { PricePipe } from '../../pipes/price.pipe';

@Component({
  selector: 'app-experience-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PricePipe],
  templateUrl: './experience-card.component.html',
  styleUrl: './experience-card.component.scss'
})
export class ExperienceCardComponent {
  readonly experience = input.required<Experience>();

  coverImage(): string {
    const experience = this.experience();
    return resolveMediaUrl(
      experience.coverImageUrl || experience.coverImage || experience.imageUrl,
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1000&q=80'
    );
  }
}

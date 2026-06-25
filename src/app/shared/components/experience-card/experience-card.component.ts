import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { Experience } from '../../../core/models/api.models';
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
}

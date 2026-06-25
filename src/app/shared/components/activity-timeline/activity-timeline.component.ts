import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { PricePipe } from '../../pipes/price.pipe';

export interface ActivityTimelineItem {
  day: number;
  title: string;
  place?: string;
  cost?: number;
  duration?: string;
  notes?: string;
}

@Component({
  selector: 'app-activity-timeline',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PricePipe],
  templateUrl: './activity-timeline.component.html',
  styleUrl: './activity-timeline.component.scss'
})
export class ActivityTimelineComponent {
  readonly items = input<ActivityTimelineItem[]>([]);
}

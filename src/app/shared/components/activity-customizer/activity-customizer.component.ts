import { Component, computed, input, output, ChangeDetectionStrategy } from '@angular/core';
import { PricePipe } from '../../pipes/price.pipe';

export interface CustomizableActivity {
  name: string;
  cost: number;
  active: boolean;
}

@Component({
  selector: 'app-activity-customizer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PricePipe],
  templateUrl: './activity-customizer.component.html',
  styleUrl: './activity-customizer.component.scss'
})
export class ActivityCustomizerComponent {
  readonly activities = input<CustomizableActivity[]>([]);
  readonly originalTotal = input(0);
  readonly adjustedTotal = input(0);
  readonly remaining = input(0);
  readonly toggled = output<number>();

  readonly difference = computed(() => this.adjustedTotal() - this.originalTotal());
}

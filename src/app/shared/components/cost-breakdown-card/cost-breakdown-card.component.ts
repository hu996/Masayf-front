import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { PricePipe } from '../../pipes/price.pipe';

@Component({
  selector: 'app-cost-breakdown-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PricePipe],
  templateUrl: './cost-breakdown-card.component.html',
  styleUrl: './cost-breakdown-card.component.scss'
})
export class CostBreakdownCardComponent {
  readonly title = input('تفاصيل التكلفة');
  readonly items = input<Array<{ label: string; value: number }>>([]);
}

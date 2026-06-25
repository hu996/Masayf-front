import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { PricePipe } from '../../pipes/price.pipe';

@Component({
  selector: 'app-price-summary-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PricePipe],
  templateUrl: './price-summary-card.component.html',
  styleUrl: './price-summary-card.component.scss'
})
export class PriceSummaryCardComponent {
  readonly total = input(0);
  readonly remaining = input(0);
}

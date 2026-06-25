import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { CityBudgetResult } from '../../../core/models/api.models';
import { PricePipe } from '../../pipes/price.pipe';

@Component({
  selector: 'app-city-budget-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PricePipe],
  templateUrl: './city-budget-card.component.html',
  styleUrl: './city-budget-card.component.scss'
})
export class CityBudgetCardComponent {
  readonly result = input.required<CityBudgetResult>();
}

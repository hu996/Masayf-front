import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-search-budget-box',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './search-budget-box.component.html',
  styleUrl: './search-budget-box.component.scss'
})
export class SearchBudgetBoxComponent {}

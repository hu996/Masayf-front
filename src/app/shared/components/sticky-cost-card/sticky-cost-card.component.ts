import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-sticky-cost-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sticky-cost-card.component.html',
  styleUrl: './sticky-cost-card.component.scss'
})
export class StickyCostCardComponent {}

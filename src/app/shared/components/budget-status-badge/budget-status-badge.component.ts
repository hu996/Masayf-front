import { Component, input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-budget-status-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './budget-status-badge.component.html',
  styleUrl: './budget-status-badge.component.scss'
})
export class BudgetStatusBadgeComponent {
  readonly remaining = input(0);
  readonly label = input<string | null>(null);

  status(): 'within' | 'near' | 'over' {
    const remaining = this.remaining();
    if (remaining >= 0) {
      return 'within';
    }

    return Math.abs(remaining) <= 1000 ? 'near' : 'over';
  }

  text(): string {
    if (this.label()) {
      return this.label() as string;
    }

    const labels = {
      within: 'داخل الميزانية',
      near: 'قريب من الميزانية',
      over: 'أعلى من الميزانية'
    };

    return labels[this.status()];
  }
}

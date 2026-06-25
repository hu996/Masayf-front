import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SavedTripPlan, SavedTripPlansService } from '@app/core/services/saved-trip-plans.service';
import { EmptyStateComponent } from '@app/shared/components/empty-state/empty-state.component';
import { PricePipe } from '@app/shared/pipes/price.pipe';

@Component({
  selector: 'app-my-plans',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DatePipe, EmptyStateComponent, PricePipe],
  templateUrl: './my-plans.component.html',
  styleUrl: './my-plans.component.scss'
})
export class MyPlansComponent implements OnInit {
  private readonly savedPlans = inject(SavedTripPlansService);

  readonly plans = signal<SavedTripPlan[]>([]);
  readonly expandedPlanId = signal<string | null>(null);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.plans.set(this.savedPlans.getAll());
  }

  remove(tripPlanId: string): void {
    this.savedPlans.remove(tripPlanId);
    this.load();
  }

  toggle(plan: SavedTripPlan): void {
    this.expandedPlanId.set(this.expandedPlanId() === plan.tripPlanId ? null : plan.tripPlanId);
  }

  totalItems(plan: SavedTripPlan): number {
    return plan.scenarios.reduce((total, scenario) => total + scenario.items.length, 0);
  }

  scenarioLabel(type: string): string {
    const labels: Record<string, string> = {
      Draft: 'خطة مسودة',
      Economic: 'اقتصادي',
      Standard: 'متوسط',
      Comfortable: 'مريح'
    };

    return labels[type] ?? 'سيناريو محفوظ';
  }
}

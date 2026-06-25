import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { catchError, of } from 'rxjs';
import { normalizeId, Place } from '@app/core/models/api.models';
import { AttractionsService } from '../services/attractions.service';
import { EmptyStateComponent } from '@app/shared/components/empty-state/empty-state.component';
import { PlaceCardComponent } from '@app/shared/components/place-card/place-card.component';
import { SkeletonGridComponent } from '@app/shared/components/skeleton-grid/skeleton-grid.component';

@Component({
  selector: 'app-attractions',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, EmptyStateComponent, PlaceCardComponent, SkeletonGridComponent],
  templateUrl: './attractions.component.html',
  styleUrl: './attractions.component.scss'
})
export class AttractionsComponent implements OnInit {
  private readonly service = inject(AttractionsService);
  private readonly fb = inject(FormBuilder);

  readonly places = signal<Place[]>([]);
  readonly loading = signal(true);
  readonly page = signal(1);
  readonly filters = this.fb.group({ cityId: [''], areaId: [''], category: [''], minPrice: [''], maxPrice: [''] });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.service.search({ ...this.clean(this.filters.value), pageNumber: this.page(), pageSize: 9 }).pipe(catchError(() => of([]))).subscribe((result) => {
      this.places.set(Array.isArray(result) ? result : result.items ?? []);
      this.loading.set(false);
    });
  }

  private clean(value: Record<string, unknown>): Record<string, string | number> {
    const entries: Array<[string, string | number]> = [];

    Object.entries(value).forEach(([key, rawValue]) => {
      if (key === 'cityId' || key === 'areaId') {
        const id = normalizeId(rawValue);
        if (id !== null) {
          entries.push([key, id]);
        }
        return;
      }

      if (rawValue === null || rawValue === undefined || rawValue === '') {
        return;
      }

      if (key === 'minPrice' || key === 'maxPrice') {
        const numberValue = Number(rawValue);
        if (!Number.isNaN(numberValue)) {
          entries.push([key, numberValue]);
        }
        return;
      }

      entries.push([key, String(rawValue)]);
    });

    return Object.fromEntries(entries);
  }
}

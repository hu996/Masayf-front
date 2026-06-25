import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { catchError, of } from 'rxjs';
import { City, normalizeId } from '@app/core/models/api.models';
import { CitiesService } from '../../cities/services/cities.service';
import { ExperiencesService } from '../services/experiences.service';
import { EmptyStateComponent } from '@app/shared/components/empty-state/empty-state.component';
import { ExperienceCardComponent } from '@app/shared/components/experience-card/experience-card.component';
import { SkeletonGridComponent } from '@app/shared/components/skeleton-grid/skeleton-grid.component';
import { Experience, ExperienceSearchFilters } from '../models/experience.model';

@Component({
  selector: 'app-experiences',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, EmptyStateComponent, SkeletonGridComponent, ExperienceCardComponent],
  templateUrl: './experiences.component.html',
  styleUrl: './experiences.component.scss'
})
export class ExperiencesComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(ExperiencesService);
  private readonly citiesService = inject(CitiesService);

  readonly experiences = signal<Experience[]>([]);
  readonly loading = signal(true);
  readonly cities = signal<City[]>([]);

  readonly filters = this.fb.group({
    cityId: [''],
    budget: [''],
    days: [''],
    peopleCount: [''],
    rating: [''],
    tripType: ['']
  });

  ngOnInit(): void {
    this.citiesService.getCities().pipe(catchError(() => of([]))).subscribe((result) => {
      this.cities.set(Array.isArray(result) ? result : result.items ?? []);
    });
    const cityId = normalizeId(this.route.snapshot.queryParamMap.get('cityId'));
    if (cityId) {
      this.filters.patchValue({ cityId: String(cityId) });
    }
    this.search();
  }

  search(): void {
    this.loading.set(true);
    this.service.search(this.clean()).pipe(catchError(() => of([]))).subscribe((result) => {
      this.experiences.set(Array.isArray(result) ? result : result.items ?? []);
      this.loading.set(false);
    });
  }

  private clean(): ExperienceSearchFilters {
    const value = this.filters.value;
    const cityId = normalizeId(value.cityId);
    const tripType = this.numberValue(value.tripType);

    return {
      ...(cityId ? { cityId } : {}),
      ...this.numberParam('maxBudget', value.budget),
      ...this.numberParam('daysCount', value.days),
      ...this.numberParam('peopleCount', value.peopleCount),
      ...this.numberParam('minRating', value.rating),
      ...(tripType ? { tripType } : {}),
      pageNumber: 1,
      pageSize: 12
    };
  }

  private numberParam(key: string, value: unknown): Record<string, number> {
    if (value === null || value === undefined || value === '') {
      return {};
    }
    const numberValue = Number(value);
    return Number.isNaN(numberValue) ? {} : { [key]: numberValue };
  }

  private numberValue(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const numberValue = Number(value);
    return Number.isNaN(numberValue) ? null : numberValue;
  }
}

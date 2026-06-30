import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, debounceTime, of, startWith, switchMap } from 'rxjs';
import { ApiId, City, normalizeId } from '@app/core/models/api.models';
import { CitiesService } from '../services/cities.service';
import { EmptyStateComponent } from '@app/shared/components/empty-state/empty-state.component';
import { SkeletonGridComponent } from '@app/shared/components/skeleton-grid/skeleton-grid.component';
import { resolveMediaUrl } from '@app/core/utils/media-url.util';

@Component({
  selector: 'app-cities',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, EmptyStateComponent, SkeletonGridComponent],
  templateUrl: './cities.component.html',
  styleUrl: './cities.component.scss'
})
export class CitiesComponent implements OnInit {
  private readonly service = inject(CitiesService);

  readonly query = new FormControl('', { nonNullable: true });
  readonly cities = signal<City[]>([]);
  readonly loading = signal(true);
  readonly page = signal(1);
  readonly image = 'https://images.unsplash.com/photo-1539650116574-75c0c6d73f6e?auto=format&fit=crop&w=900&q=80';

  ngOnInit(): void {
    this.query.valueChanges.pipe(startWith(''), debounceTime(300), switchMap(() => this.fetch())).subscribe();
  }

  load(): void {
    this.fetch().subscribe();
  }

  cityId(city: City): ApiId | null {
    return normalizeId(city.id ?? city.cityId);
  }

  cityImage(city: City): string {
    return resolveMediaUrl(city.mainImageUrl || city.coverImage || city.imageUrl, this.image);
  }

  private fetch() {
    this.loading.set(true);
    return this.service.searchCities(this.query.value, this.page(), 9).pipe(
      catchError(() => of([]))
    ).pipe(switchMap((result) => {
      this.cities.set(Array.isArray(result) ? result : result.items ?? []);
      this.loading.set(false);
      return of(result);
    }));
  }
}

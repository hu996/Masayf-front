import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { ApiId, normalizeId, Place } from '@app/core/models/api.models';
import { FavoritesService } from '../services/favorites.service';
import { SavedDestination, SavedDestinationsService } from '@app/core/services/saved-destinations.service';
import { ToastService } from '@app/core/services/toast.service';
import { EmptyStateComponent } from '@app/shared/components/empty-state/empty-state.component';
import { PricePipe } from '@app/shared/pipes/price.pipe';

@Component({
  selector: 'app-favorites',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, EmptyStateComponent, PricePipe, DatePipe],
  templateUrl: './favorites.component.html',
  styleUrl: './favorites.component.scss'
})
export class FavoritesComponent implements OnInit {
  private readonly service = inject(FavoritesService);
  private readonly savedDestinationsService = inject(SavedDestinationsService);
  private readonly toast = inject(ToastService);

  readonly favorites = signal<Place[]>([]);
  readonly savedDestinations = signal<SavedDestination[]>([]);
  readonly activeTab = signal<'places' | 'destinations'>('places');
  readonly loading = signal(true);
  readonly image = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80';

  ngOnInit(): void {
    this.load();
    this.loadSavedDestinations();
  }

  load(): void {
    this.loading.set(true);
    this.service.getFavorites().pipe(catchError(() => of([]))).subscribe((items) => {
      this.favorites.set(items);
      this.loading.set(false);
    });
  }

  placeId(place: Place): ApiId | null {
    return normalizeId(place.placeId ?? place.id);
  }

  detailsType(place: Place): 'accommodation' | 'attraction' {
    const type = `${place.type || place.category || ''}`.toLowerCase();
    return type.includes('attraction') || type.includes('activity') ? 'attraction' : 'accommodation';
  }

  remove(id: ApiId): void {
    this.service.remove(id).pipe(catchError(() => of(null))).subscribe((result) => {
      if (result !== null) {
        this.favorites.update((items) => items.filter((item) => normalizeId(item.placeId ?? item.id) !== id));
        this.toast.show('تم حذف المكان من المفضلة', 'success');
      }
    });
  }

  removeDestination(cityId: ApiId): void {
    this.savedDestinationsService.remove(cityId).subscribe({
      next: () => {
        this.savedDestinations.set(this.savedDestinationsService.getAll());
        this.toast.show('تم حذف المدينة من المحفوظات.', 'success');
      },
      error: () => this.toast.show('تعذر حذف المدينة من المحفوظات.', 'error')
    });
  }

  destinationImage(destination: SavedDestination): string {
    return destination.imageUrl || this.image;
  }

  private loadSavedDestinations(): void {
    this.savedDestinationsService.load().pipe(catchError(() => of([]))).subscribe((items) => {
      this.savedDestinations.set(items);
    });
  }
}

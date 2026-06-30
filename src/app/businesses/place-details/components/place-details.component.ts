import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, of, switchMap } from 'rxjs';
import { ApiId, normalizeId } from '@app/core/models/api.models';
import { FavoritesService } from '../../favorites/services/favorites.service';
import { SavedTripPlansService } from '@app/core/services/saved-trip-plans.service';
import { ToastService } from '@app/core/services/toast.service';
import { AuthService } from '@app/core/services/auth.service';
import { EmptyStateComponent } from '@app/shared/components/empty-state/empty-state.component';
import { PlaceCardComponent } from '@app/shared/components/place-card/place-card.component';
import { StickyCostCardComponent } from '@app/shared/components/sticky-cost-card/sticky-cost-card.component';
import { PricePipe } from '@app/shared/pipes/price.pipe';
import { PlaceDetailsViewModel } from '../models/place-details-view.model';
import { PlaceDetailsService, PlaceDetailsType } from '../services/place-details.service';
import { resolveMediaImageUrl } from '@app/core/utils/media-url.util';

@Component({
  selector: 'app-place-details',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, EmptyStateComponent, PlaceCardComponent, StickyCostCardComponent, PricePipe],
  templateUrl: './place-details.component.html',
  styleUrl: './place-details.component.scss'
})
export class PlaceDetailsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly detailsService = inject(PlaceDetailsService);
  private readonly favorites = inject(FavoritesService);
  private readonly savedPlans = inject(SavedTripPlansService);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  readonly place = signal<PlaceDetailsViewModel | null>(null);
  readonly loading = signal(true);
  readonly errorMessage = signal('');
  readonly type = signal<PlaceDetailsType>('accommodation');
  readonly planned = signal(false);

  readonly costForm = this.fb.nonNullable.group({
    nightsCount: [3],
    personsCount: [2]
  });

  readonly estimatedTotal = computed(() => {
    const place = this.place();
    if (!place) {
      return 0;
    }

    const persons = Math.max(1, Number(this.costForm.controls.personsCount.value) || 1);
    const nights = Math.max(1, Number(this.costForm.controls.nightsCount.value) || 1);
    const price = place.displayPrice ?? 0;

    return place.isAccommodation ? price * nights : price * persons;
  });

  ngOnInit(): void {
    this.route.paramMap.pipe(
      switchMap((params) => {
        const type = params.get('type');
        const id = normalizeId(params.get('id'));

        this.place.set(null);
        this.errorMessage.set('');
        this.loading.set(true);

        if (type !== 'accommodation' && type !== 'attraction') {
          this.loading.set(false);
          this.errorMessage.set('نوع المكان غير صحيح.');
          return of(null);
        }

        this.type.set(type);

        if (!id) {
          this.loading.set(false);
          this.errorMessage.set('رابط المكان غير صحيح.');
          return of(null);
        }

        return this.detailsService.load(type, id);
      })
    ).subscribe((place) => {
      this.place.set(place);
      this.loading.set(false);
      if (!place && !this.errorMessage()) {
        this.errorMessage.set('لم يتم العثور على المكان أو الرابط غير صحيح.');
      }
    });
  }

  placeId(): ApiId | null {
    return normalizeId(this.place()?.id);
  }

  addFavorite(): void {
    const id = this.placeId();
    if (!id) {
      this.toast.show('لا يمكن إضافة المكان للمفضلة لأن الرابط غير صحيح.', 'error');
      return;
    }

    this.favorites.add(id).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          this.toast.show('يجب تسجيل الدخول لإضافة المكان للمفضلة.', 'error');
        } else if (error.status === 404) {
          this.toast.show('لم يتم العثور على المكان.', 'error');
        }
        return of(null);
      })
    ).subscribe((result) => {
      if (result !== null) {
        this.toast.show('تمت إضافة المكان للمفضلة.', 'success');
      }
    });
  }

  addToPlan(): void {
    const place = this.place();
    if (!place) {
      return;
    }

    this.auth.requireLogin('سجّل دخولك علشان تضيف المكان لرحلاتك المحفوظة.', () => {
      this.savedPlans.addDraftItem({
        placeId: place.id,
        itemType: this.type(),
        name: place.name,
        estimatedCost: this.estimatedTotal(),
        dayNumber: 1,
        notes: 'تمت الإضافة من صفحة التفاصيل إلى خطة مسودة.',
        cityId: place.cityId,
        cityName: place.cityName,
        budget: this.estimatedTotal()
      });
      this.planned.set(true);
      this.toast.show('تمت إضافة المكان إلى خطة مسودة. ستجده في خططي المحفوظة.', 'success');
    });
  }

  share(): void {
    const place = this.place();
    if (navigator.share && place) {
      navigator.share({ title: place.name, text: place.description, url: location.href }).catch(() => undefined);
      return;
    }
    navigator.clipboard?.writeText(location.href);
    this.toast.show('تم نسخ رابط المكان.', 'success');
  }

  compare(): void {
    this.toast.show('يمكنك مقارنة الأماكن من قسم الأماكن المشابهة أسفل الصفحة.', 'info');
  }

  hasGallery(): boolean {
    return Boolean(this.place()?.galleryImages.length);
  }

  galleryImage(image: string | { imageUrl?: string | null; caption?: string | null }): string {
    return resolveMediaImageUrl(image, 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1200&q=80');
  }

}

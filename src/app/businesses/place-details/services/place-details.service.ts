import { Injectable } from '@angular/core';
import { catchError, forkJoin, map, Observable, of, switchMap } from 'rxjs';
import { ApiId, Experience, MediaImage, normalizeId, Place } from '@app/core/models/api.models';
import { AccommodationsService } from '../../accommodations/services/accommodations.service';
import { AttractionsService } from '../../attractions/services/attractions.service';
import { ExperiencesService } from '../../experiences/services/experiences.service';
import { PlaceDetailsViewModel } from '../models/place-details-view.model';

export type PlaceDetailsType = 'accommodation' | 'attraction';

@Injectable({ providedIn: 'root' })
export class PlaceDetailsService {
  constructor(
    private readonly accommodations: AccommodationsService,
    private readonly attractions: AttractionsService,
    private readonly experiences: ExperiencesService
  ) {}

  load(type: PlaceDetailsType, id: ApiId): Observable<PlaceDetailsViewModel | null> {
    const detailsRequest = type === 'accommodation'
      ? this.accommodations.details(id)
      : this.attractions.details(id);

    return detailsRequest.pipe(
      switchMap((place) => {
        const normalized = this.normalizePlace(place, type);
        const cityId = normalizeId(normalized.cityId);
        const areaId = normalizeId(normalized.areaId);
        const similarRequest = type === 'accommodation'
          ? this.accommodations.search({ cityId: cityId ?? undefined, areaId: areaId ?? undefined, pageNumber: 1, pageSize: 6 })
          : this.attractions.search({ cityId: cityId ?? undefined, areaId: areaId ?? undefined, pageNumber: 1, pageSize: 6 });

        const experiencesRequest = this.experiences.search({ cityId: cityId ?? undefined, pageNumber: 1, pageSize: 3 });

        return forkJoin({
          similar: similarRequest.pipe(catchError(() => of([]))),
          experiences: experiencesRequest.pipe(catchError(() => of([])))
        }).pipe(
          map(({ similar, experiences }) => ({
            ...normalized,
            similarPlaces: (Array.isArray(similar) ? similar : similar.items ?? [])
              .filter((item) => normalizeId(item.id ?? item.placeId) !== normalized.id)
              .slice(0, 6),
            experiences: (Array.isArray(experiences) ? experiences : experiences.items ?? []).slice(0, 3)
          }))
        );
      }),
      catchError(() => of(null))
    );
  }

  normalizePlace(dto: Place, type: PlaceDetailsType): PlaceDetailsViewModel {
    const id = normalizeId(dto.id ?? dto.placeId);
    if (!id) {
      throw new Error('Invalid place id');
    }

    const isAccommodation = type === 'accommodation';
    const displayPrice = dto.pricePerNight ?? dto.priceFrom ?? dto.price;
    const ratingValue = dto.averageRating ?? dto.rating;
    const galleryImages = this.uniqueImages(dto);
    const cityName = dto.cityName || 'مدينة غير متوفرة';
    const areaName = dto.areaName || 'منطقة غير متوفرة';
    const address = dto.address || 'العنوان غير متوفر';

    const viewModel: PlaceDetailsViewModel = {
      ...dto,
      id,
      displayType: isAccommodation ? 'إقامة' : (dto.category || 'نشاط'),
      primaryImage: galleryImages[0]?.imageUrl,
      galleryImages,
      displayPrice,
      ratingValue,
      locationLine: `${cityName} - ${areaName} - ${address}`,
      isAccommodation,
      features: this.features(dto, isAccommodation),
      facts: this.facts(dto, isAccommodation, displayPrice, ratingValue),
      costRows: this.costRows(dto, isAccommodation, displayPrice),
      tips: this.tips(isAccommodation),
      similarPlaces: [],
      experiences: []
    };

    return viewModel;
  }

  private uniqueImages(dto: Place): MediaImage[] {
    const sources = [
      ...(dto.imageItems ?? []),
      ...(dto.images ?? []),
      dto.mainImageUrl,
      dto.imageUrl
    ];

    const normalized = sources
      .map((image, index) => this.normalizeImage(image, index))
      .filter((image): image is MediaImage => Boolean(image?.imageUrl?.trim()))
      .sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0));

    const seen = new Set<string>();
    return normalized.filter((image) => {
      const key = image.imageUrl.trim();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    }).slice(0, 8);
  }

  private normalizeImage(image: string | MediaImage | null | undefined, index: number): MediaImage | null {
    if (!image) {
      return null;
    }

    if (typeof image === 'string') {
      return {
        imageUrl: image,
        isMain: index === 0,
        isCover: index === 0,
        sortOrder: index
      };
    }

    return {
      ...image,
      imageUrl: image.imageUrl,
      isMain: Boolean(image.isMain ?? index === 0),
      isCover: Boolean(image.isCover ?? index === 0),
      sortOrder: Number.isFinite(Number(image.sortOrder)) ? Number(image.sortOrder) : index
    };
  }

  private facts(place: Place, isAccommodation: boolean, price?: number, rating?: number): { label: string; value: string }[] {
    if (isAccommodation) {
      return [
        { label: 'السعر لليلة', value: price ? `${price} جنيه` : 'غير متوفر' },
        { label: 'السعة', value: place.capacity ? `${place.capacity} أشخاص` : 'غير متوفر' },
        { label: 'قريب من البحر؟', value: this.hasSeaHint(place) ? 'غالباً قريب' : 'غير متوفر' },
        { label: 'مناسب للعائلات؟', value: place.capacity && place.capacity >= 3 ? 'نعم' : 'غير متوفر' },
        { label: 'التقييم', value: rating ? `${rating} من 5` : 'جديد' },
        { label: 'المنطقة', value: place.areaName || 'غير متوفر' }
      ];
    }

    return [
      { label: 'سعر الفرد', value: price ? `${price} جنيه` : 'غير متوفر' },
      { label: 'المدة', value: place.durationHours ? `${place.durationHours} ساعات` : place.duration || 'غير متوفر' },
      { label: 'مناسب لمين؟', value: 'عائلات وشباب' },
      { label: 'أفضل وقت', value: 'الصباح أو قبل الغروب' },
      { label: 'التقييم', value: rating ? `${rating} من 5` : 'جديد' },
      { label: 'المنطقة', value: place.areaName || 'غير متوفر' }
    ];
  }

  private features(place: Place, isAccommodation: boolean): string[] {
    const price = place.pricePerNight ?? place.priceFrom ?? place.price ?? 0;
    const rating = place.averageRating ?? place.rating ?? 0;

    if (isAccommodation) {
      return [
        this.hasSeaHint(place) ? 'قريب من البحر' : 'موقع واضح',
        place.capacity && place.capacity >= 3 ? 'مناسب للعائلات' : 'مناسب لرحلة قصيرة',
        place.capacity && place.capacity >= 4 ? 'سعة مناسبة' : 'اقتصادي',
        price && price < 1500 ? 'اقتصادي' : 'متوسط السعر',
        rating >= 4 ? 'تقييم جيد' : 'اختيار قابل للمقارنة',
        place.areaName ? 'منطقة حيوية' : 'موقع داخل المدينة'
      ];
    }

    return [
      'مناسب للعائلات',
      'مناسب للشباب',
      price && price < 500 ? 'تكلفة منخفضة' : 'تجربة مميزة',
      'نشاط خارجي',
      place.durationHours ? 'مدة واضحة' : 'اسأل عن المدة',
      'مناسب للأطفال'
    ];
  }

  private costRows(place: Place, isAccommodation: boolean, price = 0): { label: string; value: number; hint?: string }[] {
    if (isAccommodation) {
      return [
        { label: 'ليلة واحدة', value: price },
        { label: '3 ليالي', value: price * 3 },
        { label: '5 ليالي', value: price * 5 },
        { label: 'تكلفة الفرد التقريبية', value: Math.round((price * 3) / Math.max(1, place.capacity ?? 2)), hint: 'على 3 ليالي' }
      ];
    }

    return [
      { label: 'شخص واحد', value: price },
      { label: 'شخصين', value: price * 2 },
      { label: 'عائلة 4 أفراد', value: price * 4 },
      { label: 'ضمن رحلة 3 أيام', value: price * 2, hint: 'تقدير نشاط واحد لشخصين' }
    ];
  }

  private tips(isAccommodation: boolean): string[] {
    return isAccommodation
      ? ['اتأكد من السعر قبل الحجز.', 'اسأل عن القرب من البحر.', 'راجع الصور والتقييمات.', 'اتأكد من عدد الأسرة والسعة.']
      : ['اسأل عن سعر الدخول قبل الزيارة.', 'اختار وقت بعيد عن الزحمة.', 'خذ معاك مياه ومستلزمات البحر لو نشاط خارجي.'];
  }

  private hasSeaHint(place: Place): boolean {
    const text = `${place.name} ${place.description ?? ''} ${place.address ?? ''} ${place.areaName ?? ''}`.toLowerCase();
    return text.includes('بحر') || text.includes('شاطئ') || text.includes('sea') || text.includes('beach');
  }
}

import { ApiId, Experience, MediaImage, Place } from '@app/core/models/api.models';

export interface PlaceDetailsViewModel extends Place {
  id: ApiId;
  displayType: string;
  primaryImage?: string;
  galleryImages: MediaImage[];
  displayPrice?: number;
  ratingValue?: number;
  locationLine: string;
  isAccommodation: boolean;
  features: string[];
  facts: PlaceFact[];
  costRows: CostRow[];
  tips: string[];
  similarPlaces: Place[];
  experiences: Experience[];
}

export interface PlaceFact {
  label: string;
  value: string;
}

export interface CostRow {
  label: string;
  value: number;
  hint?: string;
}

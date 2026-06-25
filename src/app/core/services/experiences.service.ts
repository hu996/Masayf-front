import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  ApiId,
  CreateTripExperienceRequest,
  Experience,
  ExperienceSearchFilters,
  PagedResult
} from '../models/api.models';
import { ApiService } from './api.service';

export interface UploadedImageDto {
  id: string;
  imageUrl: string;
  isCover: boolean;
  sortOrder: number;
}

@Injectable({ providedIn: 'root' })
export class ExperiencesService {
  constructor(private readonly api: ApiService) {}

  search(filters: ExperienceSearchFilters): Observable<Experience[] | PagedResult<Experience>> {
    return this.api.get<PagedResult<Experience>>('/TripExperiences/Search', {
      CityId: filters.cityId,
      MaxBudget: filters.maxBudget,
      DaysCount: filters.daysCount,
      PeopleCount: filters.peopleCount,
      MinRating: filters.minRating,
      TripType: filters.tripType,
      SearchTerm: filters.searchTerm,
      SortBy: filters.sortBy,
      SortDirection: filters.sortDirection,
      PageNumber: filters.pageNumber,
      PageSize: filters.pageSize
    });
  }

  details(id: ApiId): Observable<Experience> {
    return this.api.get<Experience>(`/TripExperiences/Details/${id}`);
  }

  share(request: CreateTripExperienceRequest): Observable<Experience> {
    return this.api.post<Experience>('/TripExperiences/AddTripExperience', request);
  }

  uploadPhotos(
    experienceId: ApiId,
    files: File[],
    coverImageIndex: number | null = 0
  ): Observable<UploadedImageDto[]> {
    const formData = new FormData();

    files.forEach((file) => {
      formData.append('files', file);
    });

    if (coverImageIndex !== null) {
      formData.append('coverImageIndex', coverImageIndex.toString());
    }

    return this.api.post<UploadedImageDto[]>(
      `/TripExperiences/${experienceId}/Photos`,
      formData
    );
  }

  deletePhoto(experienceId: ApiId, photoId: ApiId): Observable<boolean> {
    return this.api.delete<boolean>(
      `/TripExperiences/${experienceId}/Photos/${photoId}`
    );
  }
}
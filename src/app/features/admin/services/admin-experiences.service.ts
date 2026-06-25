import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '@app/core/services/api.service';
import { AdminExperienceModerationDetail, AdminExperienceRow } from '../models/admin-experience.model';

@Injectable({ providedIn: 'root' })
export class AdminExperiencesService {
  constructor(private readonly api: ApiService) {}

  getPending(): Observable<AdminExperienceRow[]> {
    return this.api.get<AdminExperienceRow[]>('/TripExperiences/GetPending');
  }

  getById(id: string): Observable<AdminExperienceModerationDetail> {
    return this.api.get<AdminExperienceModerationDetail>(`/TripExperiences/GetTripExperienceById/${id}`);
  }

  details(id: string): Observable<AdminExperienceModerationDetail> {
    return this.api.get<AdminExperienceModerationDetail>(`/TripExperiences/Details/${id}`);
  }

  approve(id: string): Observable<unknown> {
    return this.api.post<unknown>(`/TripExperiences/ApproveTripExperience/${id}`, {});
  }

  reject(id: string, reason: string): Observable<unknown> {
    return this.api.post<unknown>(`/TripExperiences/RejectTripExperience/${id}`, { reason });
  }
}

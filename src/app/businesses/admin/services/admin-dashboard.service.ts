import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '@app/core/services/api.service';
import { AdminDashboardOverview } from '../models/admin-dashboard.model';

@Injectable({ providedIn: 'root' })
export class AdminDashboardService {
  constructor(private readonly api: ApiService) {}

  getOverview(): Observable<AdminDashboardOverview> {
    return this.api.get<AdminDashboardOverview>('/Admin/Dashboard/Overview');
  }
}

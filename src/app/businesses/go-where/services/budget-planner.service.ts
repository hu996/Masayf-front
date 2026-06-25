import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BudgetPlannerRequest, BudgetPlannerResponse } from '../models/budget-finder.model';
import { ApiService } from '@app/core/services/api.service';

@Injectable({ providedIn: 'root' })
export class BudgetPlannerService {
  constructor(private readonly api: ApiService) {}

  findBestCities(request: BudgetPlannerRequest): Observable<BudgetPlannerResponse> {
    return this.api.post<BudgetPlannerResponse>('/BudgetPlanner/FindBestCities', request);
  }

  compare(request: { planner: BudgetPlannerRequest; cityIds: string[] }): Observable<unknown> {
    return this.api.post<unknown>('/BudgetPlanner/Compare', request);
  }
}

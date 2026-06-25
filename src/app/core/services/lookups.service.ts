import { Injectable } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';
import { LookupGroup } from '../models/api.models';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class LookupsService {
  private all$?: Observable<LookupGroup[]>;

  constructor(private readonly api: ApiService) {}

  getAll(): Observable<LookupGroup[]> {
    this.all$ ??= this.api.get<LookupGroup[]>('/Lookups/GetAll').pipe(shareReplay(1));
    return this.all$;
  }
}

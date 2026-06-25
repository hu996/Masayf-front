import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { City, LookupGroup } from '@app/core/models/api.models';
import { CitiesService } from '../../cities/services/cities.service';
import { LookupsService } from '../../lookups/services/lookups.service';
import { EmptyStateComponent } from '@app/shared/components/empty-state/empty-state.component';
import { SkeletonGridComponent } from '@app/shared/components/skeleton-grid/skeleton-grid.component';

@Component({
  selector: 'app-home',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, EmptyStateComponent, SkeletonGridComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit {
  private readonly citiesService = inject(CitiesService);
  private readonly lookupsService = inject(LookupsService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  readonly cities = signal<City[]>([]);
  readonly loading = signal(true);
  readonly tripTypes = signal<LookupGroup['items']>([]);
  readonly governorates = signal<Array<{ id: string | number; name: string }>>([]);
  readonly seaImage = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80';
  readonly howItWorks = [
    { title: 'اكتب ميزانيتك', text: 'حدد الميزانية وعدد الأشخاص والأيام ونوع الرحلة.' },
    { title: 'نحسب المدن المناسبة', text: 'نقارن تكلفة الإقامة والأكل والمواصلات والأنشطة.' },
    { title: 'اختار بخطة واضحة', text: 'افتح الخطة أو شوف تجارب ناس سافرت قبل كده.' }
  ];

  readonly form = this.fb.nonNullable.group({
    budget: [7000, [Validators.required, Validators.min(1)]],
    peopleCount: [2, [Validators.required, Validators.min(1)]],
    daysCount: [3, [Validators.required, Validators.min(1)]],
    tripType: ['', Validators.required],
    fromGovernorateId: ['']
  });

  ngOnInit(): void {
    forkJoin({
      cities: this.citiesService.getCities().pipe(catchError(() => of([]))),
      lookups: this.lookupsService.getAll().pipe(catchError(() => of([]))),
      governorates: this.citiesService.getGovernorates().pipe(catchError(() => of([])))
    }).subscribe(({ cities, lookups, governorates }) => {
      const tripTypes = lookups.find((group) => group.typeCode === 'TripType')?.items ?? [];
      this.tripTypes.set([...tripTypes].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)));
      this.governorates.set(governorates.map((item) => ({ id: item.id, name: item.name })));
      if (tripTypes.length) {
        const initial = tripTypes[0];
        this.form.controls.tripType.setValue(String(initial.numericValue ?? initial.code));
      }
      this.cities.set(Array.isArray(cities) ? cities : cities.items ?? []);
      this.loading.set(false);
    });
  }

  cityImage(city: City): string {
    return city.mainImageUrl || city.coverImage || city.imageUrl || this.seaImage;
  }

  goWhere(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.router.navigate(['/go-where'], { queryParams: this.form.getRawValue() });
  }
}

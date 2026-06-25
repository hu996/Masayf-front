import { CanMatchFn, Routes } from '@angular/router';
import { PublicLayoutComponent } from './layout/public-layout/public-layout.component';
import { adminAuthChildGuard, adminAuthGuard } from './businesses/admin/guards/admin-auth.guard';

const publicSiteMatch: CanMatchFn = (_route, segments) => segments[0]?.path !== 'admin';

export const routes: Routes = [
  {
    path: 'admin',
    children: [
      {
        path: 'login',
        loadComponent: () => import('./businesses/admin/components/admin-login.component').then((m) => m.AdminLoginComponent)
      },
      {
        path: '',
        canActivate: [adminAuthGuard],
        canActivateChild: [adminAuthChildGuard],
        loadComponent: () => import('./businesses/admin/components/admin-layout.component').then((m) => m.AdminLayoutComponent),
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
          { path: 'dashboard', loadComponent: () => import('./businesses/admin/components/admin-dashboard.component').then((m) => m.AdminDashboardComponent) },
          { path: 'users', loadComponent: () => import('./businesses/admin/components/admin-users.component').then((m) => m.AdminUsersComponent) },
          { path: 'settings', loadComponent: () => import('./businesses/admin/components/admin-settings.component').then((m) => m.AdminSettingsComponent) },
          { path: 'cities', loadComponent: () => import('./businesses/admin/components/admin-cities.component').then((m) => m.AdminCitiesComponent) },
          { path: 'experiences', loadComponent: () => import('./businesses/admin/components/admin-experiences.component').then((m) => m.AdminExperiencesComponent) },
          { path: 'places', loadComponent: () => import('./businesses/admin/components/admin-places.component').then((m) => m.AdminPlacesComponent) },
          { path: 'lookups', loadComponent: () => import('./businesses/admin/components/admin-lookups-home.component').then((m) => m.AdminLookupsHomeComponent) },
          { path: 'lookups/types', loadComponent: () => import('./businesses/admin/lookups/lookup-types/components/lookup-types.component').then((m) => m.LookupTypesComponent) },
          { path: 'lookups/items', loadComponent: () => import('./businesses/admin/lookups/lookup-items/components/lookup-items.component').then((m) => m.LookupItemsComponent) }
        ]
      }
    ]
  },
  {
    path: '',
    canMatch: [publicSiteMatch],
    component: PublicLayoutComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'home' },
      { path: 'home', loadComponent: () => import('./businesses/home/components/home.component').then((m) => m.HomeComponent) },
      { path: 'go-where', loadComponent: () => import('./businesses/go-where/components/go-where.component').then((m) => m.GoWhereComponent) },
      { path: 'destination-plan/:destinationId', loadComponent: () => import('./businesses/destination-plan/components/destination-plan.component').then((m) => m.DestinationPlanComponent) },
      { path: 'cities', loadComponent: () => import('./businesses/cities/components/cities.component').then((m) => m.CitiesComponent) },
      { path: 'accommodations', loadComponent: () => import('./businesses/accommodations/components/accommodations.component').then((m) => m.AccommodationsComponent) },
      { path: 'attractions', loadComponent: () => import('./businesses/attractions/components/attractions.component').then((m) => m.AttractionsComponent) },
      { path: 'details/:type/:id', loadComponent: () => import('./businesses/place-details/components/place-details.component').then((m) => m.PlaceDetailsComponent) },
      { path: 'trip-planner', loadComponent: () => import('./businesses/trip-planner/components/trip-planner.component').then((m) => m.TripPlannerComponent) },
      { path: 'my-plans', loadComponent: () => import('./businesses/my-plans/components/my-plans.component').then((m) => m.MyPlansComponent) },
      { path: 'experiences', loadComponent: () => import('./businesses/experiences/components/experiences.component').then((m) => m.ExperiencesComponent) },
      { path: 'share-experience', loadComponent: () => import('./businesses/share-experience/components/share-experience.component').then((m) => m.ShareExperienceComponent) },
      { path: 'favorites', loadComponent: () => import('./businesses/favorites/components/favorites.component').then((m) => m.FavoritesComponent) },
      { path: 'access-denied', loadComponent: () => import('./businesses/access-denied/components/access-denied.component').then((m) => m.AccessDeniedComponent) }
    ]
  },
  { path: '**', redirectTo: 'home' }
];

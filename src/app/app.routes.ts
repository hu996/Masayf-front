import { CanMatchFn, Routes } from '@angular/router';
import { PublicLayoutComponent } from './layout/public-layout/public-layout.component';
import { adminAuthChildGuard, adminAuthGuard } from './features/admin/guards/admin-auth.guard';

const publicSiteMatch: CanMatchFn = (_route, segments) => segments[0]?.path !== 'admin';

export const routes: Routes = [
  {
    path: 'admin',
    children: [
      {
        path: 'login',
        loadComponent: () => import('./features/admin/components/admin-login.component').then((m) => m.AdminLoginComponent)
      },
      {
        path: '',
        canActivate: [adminAuthGuard],
        canActivateChild: [adminAuthChildGuard],
        loadComponent: () => import('./features/admin/components/admin-layout.component').then((m) => m.AdminLayoutComponent),
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
          { path: 'dashboard', loadComponent: () => import('./features/admin/components/admin-dashboard.component').then((m) => m.AdminDashboardComponent) },
          { path: 'users', loadComponent: () => import('./features/admin/components/admin-users.component').then((m) => m.AdminUsersComponent) },
          { path: 'settings', loadComponent: () => import('./features/admin/components/admin-settings.component').then((m) => m.AdminSettingsComponent) },
          { path: 'cities', loadComponent: () => import('./features/admin/components/admin-cities.component').then((m) => m.AdminCitiesComponent) },
          { path: 'experiences', loadComponent: () => import('./features/admin/components/admin-experiences.component').then((m) => m.AdminExperiencesComponent) },
          { path: 'places', loadComponent: () => import('./features/admin/components/admin-places.component').then((m) => m.AdminPlacesComponent) },
          { path: 'lookups', loadComponent: () => import('./features/admin/components/admin-lookups-home.component').then((m) => m.AdminLookupsHomeComponent) },
          { path: 'lookups/types', loadComponent: () => import('./features/admin/lookups/lookup-types/components/lookup-types.component').then((m) => m.LookupTypesComponent) },
          { path: 'lookups/items', loadComponent: () => import('./features/admin/lookups/lookup-items/components/lookup-items.component').then((m) => m.LookupItemsComponent) }
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
      { path: 'home', loadComponent: () => import('./features/home/components/home.component').then((m) => m.HomeComponent) },
      { path: 'go-where', loadComponent: () => import('./features/go-where/components/go-where.component').then((m) => m.GoWhereComponent) },
      { path: 'destination-plan/:destinationId', loadComponent: () => import('./features/destination-plan/components/destination-plan.component').then((m) => m.DestinationPlanComponent) },
      { path: 'cities', loadComponent: () => import('./features/cities/components/cities.component').then((m) => m.CitiesComponent) },
      { path: 'accommodations', loadComponent: () => import('./features/accommodations/components/accommodations.component').then((m) => m.AccommodationsComponent) },
      { path: 'attractions', loadComponent: () => import('./features/attractions/components/attractions.component').then((m) => m.AttractionsComponent) },
      { path: 'details/:type/:id', loadComponent: () => import('./features/place-details/components/place-details.component').then((m) => m.PlaceDetailsComponent) },
      { path: 'trip-planner', loadComponent: () => import('./features/trip-planner/components/trip-planner.component').then((m) => m.TripPlannerComponent) },
      { path: 'my-plans', loadComponent: () => import('./features/my-plans/components/my-plans.component').then((m) => m.MyPlansComponent) },
      { path: 'experiences', loadComponent: () => import('./features/experiences/components/experiences.component').then((m) => m.ExperiencesComponent) },
      { path: 'share-experience', loadComponent: () => import('./features/share-experience/components/share-experience.component').then((m) => m.ShareExperienceComponent) },
      { path: 'favorites', loadComponent: () => import('./features/favorites/components/favorites.component').then((m) => m.FavoritesComponent) },
      { path: 'access-denied', loadComponent: () => import('./features/access-denied/components/access-denied.component').then((m) => m.AccessDeniedComponent) }
    ]
  },
  { path: '**', redirectTo: 'home' }
];

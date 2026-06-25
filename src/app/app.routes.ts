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
          {
            path: 'experiences',
            loadComponent: () => import('./businesses/admin/components/admin-section.component').then((m) => m.AdminSectionComponent),
            data: {
              title: 'مراجعة التجارب',
              description: 'مركز منفصل لمراجعة تجارب الناس والموافقة على الصور والمحتوى قبل النشر.',
              hint: 'هنا هنضيف جدول المراجعة والـ moderation actions قريبًا.'
            }
          },
          {
            path: 'cities',
            loadComponent: () => import('./businesses/admin/components/admin-section.component').then((m) => m.AdminSectionComponent),
            data: {
              title: 'إدارة المدن',
              description: 'إضافة وتعديل المدن وربطها بالتصنيفات والميزانيات والأنشطة.'
            }
          },
          {
            path: 'places',
            loadComponent: () => import('./businesses/admin/components/admin-section.component').then((m) => m.AdminSectionComponent),
            data: {
              title: 'إدارة الأماكن',
              description: 'إدارة الأماكن والـ accommodations والـ attractions من شاشة واحدة.'
            }
          },
          {
            path: 'food-profiles',
            loadComponent: () => import('./businesses/admin/components/admin-section.component').then((m) => m.AdminSectionComponent),
            data: {
              title: 'Food Cost Profiles',
              description: 'إعداد بروفايلات تكلفة الأكل لاستخدامها في اقتراحات الميزانية.'
            }
          },
          {
            path: 'lookups',
            children: [
              { path: '', pathMatch: 'full', redirectTo: 'types' },
              { path: 'types', loadComponent: () => import('./businesses/admin/lookups/lookup-types/components/lookup-types.component').then((m) => m.LookupTypesComponent) },
              { path: 'items', loadComponent: () => import('./businesses/admin/lookups/lookup-items/components/lookup-items.component').then((m) => m.LookupItemsComponent) }
            ]
          }
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

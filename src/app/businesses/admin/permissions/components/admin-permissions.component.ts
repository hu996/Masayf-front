import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AdminPermissionCatalogComponent } from './admin-permission-catalog.component';

@Component({
  selector: 'app-admin-permissions',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AdminPermissionCatalogComponent],
  templateUrl: './admin-permissions.component.html',
  styleUrl: './admin-permissions.component.scss'
})
export class AdminPermissionsComponent {}

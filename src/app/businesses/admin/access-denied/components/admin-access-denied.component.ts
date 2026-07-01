import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-admin-access-denied',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './admin-access-denied.component.html',
  styleUrl: './admin-access-denied.component.scss'
})
export class AdminAccessDeniedComponent {}


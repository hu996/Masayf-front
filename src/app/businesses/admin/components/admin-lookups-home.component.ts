import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-admin-lookups-home',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './admin-lookups-home.component.html',
  styleUrl: './admin-lookups-home.component.scss'
})
export class AdminLookupsHomeComponent {}

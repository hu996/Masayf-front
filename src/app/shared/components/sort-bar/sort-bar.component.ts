import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-sort-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sort-bar.component.html',
  styleUrl: './sort-bar.component.scss'
})
export class SortBarComponent {}

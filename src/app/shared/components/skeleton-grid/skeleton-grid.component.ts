import { Component, input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-skeleton-grid',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './skeleton-grid.component.html'
})
export class SkeletonGridComponent {
  readonly count = input(6);
  readonly items = () => Array.from({ length: this.count() }, (_, index) => index);
}


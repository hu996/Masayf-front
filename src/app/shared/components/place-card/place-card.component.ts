import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { normalizeId, Place } from '../../../core/models/api.models';
import { PricePipe } from '../../pipes/price.pipe';

@Component({
  selector: 'app-place-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, PricePipe],
  templateUrl: './place-card.component.html',
  styleUrl: './place-card.component.scss'
})
export class PlaceCardComponent {
  readonly place = input.required<Place>();
  readonly type = input<'accommodation' | 'attraction'>('accommodation');

  image(): string {
    const place = this.place();
    return place.mainImageUrl || place.imageUrl || place.images?.[0] || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80';
  }

  placeId() {
    return normalizeId(this.place().id ?? this.place().placeId);
  }
}


import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  selector: 'app-admin-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './admin-section.component.html',
  styleUrl: './admin-section.component.scss'
})
export class AdminSectionComponent {
  private readonly route = inject(ActivatedRoute);

  readonly title = this.route.snapshot.data['title'] ?? 'لوحة الإدارة';
  readonly description = this.route.snapshot.data['description'] ?? 'صفحة إدارية منفصلة داخل لوحة التحكم.';
  readonly hint = this.route.snapshot.data['hint'] ?? 'هنا هنكمّل إدارة المحتوى والاعتمادات من غير ما نلمس الواجهة العامة.';
}

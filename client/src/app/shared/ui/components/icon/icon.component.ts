import { Component, input } from '@angular/core';
import type { IconNode } from 'lucide';

/**
 * A Lucide icon drawn in the current text colour and sized by the host's classes. Icons are imported one by one from
 * `lucide`, so each page's bundle holds only the icons it uses. Decorative unless given a label.
 */
@Component({
  selector: 'app-icon',
  template: `
    <svg
      class="size-full"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      @for (node of $icon(); track $index) {
        @let attributes = node[1];
        @switch (node[0]) {
          @case ('path') {
            <svg:path [attr.d]="attributes['d']" />
          }
          @case ('circle') {
            <svg:circle
              [attr.cx]="attributes['cx']"
              [attr.cy]="attributes['cy']"
              [attr.r]="attributes['r']"
            />
          }
          @case ('rect') {
            <svg:rect
              [attr.x]="attributes['x']"
              [attr.y]="attributes['y']"
              [attr.width]="attributes['width']"
              [attr.height]="attributes['height']"
              [attr.rx]="attributes['rx']"
              [attr.ry]="attributes['ry']"
            />
          }
          @case ('line') {
            <svg:line
              [attr.x1]="attributes['x1']"
              [attr.y1]="attributes['y1']"
              [attr.x2]="attributes['x2']"
              [attr.y2]="attributes['y2']"
            />
          }
          @case ('polyline') {
            <svg:polyline [attr.points]="attributes['points']" />
          }
          @case ('polygon') {
            <svg:polygon [attr.points]="attributes['points']" />
          }
          @case ('ellipse') {
            <svg:ellipse
              [attr.cx]="attributes['cx']"
              [attr.cy]="attributes['cy']"
              [attr.rx]="attributes['rx']"
              [attr.ry]="attributes['ry']"
            />
          }
        }
      }
    </svg>
  `,
  host: {
    class: 'inline-block size-4 shrink-0',
    '[attr.role]': "$label() ? 'img' : null",
    '[attr.aria-label]': '$label()',
    '[attr.aria-hidden]': '$label() ? null : true',
  },
})
export class IconComponent {
  readonly $icon = input.required<IconNode>({ alias: 'icon' });
  readonly $label = input<string | null>(null, { alias: 'label' });
}

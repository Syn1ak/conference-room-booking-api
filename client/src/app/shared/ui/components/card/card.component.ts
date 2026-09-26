import { booleanAttribute, Component, input } from '@angular/core';

/**
 * A raised surface that groups related content.
 */
@Component({
  selector: 'app-card',
  template: '<ng-content />',
  host: {
    class: 'block rounded-2xl border border-line bg-surface shadow-card',
    '[class]': "$padded() ? 'p-5 sm:p-6' : ''",
  },
})
export class CardComponent {
  readonly $padded = input(true, { alias: 'padded', transform: booleanAttribute });
}

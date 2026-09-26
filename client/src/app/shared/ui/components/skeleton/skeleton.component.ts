import { Component } from '@angular/core';

/**
 * A pulsing placeholder in the shape of content that's still loading. Size it with classes.
 */
@Component({
  selector: 'app-skeleton',
  template: '',
  host: { class: 'block animate-pulse rounded-lg bg-surface-muted', 'aria-hidden': 'true' },
})
export class SkeletonComponent {}

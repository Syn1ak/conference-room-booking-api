import { Component, input } from '@angular/core';

/**
 * A page's title and one-line description, with room for its main actions (`appPageActions`) on the right.
 */
@Component({
  selector: 'app-page-header',
  template: `
    <div class="min-w-0">
      <h1 class="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{{ $title() }}</h1>
      @if ($description(); as description) {
        <p class="mt-1.5 max-w-2xl text-sm text-ink-muted sm:text-base">{{ description }}</p>
      }
    </div>
    <div class="flex shrink-0 flex-wrap items-center gap-2">
      <ng-content select="[appPageActions]" />
    </div>
  `,
  host: { class: 'flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between' },
})
export class PageHeaderComponent {
  readonly $title = input.required<string>({ alias: 'title' });
  readonly $description = input<string | null>(null, { alias: 'description' });
}

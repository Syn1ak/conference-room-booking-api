import { Component, input } from '@angular/core';

/**
 * Says there's nothing to show yet and what to do next. Project an icon (`appEmptyIcon`) and an action.
 */
@Component({
  selector: 'app-empty-state',
  template: `
    <div
      class="mb-4 flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-brand-100 dark:bg-brand-500/10 dark:text-brand-300 dark:ring-brand-500/20"
    >
      <ng-content select="[appEmptyIcon]" />
    </div>
    <h2 class="text-base font-semibold text-ink">{{ $title() }}</h2>
    @if ($description(); as description) {
      <p class="mt-1 max-w-sm text-sm text-ink-muted">{{ description }}</p>
    }
    <div class="mt-5 flex flex-wrap justify-center gap-2 empty:hidden"><ng-content /></div>
  `,
  host: { class: 'flex flex-col items-center px-6 py-12 text-center' },
})
export class EmptyStateComponent {
  readonly $title = input.required<string>({ alias: 'title' });
  readonly $description = input<string | null>(null, { alias: 'description' });
}

import { Component, input } from '@angular/core';
import { DoorOpen } from 'lucide';
import { IconComponent } from '../../../../shared/ui/components/icon/icon.component';

/**
 * The frame of the sign-in and registration pages: the logo, a title and subtitle, the form, and a footer line.
 */
@Component({
  selector: 'app-auth-card',
  imports: [IconComponent],
  template: `
    <div class="mx-auto w-full max-w-md">
      <div class="mb-8 flex flex-col items-center text-center">
        <span
          class="mb-5 flex size-12 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/25 dark:bg-brand-500"
        >
          <app-icon [icon]="icons.DoorOpen" class="size-6" />
        </span>
        <h1 class="text-2xl font-semibold tracking-tight text-ink">{{ $title() }}</h1>
        <p class="mt-2 text-sm text-ink-muted">{{ $subtitle() }}</p>
      </div>
      <div class="rounded-2xl border border-line bg-surface p-6 shadow-card sm:p-8">
        <ng-content />
      </div>
      <p class="mt-6 text-center text-sm text-ink-muted">
        <ng-content select="[appAuthFooter]" />
      </p>
    </div>
  `,
  host: { class: 'block py-4 sm:py-10' },
})
export class AuthCardComponent {
  protected readonly icons = { DoorOpen };

  readonly $title = input.required<string>({ alias: 'title' });
  readonly $subtitle = input.required<string>({ alias: 'subtitle' });
}

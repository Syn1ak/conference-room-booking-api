import { Component, input } from '@angular/core';

/**
 * A spinning ring in the current text colour, sized by the host's classes (`size-4` by default).
 * With a label it's announced as a status; without one it's decorative, for use inside a busy control.
 */
@Component({
  selector: 'app-spinner',
  template: `
    <svg class="size-full animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle class="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" />
      <path
        class="opacity-90"
        d="M22 12a10 10 0 0 0-10-10"
        stroke="currentColor"
        stroke-width="3"
        stroke-linecap="round"
      />
    </svg>
  `,
  host: {
    class: 'inline-block size-4 shrink-0',
    '[attr.role]': "$label() ? 'status' : null",
    '[attr.aria-label]': '$label()',
    '[attr.aria-hidden]': '$label() ? null : true',
  },
})
export class SpinnerComponent {
  readonly $label = input<string | null>(null, { alias: 'label' });
}

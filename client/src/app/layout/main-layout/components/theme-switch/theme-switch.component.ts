import { Component, inject } from '@angular/core';
import { LucideMonitor, LucideMoon, LucideSun } from '@lucide/angular';
import { ThemeService, TThemePreference } from '../../../../core/services/theme/theme.service';

/**
 * Picks the light theme, the dark theme, or the system's, as a radio group of three icon buttons.
 */
@Component({
  selector: 'app-theme-switch',
  imports: [LucideSun, LucideMoon, LucideMonitor],
  template: `
    @for (option of options; track option.value) {
      <button
        type="button"
        role="radio"
        class="flex size-7 items-center justify-center rounded-lg text-ink-subtle transition-colors hover:text-ink aria-checked:bg-surface aria-checked:text-ink aria-checked:shadow-card dark:aria-checked:bg-line-strong"
        [attr.aria-checked]="theme.$preference() === option.value"
        [attr.aria-label]="option.label"
        [attr.title]="option.label"
        (click)="theme.setPreference(option.value)"
      >
        @switch (option.value) {
          @case ('light') {
            <svg lucideSun class="size-4"></svg>
          }
          @case ('dark') {
            <svg lucideMoon class="size-4"></svg>
          }
          @default {
            <svg lucideMonitor class="size-4"></svg>
          }
        }
      </button>
    }
  `,
  host: {
    role: 'radiogroup',
    'aria-label': 'Theme',
    class: 'inline-flex items-center gap-0.5 rounded-xl bg-surface-muted p-0.5 ring-1 ring-line',
  },
})
export class ThemeSwitchComponent {
  protected readonly theme = inject(ThemeService);

  protected readonly options: { value: TThemePreference; label: string }[] = [
    { value: 'light', label: 'Light theme' },
    { value: 'dark', label: 'Dark theme' },
    { value: 'system', label: 'System theme' },
  ];
}

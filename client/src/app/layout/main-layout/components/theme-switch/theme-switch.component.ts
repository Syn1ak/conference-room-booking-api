import { Component, inject } from '@angular/core';
import { Monitor, Moon, Sun } from 'lucide';
import { ThemeService, TThemePreference } from '../../../../core/services/theme/theme.service';
import { IconComponent } from '../../../../shared/ui/components/icon/icon.component';

/**
 * Picks the light theme, the dark theme, or the system's, as a radio group of three icon buttons.
 */
@Component({
  selector: 'app-theme-switch',
  imports: [IconComponent],
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
            <app-icon [icon]="icons.Sun" class="size-4" />
          }
          @case ('dark') {
            <app-icon [icon]="icons.Moon" class="size-4" />
          }
          @default {
            <app-icon [icon]="icons.Monitor" class="size-4" />
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
  protected readonly icons = { Monitor, Moon, Sun };

  protected readonly theme = inject(ThemeService);

  protected readonly options: { value: TThemePreference; label: string }[] = [
    { value: 'light', label: 'Light theme' },
    { value: 'dark', label: 'Dark theme' },
    { value: 'system', label: 'System theme' },
  ];
}

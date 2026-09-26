import { Component, input, signal } from '@angular/core';
import { FieldTree, FormField } from '@angular/forms/signals';
import { Eye, EyeOff } from 'lucide';
import { InputDirective } from '../../../../shared/ui/directives/input.directive';
import { IconComponent } from '../../../../shared/ui/components/icon/icon.component';

/**
 * A password input with a button that shows or hides what was typed.
 */
@Component({
  selector: 'app-password-input',
  imports: [FormField, InputDirective, IconComponent],
  template: `
    <input
      appInput
      class="pr-11"
      [type]="$visible() ? 'text' : 'password'"
      [attr.autocomplete]="$autocomplete()"
      [formField]="$field()"
    />
    <button
      type="button"
      class="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-ink-subtle transition-colors hover:text-ink"
      [attr.aria-label]="$visible() ? 'Hide password' : 'Show password'"
      [attr.aria-pressed]="$visible()"
      (click)="$visible.set(!$visible())"
    >
      @if ($visible()) {
        <app-icon [icon]="icons.EyeOff" class="size-4" />
      } @else {
        <app-icon [icon]="icons.Eye" class="size-4" />
      }
    </button>
  `,
  host: { class: 'relative block' },
})
export class PasswordInputComponent {
  protected readonly icons = { Eye, EyeOff };

  readonly $field = input.required<FieldTree<string>>({ alias: 'field' });
  readonly $autocomplete = input<'current-password' | 'new-password'>('current-password', {
    alias: 'autocomplete',
  });

  protected readonly $visible = signal(false);
}

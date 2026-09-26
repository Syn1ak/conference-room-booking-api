import { Component, computed, input } from '@angular/core';
import { Check, Circle } from 'lucide';
import { IconComponent } from '../../../../shared/ui/components/icon/icon.component';
import { PASSWORD_RULES } from '../../constants/password-rules.constant';

/**
 * The password policy as a checklist that ticks off each rule as the password meets it.
 */
@Component({
  selector: 'app-password-rules',
  imports: [IconComponent],
  template: `
    @for (rule of $rules(); track rule.label) {
      <li
        class="flex items-center gap-2 text-xs transition-colors"
        [class]="rule.met ? 'text-emerald-700 dark:text-emerald-400' : 'text-ink-subtle'"
      >
        <app-icon [icon]="rule.met ? icons.Check : icons.Circle" class="size-3.5" />
        {{ rule.label }}
        <span class="sr-only">{{ rule.met ? '(done)' : '(not yet)' }}</span>
      </li>
    }
  `,
  host: {
    role: 'list',
    class: 'grid gap-1.5 sm:grid-cols-2',
    'aria-label': 'Password requirements',
  },
})
export class PasswordRulesComponent {
  protected readonly icons = { Check, Circle };

  readonly $password = input.required<string>({ alias: 'password' });

  protected readonly $rules = computed(() => {
    const password = this.$password();

    return PASSWORD_RULES.map((rule) => ({ label: rule.label, met: rule.test(password) }));
  });
}

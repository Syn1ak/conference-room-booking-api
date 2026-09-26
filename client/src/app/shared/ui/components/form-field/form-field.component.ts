import { Component, computed, input } from '@angular/core';
import { FieldTree } from '@angular/forms/signals';
import { CircleAlert } from 'lucide';
import { validationMessage } from '../../utils/validation-message.util';
import { IconComponent } from '../icon/icon.component';

let nextId = 0;

/**
 * Labels a form control and shows its hint and errors. Put an `appInput` control inside; it picks up the id and the
 * accessibility attributes from here. Errors show once the field is touched or the form has been submitted, and
 * include errors the server returned for the field.
 */
@Component({
  selector: 'app-form-field',
  imports: [IconComponent],
  template: `
    <div class="flex items-baseline justify-between gap-2">
      <label class="text-sm font-medium text-ink" [for]="controlId">
        {{ $label() }}
        @if ($isRequired()) {
          <span class="text-red-600 dark:text-red-400" aria-hidden="true">*</span>
        }
      </label>
      <ng-content select="[appFieldAside]" />
    </div>
    <ng-content />
    @if ($hint(); as hint) {
      <p class="text-xs text-ink-subtle" [id]="hintId">{{ hint }}</p>
    }
    <div [id]="errorsId" aria-live="polite">
      @if ($showErrors()) {
        @for (message of $messages(); track message) {
          <p class="flex items-start gap-1.5 text-xs font-medium text-red-600 dark:text-red-400">
            <app-icon [icon]="icons.CircleAlert" class="mt-px size-3.5 shrink-0" />
            {{ message }}
          </p>
        }
      }
    </div>
  `,
  host: { class: 'flex flex-col gap-1.5' },
})
export class FormFieldComponent {
  protected readonly icons = { CircleAlert };

  readonly $field = input.required<FieldTree<unknown>>({ alias: 'field' });
  readonly $label = input.required<string>({ alias: 'label' });
  readonly $hint = input<string | null>(null, { alias: 'hint' });

  readonly controlId = `field-${++nextId}`;
  readonly hintId = `${this.controlId}-hint`;
  readonly errorsId = `${this.controlId}-errors`;

  readonly $isRequired = computed(() => this.$field()().required());

  readonly $showErrors = computed(() => {
    const state = this.$field()();

    return state.touched() && state.invalid();
  });

  readonly $messages = computed(() => [
    ...new Set(this.$field()().errors().map(validationMessage)),
  ]);

  readonly $describedBy = computed(() => {
    const hint = this.$hint();
    const showErrors = this.$showErrors();
    const ids = [hint ? this.hintId : null, showErrors ? this.errorsId : null].filter(Boolean);

    return ids.length > 0 ? ids.join(' ') : null;
  });
}

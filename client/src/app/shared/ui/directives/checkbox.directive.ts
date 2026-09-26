import { Directive } from '@angular/core';

/**
 * Styles a native checkbox in the brand colour. Wrap it in a label with its text.
 */
@Directive({
  selector: 'input[type=checkbox][appCheckbox]',
  host: {
    class:
      'size-4 shrink-0 cursor-pointer rounded border-line-strong accent-brand-600 ' +
      'disabled:cursor-not-allowed disabled:opacity-50 dark:accent-brand-500',
  },
})
export class CheckboxDirective {}

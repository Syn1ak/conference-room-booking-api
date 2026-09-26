import { Directive, ElementRef, inject } from '@angular/core';
import { FormFieldComponent } from '../components/form-field/form-field.component';

const TEXT_CLASSES =
  'block w-full rounded-xl border border-line-strong bg-surface px-3.5 text-sm text-ink shadow-card ' +
  'transition-[border-color,box-shadow] duration-150 placeholder:text-ink-subtle ' +
  'focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15 ' +
  'disabled:cursor-not-allowed disabled:bg-surface-muted disabled:opacity-70 ' +
  'aria-invalid:border-red-500 aria-invalid:focus:ring-red-500/15';

/**
 * Styles a text input, select, or textarea. Inside an `app-form-field` it takes the field's id and is described by
 * its hint and errors, and it's marked invalid while the field shows errors.
 */
@Directive({
  selector: 'input[appInput], select[appInput], textarea[appInput]',
  host: {
    class: TEXT_CLASSES,
    '[class.h-10]': "tagName !== 'TEXTAREA'",
    '[class.py-3]': "tagName === 'TEXTAREA'",
    '[class.select-chevron]': "tagName === 'SELECT'",
    '[attr.id]': 'formField?.controlId ?? null',
    '[attr.aria-describedby]': 'formField?.$describedBy() ?? null',
    '[attr.aria-invalid]': 'formField?.$showErrors() || null',
  },
})
export class InputDirective {
  protected readonly formField = inject(FormFieldComponent, { optional: true });
  protected readonly tagName = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement.tagName;
}

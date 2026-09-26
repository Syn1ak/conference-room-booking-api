import { booleanAttribute, Component, computed, input } from '@angular/core';
import { SpinnerComponent } from '../spinner/spinner.component';

export type TButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type TButtonSize = 'sm' | 'md' | 'lg' | 'icon';

const BASE_CLASSES =
  'relative inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-xl ' +
  'font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 ' +
  'aria-disabled:pointer-events-none aria-disabled:opacity-50';

const VARIANT_CLASSES: Record<TButtonVariant, string> = {
  primary:
    'bg-brand-600 text-white shadow-sm hover:bg-brand-500 active:bg-brand-700 ' +
    'dark:bg-brand-500 dark:hover:bg-brand-400',
  secondary:
    'border border-line-strong bg-surface text-ink shadow-card hover:bg-surface-muted active:bg-line',
  ghost: 'text-ink-muted hover:bg-surface-muted hover:text-ink active:bg-line',
  danger: 'bg-red-600 text-white shadow-sm hover:bg-red-500 active:bg-red-700',
};

const SIZE_CLASSES: Record<TButtonSize, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
  icon: 'size-10',
};

/**
 * Styles a native button or link. While `loading`, the button is disabled and shows a spinner in place of its
 * content, keeping its width, so a form can't be submitted twice.
 */
@Component({
  selector: 'button[app-button], a[app-button]',
  imports: [SpinnerComponent],
  template: `
    @if ($loading()) {
      <app-spinner class="absolute" />
    }
    <span class="inline-flex items-center gap-2" [class.invisible]="$loading()">
      <ng-content />
    </span>
  `,
  host: {
    '[class]': '$classes()',
    '[attr.disabled]': '$isDisabled() ? "" : null',
    '[attr.aria-disabled]': '$isDisabled() || null',
    '[attr.aria-busy]': '$loading() || null',
  },
})
export class ButtonComponent {
  readonly $variant = input<TButtonVariant>('primary', { alias: 'variant' });
  readonly $size = input<TButtonSize>('md', { alias: 'size' });
  readonly $loading = input(false, { alias: 'loading', transform: booleanAttribute });
  readonly $disabled = input(false, { alias: 'disabled', transform: booleanAttribute });

  protected readonly $isDisabled = computed(() => this.$disabled() || this.$loading());

  protected readonly $classes = computed(() => {
    const variant = this.$variant();
    const size = this.$size();

    return `${BASE_CLASSES} ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]}`;
  });
}

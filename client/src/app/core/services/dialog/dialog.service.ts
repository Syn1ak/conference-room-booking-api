import { Dialog, DialogRef } from '@angular/cdk/dialog';
import { ComponentType } from '@angular/cdk/portal';
import { inject, Injectable } from '@angular/core';

export type TDialogSize = 'sm' | 'md' | 'lg';

export type TDialogOptions<TData> = {
  /** What screen readers announce when the dialog opens, usually its title. */
  label: string;
  data?: TData;
  size?: TDialogSize;
};

const MAX_WIDTH: Record<TDialogSize, string> = { sm: '28rem', md: '32rem', lg: '42rem' };

/**
 * Opens modal dialogs with the app's look and behaviour: a dimmed backdrop, focus trapped inside and returned to the
 * opener afterwards, closing on Escape, a backdrop click, or navigation.
 */
@Injectable({ providedIn: 'root' })
export class DialogService {
  private readonly dialog = inject(Dialog);

  open<TResult, TData = unknown, TComponent = unknown>(
    component: ComponentType<TComponent>,
    { label, data, size = 'md' }: TDialogOptions<TData>,
  ): DialogRef<TResult, TComponent> {
    return this.dialog.open<TResult, TData, TComponent>(component, {
      data,
      ariaLabel: label,
      width: 'calc(100vw - 2rem)',
      maxWidth: MAX_WIDTH[size],
      autoFocus: 'first-tabbable',
      restoreFocus: true,
      closeOnNavigation: true,
      backdropClass: ['bg-zinc-950/50', 'backdrop-blur-[2px]', 'animate-fade-in'],
    });
  }
}

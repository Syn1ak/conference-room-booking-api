import { Component, computed, inject } from '@angular/core';
import { ToastService } from '../../core/services/toast/toast.service';
import { ToastComponent } from '../../shared/ui/components/toast/toast.component';

/**
 * Shows the toasts in a corner of the screen. Errors go to an assertive live region and everything else to a polite
 * one; both regions always exist, so screen readers reliably announce new toasts.
 */
@Component({
  selector: 'app-toast-outlet',
  imports: [ToastComponent],
  template: `
    <div class="flex flex-col gap-2" aria-live="assertive">
      @for (toast of $errors(); track toast.id) {
        <app-toast
          [tone]="toast.tone"
          [title]="toast.title"
          [message]="toast.message"
          (dismiss)="toasts.dismiss(toast.id)"
          (mouseenter)="toasts.pause(toast.id)"
          (mouseleave)="toasts.resume(toast.id)"
          (focusin)="toasts.pause(toast.id)"
          (focusout)="toasts.resume(toast.id)"
        />
      }
    </div>
    <div class="flex flex-col gap-2" aria-live="polite">
      @for (toast of $others(); track toast.id) {
        <app-toast
          [tone]="toast.tone"
          [title]="toast.title"
          [message]="toast.message"
          (dismiss)="toasts.dismiss(toast.id)"
          (mouseenter)="toasts.pause(toast.id)"
          (mouseleave)="toasts.resume(toast.id)"
          (focusin)="toasts.pause(toast.id)"
          (focusout)="toasts.resume(toast.id)"
        />
      }
    </div>
  `,
  host: {
    class:
      'pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col gap-2 sm:left-auto sm:right-6 ' +
      'sm:bottom-6 sm:w-96',
  },
})
export class ToastOutletComponent {
  protected readonly toasts = inject(ToastService);

  protected readonly $errors = computed(() =>
    this.toasts.$items().filter((toast) => toast.tone === 'error'),
  );
  protected readonly $others = computed(() =>
    this.toasts.$items().filter((toast) => toast.tone !== 'error'),
  );
}

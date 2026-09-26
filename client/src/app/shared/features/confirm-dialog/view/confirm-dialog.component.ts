import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, inject } from '@angular/core';
import { ButtonComponent } from '../../../ui/components/button/button.component';
import { DialogShellComponent } from '../../../ui/components/dialog-shell/dialog-shell.component';
import { TConfirmOptions } from '../confirm-dialog.types';

/**
 * Asks the user to confirm an action. Closes with true when confirmed, and with nothing otherwise.
 */
@Component({
  selector: 'app-confirm-dialog',
  imports: [DialogShellComponent, ButtonComponent],
  template: `
    <app-dialog-shell [title]="options.title" (dismiss)="dialogRef.close()">
      <p class="text-sm text-ink-muted">{{ options.message }}</p>
      <ng-container appDialogActions>
        <!-- The safe choice gets the focus, so pressing Enter by accident keeps things as they are. -->
        <button
          app-button
          cdkFocusInitial
          variant="secondary"
          type="button"
          (click)="dialogRef.close()"
        >
          {{ options.cancelLabel ?? 'Keep it' }}
        </button>
        <button
          app-button
          type="button"
          [variant]="options.tone === 'danger' ? 'danger' : 'primary'"
          (click)="dialogRef.close(true)"
        >
          {{ options.confirmLabel }}
        </button>
      </ng-container>
    </app-dialog-shell>
  `,
})
export class ConfirmDialogComponent {
  protected readonly options = inject<TConfirmOptions>(DIALOG_DATA);
  protected readonly dialogRef = inject<DialogRef<boolean>>(DialogRef);
}

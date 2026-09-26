import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { DialogService } from '../../../../core/services/dialog/dialog.service';
import { TConfirmOptions } from '../confirm-dialog.types';
import { ConfirmDialogComponent } from '../view/confirm-dialog.component';

/**
 * Asks the user to confirm an action in a dialog.
 */
@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  private readonly dialogs = inject(DialogService);
  private pending: Promise<boolean> | null = null;

  /**
   * Resolves true if the user confirms, and false if they cancel, press Escape, or click outside. While one
   * confirmation is open, asking again returns the same answer instead of stacking a second dialog, so a double click
   * can't ask twice.
   */
  confirm(options: TConfirmOptions): Promise<boolean> {
    this.pending ??= firstValueFrom(
      this.dialogs.open<boolean, TConfirmOptions>(ConfirmDialogComponent, {
        label: options.title,
        data: options,
        size: 'sm',
      }).closed,
    )
      .then((result) => result === true)
      .finally(() => (this.pending = null));

    return this.pending;
  }
}

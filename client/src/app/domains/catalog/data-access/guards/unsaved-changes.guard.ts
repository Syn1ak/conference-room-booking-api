import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { ConfirmDialogService } from '../../../../shared/features/confirm-dialog/data-access/confirm-dialog.service';

/** A page that can tell whether leaving it would lose edits. */
export type THasUnsavedChanges = { hasUnsavedChanges(): boolean };

/** Asks before leaving a page with edits that haven't been saved. */
export const unsavedChangesGuard: CanDeactivateFn<THasUnsavedChanges> = (page) =>
  !page.hasUnsavedChanges() ||
  inject(ConfirmDialogService).confirm({
    title: 'Leave without saving?',
    message: "Your changes haven't been saved and will be lost.",
    confirmLabel: 'Leave',
    cancelLabel: 'Stay',
    tone: 'danger',
  });

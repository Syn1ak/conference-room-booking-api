import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { ConfirmDialogService } from '../../../../shared/features/confirm-dialog/data-access/confirm-dialog.service';
import { unsavedChangesGuard } from './unsaved-changes.guard';

describe('unsavedChangesGuard', () => {
  const confirm = vi.fn();

  beforeEach(() => {
    confirm.mockReset();
    TestBed.configureTestingModule({
      providers: [{ provide: ConfirmDialogService, useValue: { confirm } }],
    });
  });

  const leave = (hasUnsavedChanges: boolean) =>
    TestBed.runInInjectionContext(() =>
      unsavedChangesGuard(
        { hasUnsavedChanges: () => hasUnsavedChanges },
        {} as ActivatedRouteSnapshot,
        {} as RouterStateSnapshot,
        {} as RouterStateSnapshot,
      ),
    );

  it('lets the user leave without asking when nothing changed', () => {
    expect(leave(false)).toBe(true);
    expect(confirm).not.toHaveBeenCalled();
  });

  it('asks before losing changes, and follows the answer', async () => {
    confirm.mockResolvedValue(false);

    await expect(leave(true)).resolves.toBe(false);
    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Leave without saving?' }),
    );
  });
});

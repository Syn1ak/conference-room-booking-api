import { OverlayContainer } from '@angular/cdk/overlay';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { ConfirmDialogService } from './confirm-dialog.service';

describe('ConfirmDialogService', () => {
  const options = {
    title: 'Cancel this booking?',
    message: 'Room A on Thu, 1 Oct, 11:00–15:00. The slot becomes free for others.',
    confirmLabel: 'Cancel booking',
    tone: 'danger' as const,
  };

  let confirmDialog: ConfirmDialogService;

  beforeEach(() => {
    confirmDialog = TestBed.inject(ConfirmDialogService);
  });

  afterEach(() => TestBed.inject(OverlayContainer).ngOnDestroy());

  const settle = () => TestBed.inject(ApplicationRef).whenStable();

  it('opens a dialog labelled by its title, with focus inside', async () => {
    void confirmDialog.confirm(options);
    await settle();

    const dialog = screen.getByRole('dialog', { name: 'Cancel this booking?' });

    expect(dialog).toHaveTextContent('The slot becomes free for others.');
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
  });

  it('resolves true when confirmed', async () => {
    const answer = confirmDialog.confirm(options);
    await settle();

    await userEvent.click(screen.getByRole('button', { name: 'Cancel booking' }));

    await expect(answer).resolves.toBe(true);
  });

  it('resolves false when dismissed with Escape', async () => {
    const answer = confirmDialog.confirm(options);
    await settle();

    // CDK reads the legacy keyCode, which browsers set but user-event doesn't.
    document.activeElement?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }),
    );

    await expect(answer).resolves.toBe(false);
  });

  it('resolves false when the safe choice is taken', async () => {
    const answer = confirmDialog.confirm(options);
    await settle();

    await userEvent.click(screen.getByRole('button', { name: 'Keep it' }));

    await expect(answer).resolves.toBe(false);
  });

  it('shows one dialog when asked twice, and gives both callers the same answer', async () => {
    const first = confirmDialog.confirm(options);
    const second = confirmDialog.confirm(options);
    await settle();

    expect(screen.getAllByRole('dialog')).toHaveLength(1);

    await userEvent.click(screen.getByRole('button', { name: 'Cancel booking' }));

    await expect(first).resolves.toBe(true);
    await expect(second).resolves.toBe(true);
  });

  it('asks again after the previous question was answered', async () => {
    const first = confirmDialog.confirm(options);
    await settle();
    await userEvent.click(screen.getByRole('button', { name: 'Keep it' }));
    await first;

    void confirmDialog.confirm(options);
    await settle();

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});

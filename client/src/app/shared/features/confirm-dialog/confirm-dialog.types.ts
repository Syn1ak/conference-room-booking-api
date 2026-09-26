export type TConfirmOptions = {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** Danger styles the confirm button red, for actions that destroy or undo something. */
  tone?: 'primary' | 'danger';
};

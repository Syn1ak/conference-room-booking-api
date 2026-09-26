export type TToastTone = 'info' | 'success' | 'error';

export type TToast = {
  id: number;
  tone: TToastTone;
  title: string;
  message: string | null;
};

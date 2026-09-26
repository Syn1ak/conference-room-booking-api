import { Injectable, signal } from '@angular/core';
import { TToast, TToastTone } from './toast.types';

/** How long a toast stays, in milliseconds. Errors stay longer, since they usually need reading. */
const DURATION: Record<TToastTone, number> = { info: 5000, success: 5000, error: 8000 };

/** More toasts than this at once become noise; the oldest makes room. */
const MAX_VISIBLE = 3;

type TTimer = {
  handle: ReturnType<typeof setTimeout> | null;
  remaining: number;
  startedAt: number;
};

/**
 * Short messages about something that just happened, such as a booking being cancelled or the server being
 * unreachable. They dismiss themselves, and hovering a toast pauses its timer so it can be read.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly $toasts = signal<TToast[]>([]);
  private readonly timers = new Map<number, TTimer>();
  private nextId = 0;

  readonly $items = this.$toasts.asReadonly();

  info(title: string, message: string | null = null): number {
    return this.show('info', title, message);
  }

  success(title: string, message: string | null = null): number {
    return this.show('success', title, message);
  }

  error(title: string, message: string | null = null): number {
    return this.show('error', title, message);
  }

  dismiss(id: number): void {
    const timer = this.timers.get(id);
    if (timer?.handle) {
      clearTimeout(timer.handle);
    }
    this.timers.delete(id);
    this.$toasts.update((toasts) => toasts.filter((toast) => toast.id !== id));
  }

  pause(id: number): void {
    const timer = this.timers.get(id);
    if (!timer?.handle) {
      return;
    }

    clearTimeout(timer.handle);
    timer.handle = null;
    timer.remaining -= Date.now() - timer.startedAt;
  }

  resume(id: number): void {
    const timer = this.timers.get(id);
    if (!timer || timer.handle) {
      return;
    }

    this.startTimer(id, timer.remaining);
  }

  private show(tone: TToastTone, title: string, message: string | null): number {
    const id = ++this.nextId;
    const overflow = this.$toasts().length + 1 - MAX_VISIBLE;

    for (const dropped of this.$toasts().slice(0, Math.max(0, overflow))) {
      this.dismiss(dropped.id);
    }

    this.$toasts.update((current) => [...current, { id, tone, title, message }]);
    this.startTimer(id, DURATION[tone]);

    return id;
  }

  private startTimer(id: number, duration: number): void {
    this.timers.set(id, {
      handle: setTimeout(() => this.dismiss(id), duration),
      remaining: duration,
      startedAt: Date.now(),
    });
  }
}

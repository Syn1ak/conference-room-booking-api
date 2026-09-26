import { DestroyRef, inject, signal } from '@angular/core';

/**
 * Seconds left before something may be tried again, counting down once a second. Stops when its owner is destroyed.
 */
export function createCooldown() {
  const $secondsLeft = signal(0);
  let timer: ReturnType<typeof setInterval> | null = null;

  const stop = () => {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  };

  inject(DestroyRef).onDestroy(stop);

  return {
    $secondsLeft: $secondsLeft.asReadonly(),
    start(seconds: number): void {
      stop();
      $secondsLeft.set(seconds);
      timer = setInterval(() => {
        $secondsLeft.update((left) => left - 1);
        if ($secondsLeft() <= 0) {
          stop();
        }
      }, 1000);
    },
  };
}

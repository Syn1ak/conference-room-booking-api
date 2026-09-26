import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ToastService } from '../toast/toast.service';
import { TSession } from './session.types';

const STORAGE_KEY = 'crb.session';

/** setTimeout can't wait longer than this; later expiries are rescheduled when the tab is reopened anyway. */
const MAX_TIMEOUT = 2_147_483_647;

/**
 * The signed-in user and their access token. Kept in sessionStorage, so a reload keeps the user signed in but closing
 * the tab signs them out, and ended when the token expires.
 */
@Injectable({ providedIn: 'root' })
export class SessionStore {
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastService);
  private readonly $session = signal<TSession | null>(null);
  private expiryTimer: ReturnType<typeof setTimeout> | null = null;

  readonly $user = computed(() => this.$session()?.user ?? null);
  readonly $role = computed(() => this.$session()?.user.role ?? null);
  readonly $isAuthenticated = computed(() => this.$session() !== null);

  constructor() {
    this.restore();
    inject(DestroyRef).onDestroy(() => this.clearTimer());
  }

  /** The access token to send, or null when signed out. */
  get accessToken(): string | null {
    return this.$session()?.accessToken ?? null;
  }

  start(session: TSession): void {
    this.$session.set(session);
    this.write(session);
    this.scheduleExpiry(session);
  }

  /** Signs the user out on purpose. */
  end(): void {
    this.clearTimer();
    this.$session.set(null);
    this.write(null);
  }

  /**
   * Ends a session the server no longer accepts, and sends the user to sign in again, coming back to where they were.
   * Does nothing when already signed out, so several failing requests lead to one message and one redirect.
   */
  expire(): void {
    if (!this.$session()) {
      return;
    }

    this.end();
    this.toasts.info('Your session has expired', 'Sign in again to continue.');
    void this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
  }

  private restore(): void {
    const session = this.read();
    if (!session || Date.parse(session.expiresAt) <= Date.now()) {
      this.write(null);
      return;
    }

    this.$session.set(session);
    this.scheduleExpiry(session);
  }

  private scheduleExpiry(session: TSession): void {
    this.clearTimer();
    const remaining = Date.parse(session.expiresAt) - Date.now();
    this.expiryTimer = setTimeout(
      () => this.expire(),
      Math.min(Math.max(remaining, 0), MAX_TIMEOUT),
    );
  }

  private clearTimer(): void {
    if (this.expiryTimer) {
      clearTimeout(this.expiryTimer);
      this.expiryTimer = null;
    }
  }

  private read(): TSession | null {
    try {
      const value: unknown = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? 'null');

      return isSession(value) ? value : null;
    } catch {
      return null;
    }
  }

  private write(session: TSession | null): void {
    try {
      if (session) {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      } else {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Storage can be unavailable (private mode, quota); the session then lasts until the page reloads.
    }
  }
}

function isSession(value: unknown): value is TSession {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const session = value as Partial<TSession>;

  return (
    typeof session.accessToken === 'string' &&
    typeof session.expiresAt === 'string' &&
    !Number.isNaN(Date.parse(session.expiresAt)) &&
    typeof session.user?.id === 'string' &&
    typeof session.user.email === 'string' &&
    (session.user.role === 'Admin' || session.user.role === 'Client')
  );
}

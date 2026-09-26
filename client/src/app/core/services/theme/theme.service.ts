import { DOCUMENT } from '@angular/common';
import { DestroyRef, inject, Injectable, signal } from '@angular/core';

export type TThemePreference = 'light' | 'dark' | 'system';

/** Also read by the inline script in index.html, which applies the theme before Angular starts. */
const STORAGE_KEY = 'crb.theme';

/**
 * The light or dark theme. Follows the system unless the user picks one, and remembers the pick in this browser.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly systemDark =
    this.document.defaultView?.matchMedia?.('(prefers-color-scheme: dark)') ?? null;

  readonly $preference = signal<TThemePreference>(this.readPreference());

  constructor() {
    const onSystemChange = () => this.apply();
    this.systemDark?.addEventListener('change', onSystemChange);
    inject(DestroyRef).onDestroy(() =>
      this.systemDark?.removeEventListener('change', onSystemChange),
    );
    this.apply();
  }

  setPreference(preference: TThemePreference): void {
    this.$preference.set(preference);
    try {
      localStorage.setItem(STORAGE_KEY, preference);
    } catch {
      // Without storage the choice lasts until the page reloads.
    }
    this.apply();
  }

  private apply(): void {
    const preference = this.$preference();
    const dark =
      preference === 'dark' || (preference === 'system' && (this.systemDark?.matches ?? false));

    this.document.documentElement.dataset['theme'] = dark ? 'dark' : 'light';
  }

  private readPreference(): TThemePreference {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);

      return stored === 'light' || stored === 'dark' ? stored : 'system';
    } catch {
      return 'system';
    }
  }
}

import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let systemDark = false;
  const listeners: (() => void)[] = [];

  beforeEach(() => {
    localStorage.clear();
    systemDark = false;
    listeners.length = 0;
    // jsdom has no matchMedia.
    vi.stubGlobal(
      'matchMedia',
      () =>
        ({
          get matches() {
            return systemDark;
          },
          addEventListener: (_: string, listener: () => void) => listeners.push(listener),
          removeEventListener: vi.fn(),
        }) as unknown as MediaQueryList,
    );
  });

  afterEach(() => vi.unstubAllGlobals());

  const theme = () => document.documentElement.dataset['theme'];

  it('follows the system by default, and its changes', () => {
    systemDark = true;
    const service = TestBed.inject(ThemeService);

    expect(service.$preference()).toBe('system');
    expect(theme()).toBe('dark');

    systemDark = false;
    listeners.forEach((listener) => listener());

    expect(theme()).toBe('light');
  });

  it('applies and remembers a picked theme, ignoring the system', () => {
    systemDark = true;
    const service = TestBed.inject(ThemeService);

    service.setPreference('light');

    expect(theme()).toBe('light');
    expect(localStorage.getItem('crb.theme')).toBe('light');
  });

  it('starts with the remembered theme', () => {
    localStorage.setItem('crb.theme', 'dark');

    expect(TestBed.inject(ThemeService).$preference()).toBe('dark');
    expect(theme()).toBe('dark');
  });

  it('ignores an unknown remembered value', () => {
    localStorage.setItem('crb.theme', 'sepia');

    expect(TestBed.inject(ThemeService).$preference()).toBe('system');
  });
});

import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { LucideDoorOpen, LucideMenu, LucideX } from '@lucide/angular';
import { filter } from 'rxjs';
import { SessionStore } from '../../../../core/services/session/session.store';
import { ButtonComponent } from '../../../../shared/ui/components/button/button.component';
import { NAV_LINKS } from '../../constants/nav-links.constant';
import { ThemeSwitchComponent } from '../theme-switch/theme-switch.component';
import { UserMenuComponent } from '../user-menu/user-menu.component';

/**
 * The sticky top bar: the logo, the navigation for the current user, the theme switch, and the account menu or the
 * sign-in links. On small screens the navigation folds into a panel under the bar.
 */
@Component({
  selector: 'app-header',
  imports: [
    RouterLink,
    RouterLinkActive,
    ButtonComponent,
    ThemeSwitchComponent,
    UserMenuComponent,
    LucideDoorOpen,
    LucideMenu,
    LucideX,
  ],
  templateUrl: './header.component.html',
  host: {
    role: 'banner',
    class: 'sticky top-0 z-40 block border-b border-line bg-canvas/80 backdrop-blur-lg',
  },
})
export class HeaderComponent {
  protected readonly session = inject(SessionStore);

  protected readonly $menuOpen = signal(false);
  protected readonly $links = computed(() => NAV_LINKS[this.session.$role() ?? 'Visitor']);

  constructor() {
    inject(Router)
      .events.pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe(() => this.$menuOpen.set(false));
  }

  protected toggleMenu(): void {
    this.$menuOpen.update((open) => !open);
  }
}

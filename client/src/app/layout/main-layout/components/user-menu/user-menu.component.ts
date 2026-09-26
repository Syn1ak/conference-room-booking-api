import { Menu, MenuContent, MenuItem, MenuTrigger } from '@angular/aria/menu';
import { OverlayModule } from '@angular/cdk/overlay';
import { Component, computed, inject, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { LucideCalendarDays, LucideChevronDown, LucideLogOut } from '@lucide/angular';
import { SessionStore } from '../../../../core/services/session/session.store';
import { ToastService } from '../../../../core/services/toast/toast.service';
import { BadgeComponent } from '../../../../shared/ui/components/badge/badge.component';

type TUserMenuAction = 'bookings' | 'sign-out';

/**
 * The signed-in user's avatar and a menu with their account, their bookings (for clients), and signing out.
 */
@Component({
  selector: 'app-user-menu',
  imports: [
    Menu,
    MenuContent,
    MenuItem,
    MenuTrigger,
    OverlayModule,
    BadgeComponent,
    LucideChevronDown,
    LucideLogOut,
    LucideCalendarDays,
  ],
  templateUrl: './user-menu.component.html',
})
export class UserMenuComponent {
  protected readonly session = inject(SessionStore);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastService);

  protected readonly $userMenu = viewChild<Menu<TUserMenuAction>>('userMenu');

  protected readonly $initial = computed(() =>
    (this.session.$user()?.email ?? '?').charAt(0).toUpperCase(),
  );

  protected onSelect(action: TUserMenuAction | undefined): void {
    if (action === 'bookings') {
      void this.router.navigate(['/bookings']);
    } else if (action === 'sign-out') {
      this.session.end();
      this.toasts.success('Signed out', 'See you next time.');
      void this.router.navigate(['/']);
    }
  }
}

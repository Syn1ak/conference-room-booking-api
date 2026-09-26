import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { LucideShieldX } from '@lucide/angular';
import { SessionStore } from '../../../../core/services/session/session.store';
import { homeUrl } from '../../../../core/utils/home-url.util';
import { ButtonComponent } from '../../../../shared/ui/components/button/button.component';

/**
 * Shown when a signed-in user opens a page their role can't use, such as a client opening the reports.
 */
@Component({
  selector: 'app-no-access',
  imports: [RouterLink, ButtonComponent, LucideShieldX],
  template: `
    <div
      class="mb-6 flex size-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 ring-1 ring-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20"
    >
      <svg lucideShieldX class="size-7"></svg>
    </div>
    <h1 class="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
      You don't have access to this page
    </h1>
    @if (session.$user(); as user) {
      <p class="mt-2 max-w-md text-ink-muted">
        You're signed in as <span class="font-medium text-ink">{{ user.email }}</span
        >, a {{ user.role === 'Admin' ? 'staff' : 'client' }} account. This page is for
        {{ user.role === 'Admin' ? 'clients' : 'staff' }} only.
      </p>
    }
    <div class="mt-8 flex flex-wrap justify-center gap-3">
      <a app-button [routerLink]="$homeUrl()">Go to my home page</a>
      <button app-button variant="secondary" type="button" (click)="switchAccount()">
        Sign in with another account
      </button>
    </div>
  `,
  host: { class: 'flex flex-col items-center px-4 py-24 text-center' },
})
export default class NoAccessComponent {
  protected readonly session = inject(SessionStore);
  private readonly router = inject(Router);

  protected readonly $homeUrl = computed(() => homeUrl(this.session.$role()));

  protected switchAccount(): void {
    this.session.end();
    void this.router.navigate(['/login']);
  }
}

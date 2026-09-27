import { Component, computed, inject, input, signal } from '@angular/core';
import {
  email,
  form,
  FormField,
  FormRoot,
  required,
  submit,
  TreeValidationResult,
} from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { IDemoAccount } from '../../../../core/entities/auth/auth.dto';
import { AuthClient } from '../../../../core/services/api/auth/auth.client';
import { toApiError, toFormErrors } from '../../../../core/utils/api-error.util';
import { homeUrl } from '../../../../core/utils/home-url.util';
import { AlertComponent } from '../../../../shared/ui/components/alert/alert.component';
import { ButtonComponent } from '../../../../shared/ui/components/button/button.component';
import { FormFieldComponent } from '../../../../shared/ui/components/form-field/form-field.component';
import { InputDirective } from '../../../../shared/ui/directives/input.directive';
import { validationMessage } from '../../../../shared/ui/utils/validation-message.util';
import { SignInService } from '../../data-access/services/sign-in.service';
import { safeReturnUrl } from '../../utils/return-url.util';
import { AuthCardComponent } from '../../view/components/auth-card.component';
import { PasswordInputComponent } from '../../view/components/password-input.component';
import { createCooldown } from '../../view/cooldown';

/**
 * Signs a user in and sends them back where they came from, or to their home page.
 */
@Component({
  selector: 'app-login',
  imports: [
    FormField,
    FormRoot,
    RouterLink,
    AuthCardComponent,
    AlertComponent,
    ButtonComponent,
    FormFieldComponent,
    InputDirective,
    PasswordInputComponent,
  ],
  templateUrl: './login.component.html',
})
export default class LoginComponent {
  private readonly signInService = inject(SignInService);
  private readonly router = inject(Router);

  /** Where to go after signing in, from the query string. */
  readonly $returnUrl = input<string | null>(null, { alias: 'returnUrl' });

  protected readonly demoAccounts = inject(AuthClient).demoAccountsResource();
  protected readonly cooldown = createCooldown();
  protected readonly $safeReturnUrl = computed(() => safeReturnUrl(this.$returnUrl()));

  protected readonly model = signal({ email: '', password: '' });
  protected readonly loginForm = form(
    this.model,
    (path) => {
      required(path.email, { message: 'Enter your email.' });
      email(path.email, { message: 'Enter a valid email address.' });
      required(path.password, { message: 'Enter your password.' });
    },
    { submission: { action: (field) => this.submit(field().value()) } },
  );

  /**
   * Why the last attempt failed, when it isn't about a field. Kept out of the form's errors, which would block trying
   * again until something was edited.
   */
  protected readonly $submitError = signal<string | null>(null);

  protected readonly $formErrors = computed(() => {
    const submitError = this.$submitError();
    const errors = this.loginForm().errors().map(validationMessage);

    return submitError ? [submitError, ...errors] : errors;
  });

  /** Signs in with a demo account in one click. */
  protected signInAs(account: IDemoAccount): void {
    this.model.set({ email: account.email, password: account.password });
    void submit(this.loginForm);
  }

  private async submit(credentials: {
    email: string;
    password: string;
  }): Promise<TreeValidationResult> {
    this.$submitError.set(null);

    try {
      const role = await this.signInService.signIn(credentials);
      await this.router.navigateByUrl(this.$safeReturnUrl() ?? homeUrl(role));

      return undefined;
    } catch (error) {
      const apiError = toApiError(error);

      if (apiError.status === 401) {
        // The same message for an unknown email, a wrong password, and a locked account (ADR 0001).
        this.$submitError.set('Invalid email or password.');
        return undefined;
      }

      if (apiError.status === 429) {
        this.cooldown.start(apiError.retryAfterSeconds ?? 60);
        this.$submitError.set('Too many sign-in attempts. Wait a moment and try again.');
        return undefined;
      }

      if (apiError.status === 0 || apiError.status >= 500) {
        this.$submitError.set("We couldn't reach the server. Check your connection and try again.");
        return undefined;
      }

      return toFormErrors(apiError, {
        email: this.loginForm.email,
        password: this.loginForm.password,
      });
    }
  }
}

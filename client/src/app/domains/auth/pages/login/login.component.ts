import { Component, computed, inject, input, signal } from '@angular/core';
import {
  email,
  form,
  FormField,
  FormRoot,
  required,
  TreeValidationResult,
} from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
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

  protected readonly $formErrors = computed(() => this.loginForm().errors().map(validationMessage));

  private async submit(credentials: {
    email: string;
    password: string;
  }): Promise<TreeValidationResult> {
    try {
      const role = await this.signInService.signIn(credentials);
      await this.router.navigateByUrl(this.$safeReturnUrl() ?? homeUrl(role));

      return undefined;
    } catch (error) {
      const apiError = toApiError(error);

      if (apiError.status === 401) {
        // The same message for an unknown email, a wrong password, and a locked account (ADR 0001).
        return { kind: 'server', message: 'Invalid email or password.' };
      }

      if (apiError.status === 429) {
        this.cooldown.start(apiError.retryAfterSeconds ?? 60);
        return {
          kind: 'server',
          message: 'Too many sign-in attempts. Wait a moment and try again.',
        };
      }

      if (apiError.status === 0 || apiError.status >= 500) {
        return {
          kind: 'server',
          message: "We couldn't reach the server. Check your connection and try again.",
        };
      }

      return toFormErrors(apiError, {
        email: this.loginForm.email,
        password: this.loginForm.password,
      });
    }
  }
}

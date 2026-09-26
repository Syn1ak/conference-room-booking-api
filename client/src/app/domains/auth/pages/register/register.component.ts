import { Component, computed, inject, input, signal } from '@angular/core';
import {
  email,
  form,
  FormField,
  FormRoot,
  required,
  TreeValidationResult,
  validate,
} from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { toApiError, toFormErrors } from '../../../../core/utils/api-error.util';
import { homeUrl } from '../../../../core/utils/home-url.util';
import { AlertComponent } from '../../../../shared/ui/components/alert/alert.component';
import { ButtonComponent } from '../../../../shared/ui/components/button/button.component';
import { FormFieldComponent } from '../../../../shared/ui/components/form-field/form-field.component';
import { InputDirective } from '../../../../shared/ui/directives/input.directive';
import { validationMessage } from '../../../../shared/ui/utils/validation-message.util';
import { PASSWORD_RULES } from '../../constants/password-rules.constant';
import { SignInService } from '../../data-access/services/sign-in.service';
import { safeReturnUrl } from '../../utils/return-url.util';
import { AuthCardComponent } from '../../view/components/auth-card.component';
import { PasswordInputComponent } from '../../view/components/password-input.component';
import { PasswordRulesComponent } from '../../view/components/password-rules.component';
import { createCooldown } from '../../view/cooldown';

type TRegistration = { email: string; password: string; confirmPassword: string };

/**
 * Creates a client account and signs in with it right away.
 */
@Component({
  selector: 'app-register',
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
    PasswordRulesComponent,
  ],
  templateUrl: './register.component.html',
})
export default class RegisterComponent {
  private readonly signInService = inject(SignInService);
  private readonly router = inject(Router);

  /** Where to go after registering, from the query string. */
  readonly $returnUrl = input<string | null>(null, { alias: 'returnUrl' });

  protected readonly cooldown = createCooldown();
  protected readonly $safeReturnUrl = computed(() => safeReturnUrl(this.$returnUrl()));

  protected readonly model = signal<TRegistration>({
    email: '',
    password: '',
    confirmPassword: '',
  });
  protected readonly registerForm = form(
    this.model,
    (path) => {
      required(path.email, { message: 'Enter your email.' });
      email(path.email, { message: 'Enter a valid email address.' });
      required(path.password, { message: 'Choose a password.' });
      validate(path.password, ({ value }) =>
        value() && !PASSWORD_RULES.every((rule) => rule.test(value()))
          ? { kind: 'weakPassword', message: "The password doesn't meet all the requirements." }
          : undefined,
      );
      required(path.confirmPassword, { message: 'Repeat the password.' });
      validate(path.confirmPassword, ({ value, valueOf }) =>
        value() && value() !== valueOf(path.password)
          ? { kind: 'mismatch', message: "The passwords don't match." }
          : undefined,
      );
    },
    { submission: { action: (field) => this.submit(field().value()) } },
  );

  protected readonly $formErrors = computed(() =>
    this.registerForm().errors().map(validationMessage),
  );

  private async submit({ email, password }: TRegistration): Promise<TreeValidationResult> {
    try {
      const role = await this.signInService.register({ email, password });
      await this.router.navigateByUrl(this.$safeReturnUrl() ?? homeUrl(role));

      return undefined;
    } catch (error) {
      const apiError = toApiError(error);

      if (apiError.status === 429) {
        this.cooldown.start(apiError.retryAfterSeconds ?? 60);
        return { kind: 'server', message: 'Too many attempts. Wait a moment and try again.' };
      }

      if (apiError.status === 0 || apiError.status >= 500) {
        return {
          kind: 'server',
          message: "We couldn't reach the server. Check your connection and try again.",
        };
      }

      return toFormErrors(apiError, {
        email: this.registerForm.email,
        password: this.registerForm.password,
      });
    }
  }
}

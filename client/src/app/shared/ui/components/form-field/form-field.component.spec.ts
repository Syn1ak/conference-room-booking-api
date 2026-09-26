import { Component, signal } from '@angular/core';
import { email, form, FormField, FormRoot, required } from '@angular/forms/signals';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { InputDirective } from '../../directives/input.directive';
import { FormFieldComponent } from './form-field.component';

@Component({
  imports: [FormField, FormRoot, FormFieldComponent, InputDirective],
  template: `
    <form [formRoot]="signUpForm">
      <app-form-field label="Email" hint="We never share it." [field]="signUpForm.email">
        <input appInput type="email" [formField]="signUpForm.email" />
      </app-form-field>
      <button type="submit">Sign up</button>
    </form>
  `,
})
class SignUpHostComponent {
  readonly model = signal({ email: '' });
  readonly signUpForm = form(
    this.model,
    (path) => {
      required(path.email, { message: 'Enter your email.' });
      email(path.email, { message: 'That email looks wrong.' });
    },
    {
      submission: {
        action: async (field) =>
          field.email().value() === 'taken@example.com'
            ? {
                kind: 'server',
                message: 'An account with this email already exists.',
                fieldTree: field.email,
              }
            : undefined,
      },
    },
  );
}

describe('FormFieldComponent', () => {
  it('labels the control and marks the field as required', async () => {
    await render(SignUpHostComponent);

    const input = screen.getByLabelText('Email');

    expect(input).toHaveAttribute('type', 'email');
    expect(input).toBeRequired();
    expect(screen.getByText('*')).toHaveAttribute('aria-hidden', 'true');
  });

  it('describes the control by its hint', async () => {
    await render(SignUpHostComponent);

    const input = screen.getByLabelText(/Email/);

    expect(input).toHaveAccessibleDescription('We never share it.');
  });

  it("doesn't show errors before the field is touched", async () => {
    await render(SignUpHostComponent);

    expect(screen.queryByText('Enter your email.')).toBeNull();
    expect(screen.getByLabelText(/Email/)).not.toHaveAttribute('aria-invalid');
  });

  it('shows errors once the field loses focus', async () => {
    await render(SignUpHostComponent);
    const input = screen.getByLabelText(/Email/);

    await userEvent.type(input, 'not-an-email');
    await userEvent.tab();

    expect(await screen.findByText('That email looks wrong.')).toBeInTheDocument();
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription(/That email looks wrong\./);
  });

  it('shows errors of untouched fields when the form is submitted', async () => {
    await render(SignUpHostComponent);

    await userEvent.click(screen.getByRole('button', { name: 'Sign up' }));

    expect(await screen.findByText('Enter your email.')).toBeInTheDocument();
  });

  it('shows an error returned by the server and clears it when the value changes', async () => {
    await render(SignUpHostComponent);
    const input = screen.getByLabelText(/Email/);

    await userEvent.type(input, 'taken@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Sign up' }));
    expect(
      await screen.findByText('An account with this email already exists.'),
    ).toBeInTheDocument();

    await userEvent.type(input, 'x');

    expect(screen.queryByText('An account with this email already exists.')).toBeNull();
  });
});

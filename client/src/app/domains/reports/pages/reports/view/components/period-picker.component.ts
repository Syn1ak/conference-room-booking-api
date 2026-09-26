import { Component, computed, input, linkedSignal, output } from '@angular/core';
import { form, FormField, FormRoot, validate } from '@angular/forms/signals';
import { ButtonComponent } from '../../../../../../shared/ui/components/button/button.component';
import { FormFieldComponent } from '../../../../../../shared/ui/components/form-field/form-field.component';
import { InputDirective } from '../../../../../../shared/ui/directives/input.directive';
import { periodPresets, periodProblem, TReportPeriod } from '../../../../utils/report-period.util';

/**
 * Picks a report's period: one of the common presets, or any range of up to 366 days.
 */
@Component({
  selector: 'app-period-picker',
  imports: [FormField, FormRoot, ButtonComponent, FormFieldComponent, InputDirective],
  template: `
    <div class="flex flex-wrap gap-2" role="group" aria-label="Common periods">
      @for (preset of $presets(); track preset.id) {
        <button
          app-button
          size="sm"
          type="button"
          [variant]="preset.id === $activePreset() ? 'primary' : 'secondary'"
          [attr.aria-pressed]="preset.id === $activePreset()"
          (click)="$periodChange.emit(preset.period)"
        >
          {{ preset.label }}
        </button>
      }
    </div>
    <form class="mt-4 flex flex-wrap items-start gap-3" [formRoot]="periodForm">
      <app-form-field label="From" [field]="periodForm.from">
        <input appInput type="date" [formField]="periodForm.from" />
      </app-form-field>
      <app-form-field label="To" [field]="periodForm.to">
        <input appInput type="date" [formField]="periodForm.to" />
      </app-form-field>
      <div class="flex flex-col gap-1.5">
        <span class="text-sm font-medium" aria-hidden="true">&nbsp;</span>
        <button app-button variant="secondary" type="submit">Show</button>
      </div>
    </form>
  `,
  host: { class: 'block' },
})
export class PeriodPickerComponent {
  readonly $period = input.required<TReportPeriod>({ alias: 'period' });
  readonly $today = input.required<string>({ alias: 'today' });
  readonly $periodChange = output<TReportPeriod>({ alias: 'periodChange' });

  protected readonly $presets = computed(() => periodPresets(this.$today()));
  protected readonly $activePreset = computed(() => {
    const { from, to } = this.$period();

    return (
      this.$presets().find((preset) => preset.period.from === from && preset.period.to === to)
        ?.id ?? null
    );
  });

  protected readonly model = linkedSignal(() => ({ ...this.$period() }));
  protected readonly periodForm = form(
    this.model,
    (path) => {
      validate(path.to, ({ value, valueOf }) => {
        const message = periodProblem({ from: valueOf(path.from), to: value() });
        return message ? { kind: 'period', message } : undefined;
      });
    },
    {
      submission: {
        action: async (field) => {
          this.$periodChange.emit(field().value());
        },
      },
    },
  );
}

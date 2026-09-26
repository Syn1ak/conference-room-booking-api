import { Component, computed, DestroyRef, inject, input, linkedSignal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import {
  FieldContext,
  form,
  FormField,
  FormRoot,
  min,
  required,
  validate,
} from '@angular/forms/signals';
import { Router } from '@angular/router';
import { Search } from 'lucide';
import { filter } from 'rxjs';
import { minutesOfDay, TSlotInput } from '../../../../core/utils/venue-time.util';
import { BandTimelineComponent } from '../../../../shared/ui/components/band-timeline/band-timeline.component';
import { ButtonComponent } from '../../../../shared/ui/components/button/button.component';
import { CardComponent } from '../../../../shared/ui/components/card/card.component';
import { FormFieldComponent } from '../../../../shared/ui/components/form-field/form-field.component';
import { IconComponent } from '../../../../shared/ui/components/icon/icon.component';
import { InputDirective } from '../../../../shared/ui/directives/input.directive';
import { FindRoomFacade } from './data-access/find-room.facade';
import { TSearchQuery } from './models/search-query.types';
import { isCompleteSearch, parseSearchQuery } from './utils/search-query.util';

/**
 * The home page: search for rooms that are free for a time and hold a group. The search lives in the query string,
 * so it can be shared, survives a reload, and works with the browser's back and forward buttons.
 */
@Component({
  selector: 'app-find-room',
  imports: [
    FormField,
    FormRoot,
    BandTimelineComponent,
    ButtonComponent,
    CardComponent,
    FormFieldComponent,
    IconComponent,
    InputDirective,
  ],
  providers: [FindRoomFacade],
  templateUrl: './find-room.component.html',
})
export default class FindRoomComponent {
  protected readonly icons = { Search };
  protected readonly facade = inject(FindRoomFacade);
  private readonly router = inject(Router);

  readonly $date = input<string | undefined>(undefined, { alias: 'date' });
  readonly $from = input<string | undefined>(undefined, { alias: 'from' });
  readonly $to = input<string | undefined>(undefined, { alias: 'to' });
  readonly $capacity = input<string | undefined>(undefined, { alias: 'capacity' });

  private readonly $rawQuery = computed(() => ({
    date: this.$date(),
    from: this.$from(),
    to: this.$to(),
    capacity: this.$capacity(),
  }));

  protected readonly model = linkedSignal<TSearchQuery>(() =>
    parseSearchQuery(this.$rawQuery(), this.facade.today(), this.facade.timeOptions),
  );

  protected readonly searchForm = form(
    this.model,
    (path) => {
      const slotOf = ({ valueOf }: FieldContext<unknown>): TSlotInput => ({
        date: valueOf(path.date),
        from: valueOf(path.from),
        to: valueOf(path.to),
      });
      const slotRule = (field: keyof TSlotInput) => (context: FieldContext<string>) => {
        const message = this.facade.problemFor(field, slotOf(context));

        return message ? { kind: 'slot', message } : undefined;
      };

      required(path.date, { message: 'Pick a date.' });
      validate(path.date, slotRule('date'));
      validate(path.from, slotRule('from'));
      validate(path.to, slotRule('to'));
      required(path.capacity, { message: 'How many people?' });
      min(path.capacity, 1, { message: 'At least 1 person.' });
    },
    {
      submission: {
        action: async (field) => {
          await this.router.navigate([], { queryParams: field().value() });
        },
      },
    },
  );

  protected readonly $highlight = computed(() => {
    const { from, to } = this.model();

    return { start: minutesOfDay(from), end: minutesOfDay(to) };
  });

  constructor() {
    // A shared link with a search that can't be booked shows why, instead of silently showing nothing.
    toObservable(this.$rawQuery)
      .pipe(
        filter((raw) => isCompleteSearch(raw)),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe(() => this.searchForm().markAsTouched());
  }
}

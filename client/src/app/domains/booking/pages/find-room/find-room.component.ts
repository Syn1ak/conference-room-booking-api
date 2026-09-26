import { KeyValuePipe } from '@angular/common';
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
import { Router, RouterLink } from '@angular/router';
import { CalendarSearch, Search, SearchX } from 'lucide';
import { filter } from 'rxjs';
import { IAvailableRoom } from '../../../../core/entities/rooms/room.dto';
import { SessionStore } from '../../../../core/services/session/session.store';
import { minutesOfDay, TSlotInput } from '../../../../core/utils/venue-time.util';
import { BandTimelineComponent } from '../../../../shared/ui/components/band-timeline/band-timeline.component';
import { ButtonComponent } from '../../../../shared/ui/components/button/button.component';
import { AlertComponent } from '../../../../shared/ui/components/alert/alert.component';
import { CardComponent } from '../../../../shared/ui/components/card/card.component';
import { EmptyStateComponent } from '../../../../shared/ui/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../../shared/ui/components/error-state/error-state.component';
import { FormFieldComponent } from '../../../../shared/ui/components/form-field/form-field.component';
import { IconComponent } from '../../../../shared/ui/components/icon/icon.component';
import { SkeletonComponent } from '../../../../shared/ui/components/skeleton/skeleton.component';
import { InputDirective } from '../../../../shared/ui/directives/input.directive';
import { WallDatePipe } from '../../../../shared/ui/pipes/wall-date.pipe';
import { AvailableRoomCardComponent } from './view/components/available-room-card.component';
import { BookRoomDialogService } from '../../features/book-room/data-access/book-room-dialog.service';
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
    RouterLink,
    AlertComponent,
    AvailableRoomCardComponent,
    BandTimelineComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    SkeletonComponent,
    WallDatePipe,
    KeyValuePipe,
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
  protected readonly icons = { CalendarSearch, Search, SearchX };
  protected readonly facade = inject(FindRoomFacade);
  private readonly router = inject(Router);
  private readonly bookRoomDialog = inject(BookRoomDialogService);
  protected readonly session = inject(SessionStore);

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

  /** The search in the query string, once it's whole and bookable; results are shown for it. */
  private readonly $activeQuery = computed(() => {
    const raw = this.$rawQuery();
    if (!isCompleteSearch(raw)) {
      return null;
    }

    const query = parseSearchQuery(raw, this.facade.today(), this.facade.timeOptions);

    return this.facade.isBookable(query) ? query : null;
  });

  protected readonly search = this.facade.createSearch(this.$activeQuery);

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

  /** The page to come back to after signing in: this search. */
  protected get currentUrl(): string {
    return this.router.url;
  }

  protected async book(room: IAvailableRoom): Promise<void> {
    const query = this.search.$query();
    if (!query) {
      return;
    }

    await this.bookRoomDialog.open({ room, ...query, refreshResults: () => this.search.reload() });
    // Closed with a booking or without one, by any means: refresh, since the room may be taken now.
    this.search.reload();
  }
}

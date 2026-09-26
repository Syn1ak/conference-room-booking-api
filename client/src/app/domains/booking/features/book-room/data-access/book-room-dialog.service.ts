import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { DialogService } from '../../../../../core/services/dialog/dialog.service';
import { TBookRoomData, TBookRoomResult } from '../models/book-room.types';
import { BookRoomDialogComponent } from '../view/book-room-dialog.component';

/**
 * Opens the booking dialog for a room and resolves with the booking, or with nothing if it was closed.
 */
@Injectable({ providedIn: 'root' })
export class BookRoomDialogService {
  private readonly dialogs = inject(DialogService);

  open(data: TBookRoomData): Promise<TBookRoomResult> {
    return firstValueFrom(
      this.dialogs.open<TBookRoomResult, TBookRoomData>(BookRoomDialogComponent, {
        label: `Book ${data.room.name}`,
        data,
        size: 'md',
      }).closed,
    );
  }
}

import { Pipe, PipeTransform } from '@angular/core';

const AMOUNT = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Formats an amount of hryvnias the way the task writes prices: `9,400.00 UAH`.
 */
@Pipe({ name: 'uah' })
export class UahPipe implements PipeTransform {
  transform(amount: number | null | undefined): string {
    return amount === null || amount === undefined ? '' : `${AMOUNT.format(amount)} UAH`;
  }
}

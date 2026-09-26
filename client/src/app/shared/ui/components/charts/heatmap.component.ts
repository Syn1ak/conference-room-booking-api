import { Component, computed, input, signal } from '@angular/core';

export type THeatmapRow = { label: string; cells: { value: number; detail: string }[] };

/**
 * A grid of rates from 0 to 1, darker for higher, such as how full each time band is on each weekday. Hovering or
 * focusing a cell shows its detail; screen readers get a table.
 */
@Component({
  selector: 'app-heatmap',
  template: `
    <div class="relative overflow-x-auto" role="group" [attr.aria-label]="$caption()">
      <div
        class="grid min-w-[28rem] gap-1"
        [style.grid-template-columns]="'4rem repeat(' + $columns().length + ', 1fr)'"
      >
        <span aria-hidden="true"></span>
        @for (column of $columns(); track column) {
          <span class="pb-1 text-center text-[11px] text-ink-subtle" aria-hidden="true">{{
            column
          }}</span>
        }
        @for (row of $rows(); track row.label; let rowIndex = $index) {
          <span class="flex items-center text-xs text-ink-muted" aria-hidden="true">{{
            row.label
          }}</span>
          @for (cell of row.cells; track $index; let columnIndex = $index) {
            <div
              class="relative flex h-10 items-center justify-center rounded-md text-[11px] font-medium tabular-nums ring-line outline-none focus:ring-2"
              tabindex="0"
              role="img"
              [attr.aria-label]="
                row.label +
                ', ' +
                $columns()[columnIndex] +
                ': ' +
                cell.percent +
                ', ' +
                cell.detail
              "
              [style.background-color]="cell.color"
              [class]="cell.value > 0.55 ? 'text-white' : 'text-ink-muted'"
              (mouseenter)="$active.set(rowIndex + ':' + columnIndex)"
              (mouseleave)="$active.set(null)"
              (focus)="$active.set(rowIndex + ':' + columnIndex)"
              (blur)="$active.set(null)"
            >
              {{ cell.percent }}
              @if ($active() === rowIndex + ':' + columnIndex) {
                <div
                  class="absolute bottom-full left-1/2 z-10 mb-2 w-max -translate-x-1/2 rounded-lg border border-line bg-surface px-3 py-2 text-xs font-normal text-ink shadow-float"
                >
                  <p class="font-semibold">{{ row.label }} · {{ $columns()[columnIndex] }}</p>
                  <p class="text-ink-muted">{{ cell.detail }}</p>
                </div>
              }
            </div>
          }
        }
      </div>
    </div>
    <!-- Visually hidden on a wrapper: tables ignore the tiny width that hides other elements. -->
    <div class="sr-only">
      <table>
        <caption>
          {{
            $caption()
          }}
        </caption>
        <thead>
          <tr>
            <th scope="col"></th>
            @for (column of $columns(); track column) {
              <th scope="col">{{ column }}</th>
            }
          </tr>
        </thead>
        <tbody>
          @for (row of $rows(); track row.label) {
            <tr>
              <th scope="row">{{ row.label }}</th>
              @for (cell of row.cells; track $index) {
                <td>{{ cell.percent }}, {{ cell.detail }}</td>
              }
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
  host: { class: 'block' },
})
export class HeatmapComponent {
  readonly $columns = input.required<string[]>({ alias: 'columns' });
  readonly $data = input.required<THeatmapRow[]>({ alias: 'rows' });
  readonly $caption = input.required<string>({ alias: 'caption' });

  protected readonly $active = signal<string | null>(null);

  /** One hue from light to dark; an empty cell keeps a faint tint so the grid stays readable. */
  protected readonly $rows = computed(() =>
    this.$data().map((row) => ({
      ...row,
      cells: row.cells.map((cell) => {
        const value = Math.min(1, Math.max(0, cell.value));

        return {
          ...cell,
          value,
          percent: `${Math.round(value * 100)}%`,
          color: `color-mix(in oklab, var(--color-chart-1) ${Math.round(6 + value * 94)}%, var(--color-surface))`,
        };
      }),
    })),
  );
}

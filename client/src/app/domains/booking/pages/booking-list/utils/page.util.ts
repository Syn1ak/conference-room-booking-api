/** The page number from the query string: a whole number from 1, or 1 for anything else. */
export function parsePage(value: string | null | undefined): number {
  const page = Number(value);

  return Number.isInteger(page) && page >= 1 ? page : 1;
}

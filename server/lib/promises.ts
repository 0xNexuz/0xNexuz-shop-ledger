/**
 * Which promised payment day still applies to a customer.
 *
 * A promise belongs to the credit it came with. Once the customer's balance is
 * cleared, those promises are kept and no longer count: a customer who paid
 * an old debt on time and later takes new credit without a date is not late.
 */

export interface BalanceMove {
  /** Signed change to the balance, in kobo: + credit given, − paid. */
  delta: number;
  /** Day promised for this credit, YYYY-MM-DD, if any. */
  dueDate: string | null;
}

/**
 * The latest promised day among the credit still open, or null when nothing
 * open carries a date. `moves` must be in the order they happened.
 */
export function openPromise(moves: readonly BalanceMove[]): string | null {
  let running = 0;
  let promise: string | null = null;
  for (const move of moves) {
    running += move.delta;
    if (move.delta > 0 && move.dueDate && (promise === null || move.dueDate > promise)) promise = move.dueDate;
    if (running <= 0) {
      running = 0;
      promise = null;
    }
  }
  return promise;
}

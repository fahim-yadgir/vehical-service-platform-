const IST_OFFSET_MS = 330 * 60 * 1000; // IST = UTC+5:30
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Checks whether a YYYY-MM-DD string represents a real calendar date
 * (rejects invalid dates like 2026-02-30 or 2026-13-01).
 */
export function isRealDate(dateStr: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (month < 1 || month > 12 || day < 1 || day > 31) return false;

  const check = new Date(Date.UTC(year, month - 1, day));
  return (
    check.getUTCFullYear() === year &&
    check.getUTCMonth() === month - 1 &&
    check.getUTCDate() === day
  );
}

/**
 * Start of the given YYYY-MM-DD date in IST (00:00:00.000 IST), returned as UTC ISO string.
 */
export function istStart(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0) - IST_OFFSET_MS).toISOString();
}

/**
 * End of the given YYYY-MM-DD date in IST (23:59:59.999 IST), returned as UTC ISO string.
 */
export function istEnd(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0, 0) - IST_OFFSET_MS - 1).toISOString();
}

/**
 * Start of current IST month and start of next IST month (UTC ISO strings).
 */
export function istMonthRange(now: Date = new Date()): { start: string; end: string } {
  const ist = new Date(now.getTime() + IST_OFFSET_MS); // UTC getters ab IST ki date dete hain
  const year = ist.getUTCFullYear();
  const month = ist.getUTCMonth();
  return {
    start: new Date(Date.UTC(year, month, 1) - IST_OFFSET_MS).toISOString(),
    end: new Date(Date.UTC(year, month + 1, 1) - IST_OFFSET_MS).toISOString(),
  };
}

export { DAY_MS, IST_OFFSET_MS };
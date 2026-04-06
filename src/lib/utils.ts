export function formatCurrency(amount: number | null): string {
  if (amount === null) return 'N/A';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

export function isValidIATA(code: string): boolean {
  return /^[A-Z]{3}$/.test(code);
}

export function formatDateRange(checkIn: string, checkOut: string): string {
  const start = new Date(checkIn + 'T00:00:00');
  const end = new Date(checkOut + 'T00:00:00');
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const startStr = start.toLocaleDateString('en-US', opts);
  const endStr = end.toLocaleDateString('en-US', opts);
  const nights = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return `${startStr} – ${endStr} (${nights} night${nights !== 1 ? 's' : ''})`;
}

export function nightsBetween(checkIn: string, checkOut: string): number {
  const start = new Date(checkIn + 'T00:00:00');
  const end = new Date(checkOut + 'T00:00:00');
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function cityLabel(name: string, state: string): string {
  return `${name}, ${state}`;
}

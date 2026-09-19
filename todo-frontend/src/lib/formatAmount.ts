/** Group digits with vi-VN thousands separators. Keep leading zeros so
 *  mid-edit (70000 → delete 7 → type 8) does not wipe the rest. */
export function formatAmountInput(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function parseAmountInput(formatted: string): number {
  return Number(formatted.replace(/\D/g, "")) || 0;
}

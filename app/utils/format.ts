/** Pure presentation helpers — no dependencies, trivially unit-testable. */

export function formatMoney(amount: number, currencyCode: string | null | undefined): string {
  const currency = currencyCode ?? "USD";
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
  } catch {
    // Guard against an unexpected/blank currency code from the API.
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

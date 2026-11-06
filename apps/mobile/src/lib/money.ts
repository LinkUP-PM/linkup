/** Só dígitos; interpreta como centavos (máx. R$ 99.999.999,99). */
export function moneyCentsDigits(value: string): string {
  return value.replace(/\D/g, "").slice(0, 10);
}

/** Converte reais inteiros (banco) para texto mascarado. */
export function formatBrazilMoneyFromReais(reais: number | null | undefined): string {
  if (reais == null || !Number.isFinite(reais) || reais < 0) return "";
  return formatBrazilMoneyFromCents(Math.round(reais * 100));
}

/** Formata centavos → R$ 9.000,00 */
export function formatBrazilMoneyFromCents(cents: number): string {
  const safe = Math.max(0, Math.floor(cents));
  const intPart = Math.floor(safe / 100);
  const frac = String(safe % 100).padStart(2, "0");
  const grouped = intPart
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `R$ ${grouped},${frac}`;
}

/**
 * Máscara de digitação BR: digitos entram como centavos.
 * Ex.: 900000 → R$ 9.000,00
 */
export function formatBrazilMoneyInput(value: string): string {
  const digits = moneyCentsDigits(value);
  if (!digits) return "";
  return formatBrazilMoneyFromCents(Number(digits));
}

/** Extrai reais inteiros do texto mascarado (centavos arredondados). */
export function parseBrazilMoneyToReais(value: string): number | null {
  const digits = moneyCentsDigits(value);
  if (!digits) return null;
  return Math.round(Number(digits) / 100);
}

/** Mantém só dígitos, no máximo 8. */
export function cepDigits(value: string): string {
  return value.replace(/\D/g, "").slice(0, 8);
}

/**
 * Máscara BR de CEP: XXXXX-XXX
 * Ex.: 01310100 → 01310-100
 */
export function formatBrazilCep(value: string): string {
  const digits = cepDigits(value);
  if (digits.length === 0) return "";
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

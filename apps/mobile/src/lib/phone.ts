/** Mantém só dígitos, no máximo 11 (DDD + número). */
export function phoneDigits(value: string): string {
  return value.replace(/\D/g, "").slice(0, 11);
}

/**
 * Máscara BR: (XX) X XXXX-XXXX (celular) ou (XX) XXXX-XXXX (fixo).
 * Ex.: 11999887766 → (11) 9 9988-7766
 */
export function formatBrazilPhone(value: string): string {
  const digits = phoneDigits(value);
  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;

  const ddd = digits.slice(0, 2);
  const rest = digits.slice(2);
  const mobile = rest.length === 0 || rest[0] === "9" || rest.length > 8;

  if (!mobile) {
    if (rest.length <= 4) return `(${ddd}) ${rest}`;
    return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4, 8)}`;
  }

  if (rest.length === 0) return `(${ddd}) `;
  if (rest.length === 1) return `(${ddd}) ${rest}`;

  const first = rest.slice(0, 1);
  const mid = rest.slice(1, 5);
  const end = rest.slice(5, 9);
  if (end.length === 0) return `(${ddd}) ${first} ${mid}`;
  return `(${ddd}) ${first} ${mid}-${end}`;
}

export function relativeTime(iso: string, now = Date.now()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;

  const diffMs = Math.max(0, now - then);
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours === 1 ? "há 1 hora" : `há ${hours} horas`;

  const days = Math.floor(hours / 24);
  if (days < 7) return days === 1 ? "há 1 dia" : `há ${days} dias`;

  return new Date(iso).toLocaleDateString("pt-BR");
}

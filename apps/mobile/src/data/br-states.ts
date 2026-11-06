import citiesByUf from "./br-cities-by-uf.json";

export type BrazilUf = keyof typeof citiesByUf;

export const BRAZIL_UFS = (Object.keys(citiesByUf) as BrazilUf[]).sort((a, b) =>
  a.localeCompare(b, "pt-BR"),
);

export const BRAZIL_UF_LABELS: Record<string, string> = {
  AC: "Acre",
  AL: "Alagoas",
  AP: "Amapá",
  AM: "Amazonas",
  BA: "Bahia",
  CE: "Ceará",
  DF: "Distrito Federal",
  ES: "Espírito Santo",
  GO: "Goiás",
  MA: "Maranhão",
  MT: "Mato Grosso",
  MS: "Mato Grosso do Sul",
  MG: "Minas Gerais",
  PA: "Pará",
  PB: "Paraíba",
  PR: "Paraná",
  PE: "Pernambuco",
  PI: "Piauí",
  RJ: "Rio de Janeiro",
  RN: "Rio Grande do Norte",
  RS: "Rio Grande do Sul",
  RO: "Rondônia",
  RR: "Roraima",
  SC: "Santa Catarina",
  SP: "São Paulo",
  SE: "Sergipe",
  TO: "Tocantins",
};

export function citiesForUf(uf: string): string[] {
  const key = uf.trim().toUpperCase();
  const list = (citiesByUf as Record<string, string[]>)[key];
  return list ?? [];
}

export function ufOptionLabel(uf: string): string {
  const name = BRAZIL_UF_LABELS[uf];
  return name ? `${uf} — ${name}` : uf;
}

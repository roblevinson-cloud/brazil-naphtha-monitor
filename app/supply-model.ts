export type Cracker = {
  complex: string;
  code: string;
  configuration: string;
  capacityKt: number;
  utilization: { 2023: number; 2024: number; 2025: number };
  feedstock: string;
  route: string;
  counterparties: string;
};

export const CRACKERS: Cracker[] = [
  {
    complex: "Camaçari · Bahia",
    code: "Q1 / BA",
    configuration: "2 olefins units",
    capacityKt: 1280,
    utilization: { 2023: 64, 2024: 75, 2025: 61 },
    feedstock: "Naphtha + condensate; flexible imported ethane",
    route: "Ocean tanker → Aratu terminals → pipeline to Camaçari",
    counterparties: "International suppliers (majority); Petrobras maritime volumes; Acelen / Mataripe; Enterprise Products ethane",
  },
  {
    complex: "Triunfo · Rio Grande do Sul",
    code: "Q2 / RS",
    configuration: "2 olefins units",
    capacityKt: 1252,
    utilization: { 2023: 74, 2024: 66, 2025: 72 },
    feedstock: "Naphtha + condensate",
    route: "Rio Grande / Osório marine system → terminal, barge and pipeline network → Triunfo",
    counterparties: "International suppliers (majority); Petrobras maritime + REFAP; small RPR spot volumes",
  },
  {
    complex: "Capuava · São Paulo",
    code: "Q3 / SP",
    configuration: "1 olefins unit",
    capacityKt: 700,
    utilization: { 2023: 72, 2024: 73, 2025: 70 },
    feedstock: "Naphtha + refinery off-gas",
    route: "Petrobras refinery and terminal network → pipeline to Capuava",
    counterparties: "Petrobras supplies essentially all naphtha and refinery off-gas",
  },
  {
    complex: "Duque de Caxias · Rio de Janeiro",
    code: "Q4 / RJ",
    configuration: "1 gas cracker",
    capacityKt: 520,
    utilization: { 2023: 77, 2024: 76, 2025: 75 },
    feedstock: "Ethane + propane; normally no naphtha",
    route: "REDUC gas-processing system → dedicated pipeline to the cracker",
    counterparties: "Petrobras is the dominant contracted supplier",
  },
];

export const CONTRACT_CHANGES = [
  {
    scope: "São Paulo naphtha",
    oldTerms: "Up to 2.0 Mt/y",
    newTerms: "1.5–1.7 Mt/y for 2026–30; additional volumes negotiable",
    effect: "Lower disclosed band and a clearer operating range",
  },
  {
    scope: "Bahia + RS maritime naphtha",
    oldTerms: "0.65 Mt/y minimum; Petrobras option for up to 2.85 Mt/y additional",
    newTerms: "0.28–2.016 Mt/y to Q1/BA and Q2/RS terminals; extras negotiable",
    effect: "Smaller base tranche with delivery route explicitly defined",
  },
  {
    scope: "REFAP → Triunfo naphtha",
    oldTerms: "Contained within broader southern supply arrangements",
    newTerms: "0.10 Mt in 2026, rising annually to 0.30 Mt in 2030",
    effect: "A visible, growing domestic-refinery supply route",
  },
  {
    scope: "Total naphtha ceiling",
    oldTerms: "About 5.5 Mt/y theoretical maximum",
    newTerms: "Up to 4.116 Mt in 2026; 4.316 Mt in 2030",
    effect: "The theoretical maximum falls by about 1.2–1.4 Mt/y",
  },
  {
    scope: "Rio ethane + propane",
    oldTerms: "0.58 Mt/y ethylene-equivalent through 2025",
    newTerms: "0.58 Mt/y through 2028; 0.725 Mt/y in 2029–36",
    effect: "Eleven-year agreement underwrites the planned Rio expansion",
  },
  {
    scope: "Pricing",
    oldTerms: "ARA / international benchmark formulas",
    newTerms: "International benchmark formulas; exact adjustments undisclosed",
    effect: "Import-parity economics remain; no disclosed structural discount",
  },
];

export const MODEL_SOURCES = {
  braskem20f: "https://www.sec.gov/Archives/edgar/data/1071438/000129281426002427/bakform20f_2025.htm",
  contract6k: "https://www.sec.gov/Archives/edgar/data/1071438/000129281425004404/bak20251223_6k3.htm",
  petrobrasContracts: "https://agencia.petrobras.com.br/en/w/petrobras-informa-sobre-novos-contratos-comerciais-com-a-braskem",
  petrobrasReport: "https://petrobras.com.br/documents/2677942/17808296/Management%2BReport%2B2025.pdf/c8e4fe18-0baa-3988-e5a0-ea18bc3a8041?download=true&t=1777312966000&version=1.0",
};

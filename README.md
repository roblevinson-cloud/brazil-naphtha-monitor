# Brazil Naphtha Monitor

Live dashboard: [roblevinson-cloud.github.io/brazil-naphtha-monitor](https://roblevinson-cloud.github.io/brazil-naphtha-monitor/)

A train-station-style monitor for identifiable naphtha calls into Brazil and a
reconciled look-back at Braskem's 2026 imports.

The dashboard keeps three different states separate:

- **Scheduled / underway:** near-real-time CODEBA vessel calls for Aratu,
  including ETA, ETB, vessel, terminal, planned cargo tonnes, DWT and operator.
- **Completed physical calls:** port-call tonnes that have finished discharge,
  retained as a provisional weekly record.
- **Customs closed:** ANP customs kilograms for Braskem and NCM 27101241. This is
  the controlling monthly record for YTD, origin country and 30/90-day metrics.

Planned cargo, vessel DWT and customs-cleared mass are intentionally never
substituted for one another.

## Data sources

- [ANP import-clearance report](https://www.gov.br/anp/pt-br/assuntos/importacoes-e-exportacoes/relatorio-de-desembaracos-de-importacoes-de-petroleo-gas-derivados-e-biocombustiveis)
- [CODEBA Aratu vessel line-up](https://codeba.gov.br/eficiente/sites/portalcodeba/pt-br/porto_aratu.php?secao=tportos_aratu)
- [ANP terminal movements](https://www.gov.br/anp/pt-br/centrais-de-conteudo/dados-abertos/movimentacao-dos-terminais-aquaviarios)
- [Braskem Resolution 881 files](https://www.braskem.com/resolucao-anp-881)
- [ANTAQ Estatístico Aquaviário](https://dados.gov.br/dados/conjuntos-dados/estatistico-aquaviario-ea)

`scripts/update_data.py` downloads and harmonizes the first two sources into
`public/data/dashboard.json`. The GitHub Actions workflow refreshes that snapshot
every two hours and commits only when the data changes. Every push to `main`
also rebuilds and republishes the public GitHub Pages site.

## Run locally

Requirements: Node.js 22.13+ and Python 3.12+.

```bash
npm install
python -m pip install -r requirements-data.txt
python scripts/update_data.py
npm run dev
```

Open `http://localhost:3000`. To verify the production build:

```bash
npm test
```

## GitHub setup

The client refresh button reads the published snapshot from:

```text
https://raw.githubusercontent.com/roblevinson-cloud/brazil-naphtha-monitor/main/public/data/dashboard.json
```

Create that public repository, push this project to its `main` branch and leave
GitHub Actions enabled. No secret is required for the official-source baseline.
A private repository needs a small authenticated API instead of the public raw
URL.

## Known coverage gap

CODEBA supplies a strong vessel-level board for Aratu. The public Osório /
Tramandaí sources do not expose consignee, cargo and voyage origin as cleanly.
Country of origin is therefore confirmed at monthly customs close; live rows
show `PENDING MATCH` until a licensed AIS/cargo provider such as Spire,
MarineTraffic, Kpler or Vortexa is added. An API subscription is optional and is
the next step for reliable live origin and southern-port attribution.

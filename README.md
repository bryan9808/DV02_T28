# DV02_T28 – Who Gets Hurt and Where

Interactive D3.js data story on hospitalised road crash injuries in Australia, 2011–2021 (COS30045, Group 28).

## Structure
- `index.html` – page layout, one section per research question
- `css/style.css` – shared colours, type and chart styles
- `js/common.js` – shared helpers (responsive SVG, tooltips, toggles, switchable bar chart)
- `js/q1_trend.js` … `js/q5_age_remoteness.js` – one file per research question
- `data/` – CSV files exported from the KNIME workflow (`DV02_T28_HospitalisedInjury.knwf`)

## Run locally
Browsers block loading CSV files from `file://`, so use a local server,
e.g. the VS Code **Live Server** extension (right-click `index.html` → Open with Live Server).

## Data sources
BITRE (2023) Hospitalised Injury; ABS (2026) National, state and territory population, March 2026; ABS (2026) Regional population, 2024–25.

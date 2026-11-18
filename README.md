# DV02_T28 — Who Gets Hurt and Where

An interactive D3.js data story about hospitalised road-crash injuries in Australia, 2011–2021 (COS30045, Group 28).

## Run locally

The page loads CSV data with `fetch`, so browsers will not load it correctly from `file://`. Start a local web server from the repository root—for example, in VS Code, install/use **Live Server**, right-click `index.html`, and choose **Open with Live Server**. D3.js v7.9.0 is loaded from jsDelivr, so a network connection is needed for that CDN resource.

## What’s included

- **Q1 annual trend:** filter all years, either configured range, or a specific year; view a total and percentage-change KPI, gradient area, crosshair, and optional three-year moving average.
- **Q2 road users:** compare absolute and percentage-point changes, and sort by absolute or percentage change.
- **Q3 counterparties:** highlight counterparty groups and open a detailed count breakdown by selecting a road-user bar.
- **Q4 jurisdictions and Q5 remoteness:** switch between counts and rates; rate views show a national-average reference.
- **Responsive and accessible interactions:** touch-friendly controls and tooltips, hidden chart data tables, keyboard navigation, skip link, live announcements, and Web Speech narration.

For feature details, the modified-file map, and manual verification steps, see [FEATURES.md](./FEATURES.md). The cumulative feature record is in [CHANGELOG.md](./CHANGELOG.md).

## Project structure

- `index.html` — page structure, controls, navigation, and accessibility landmarks
- `css/style.css` — palette, chart/control styles, touch targets, and responsive breakpoints
- `js/common.js` — shared SVG, table, keyboard, tooltip, live-announcement, narration, and chart helpers
- `js/q1_trend.js` … `js/q5_age_remoteness.js` — chart-specific data processing and interactions
- `data/` — CSV files exported from the KNIME workflow (`DV02_T28_HospitalisedInjury.knwf`)

## Data sources

BITRE (2023), *Hospitalised Injury*; ABS (2026), *National, state and territory population, March 2026*; ABS (2026), *Regional population, 2024–25*. The relevant period for each chart is stated in [FEATURES.md](./FEATURES.md).

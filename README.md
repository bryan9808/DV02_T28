# DV02_T28 — Who Gets Hurt and Where

An interactive D3.js data story about hospitalised road-crash injuries in Australia, 2011–2021 (COS30045, Group 28).

## Run locally

The page loads CSV data with `fetch`, so browsers will not load it correctly from `file://`. Start a local web server from the repository root—for example, in VS Code, install/use **Live Server**, right-click `index.html`, and choose **Open with Live Server**. D3.js v7.9.0 and d3-sankey v0.12.3 are loaded from jsDelivr, so a network connection is needed for those CDN resources.

## What’s included

- **Q1 annual trend:** filter all years, a range, or one year; total and percentage-change KPI, gradient area, crosshair, optional three-year moving average, reporting-break annotations.
- **Q2 road users:** compare any two years (see *Enabling the full year filters*); switch between a diverging **Change** chart and a **Before & after** dumbbell chart; measure by people or share; sort by absolute or percentage change; automatic warning when a comparison crosses a reporting change.
- **Q3 counterparties:** **Sankey flow diagram** (road user → what they collided with) or 100% share bars; legend highlighting in both views; select a road user for the full breakdown; period filter.
- **Q4 jurisdictions:** a **map of Australia** (proportional circles for the number of people, shading for the rate per 100,000) and ranked bars, shown together as coordinated views; NSW hatched for its counting change; ACT labelled offshore; year filter.
- **Q5 age and remoteness:** a **variable-width age histogram** (bar width = age range, height = average per year of age) with a toggle to group totals, and an **isotype pictogram** of remoteness (each figure = a set number of people or of people per 100,000 residents, shown in its key); year filter.
- **Design:** road-sign visual language (guide-sign green, warning-sign yellow, Overpass highway lettering), chapter route markers, key-finding sentences, and a closing “What this means” section.
- **Responsive:** every chart redraws at the width of the screen (phone layouts put labels above bars), so nothing needs sideways scrolling.
- **Accessible:** hidden data tables, arrow-key navigation, labelled marks, skip link, live announcements, Web Speech narration generated from the current data, 4.5:1 text contrast.

Details and manual test steps: [FEATURES.md](./FEATURES.md). Change record: [CHANGELOG.md](./CHANGELOG.md).

## Enabling the full year filters

The year selectors appear automatically when multi-year CSVs exist. Until then, each chart uses its single-period file (Q2: 2017 vs 2021; Q3: 2017–2021; Q4/Q5: 2021). Export these from the KNIME workflow into `data/`, then list each file name in `data/manifest.json`, e.g. `{"optional": ["q2_road_users_by_year.csv", "q4_jurisdictions_by_year.csv"]}`. Files not listed are never requested, so the console stays free of 404 errors.

| File | Columns | KNIME branch (start from **Keep Traffic only** unless stated) |
| --- | --- | --- |
| `q2_road_users_by_year.csv` | `year, road_user, hospitalisations` | GroupBy *Calendar year* + *Road user*, Sum *Hospitalisations* → Column Renamer → CSV Writer |
| `q3_counterparty_by_year.csv` | `year, road_user, counterparty, hospitalisations` | From **Q3: Keep vulnerable road users** (before the 2017–2021 filter): GroupBy *Calendar year* + *Road user* + *Counterparty* → rename → CSV |
| `q4_jurisdictions_by_year.csv` | `year, state, hospitalisations, population` | State raw block A–F: GroupBy *calendar year* + *state or territory* (no 2021 filter). ABS 310104 *Data1*: keep the June row of each year 2011–2021, Persons columns, Unpivot, add `year` from the date, map names to state codes. Joiner on **year + state** → rename → CSV |
| `q5_age_by_year.csv` | `year, age_group, hospitalisations, age_order` | GroupBy *Calendar year* + *Age group* → Rule Engine `age_order` → rename → CSV |
| `q5_remoteness_by_year.csv` | `year, remoteness, hospitalisations, population` | GroupBy *Calendar year* + *ABS remoteness area*. ABS Table 3: keep RA codes 0–4, Unpivot the 2011–2021 columns, Rule Engine to Major Cities / Regional / Remote, GroupBy year + group. Joiner on **year + remoteness** → rename → CSV |

Q5’s year filter appears only when **both** Q5 files are exported, so the age and remoteness charts always show the same year.

## Project structure

- `index.html` — page structure, controls, navigation, and accessibility landmarks
- `css/style.css` — palette, chart/control styles, touch targets, and responsive breakpoints
- `js/common.js` — shared responsive drawing, SVG, table, keyboard, tooltip, announcement, narration, year-filter and chart helpers
- `js/q1_trend.js` … `js/q5_age_remoteness.js` — chart-specific data processing and interactions
- `data/` — CSV files exported from the KNIME workflow (`DV02_T28_HospitalisedInjury.knwf`), `manifest.json`, and `australia_states.json` (simplified state boundaries)

## Data sources

BITRE (2023), *Hospitalised Injury*; ABS (2026), *National, state and territory population, March 2026*; ABS (2026), *Regional population, 2024–25*. State boundaries: ABS Australian Statistical Geography Standard (CC BY 4.0), via the `rowanhogan/australian-states` GeoJSON, simplified with mapshaper.

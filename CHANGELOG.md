# Changelog

This changelog records the interactive, responsive, and accessibility features in the data story.

## Iteration 4 — redesign, Q4 map, Q5 visualisations

### Refinements after review
- **All-years and period options:** Q3, Q4 and Q5 can show *All years (2011–2021)* or *2017–2021 (consistent counting)* as well as single years. For periods, counts are summed and rates are average yearly rates (total cases ÷ person-years); a caution note appears when a period spans the VIC 2012 or NSW 2017 counting changes. Q2 keeps its two-year comparison.
- Multi-year CSVs are checked on load (column names and numbers); a problem file is skipped with a console message and the chart uses its single-period file. Unknown age groups are ignored.
- Q4 circle-size key now uses filled circles matching the map, leader lines to each value, and the title “Circle size = people hospitalised”.
- Q5 age histogram: group names inside each bar and an “open-ended” label on the 75+ group.
- Q5 pictogram: unit chosen to fill the chart width (no empty right side); partial figures now clip correctly.
- Controls grouped in a light panel with more space between rows; panels with nothing to show are hidden.

### Design
- New road-sign visual language: guide-sign green hero and navigation, warning-sign yellow route markers for each chapter, Overpass (highway-sign lettering) for all type.
- Hero redesigned as a guide sign with the key facts set as destination lines.
- Chapters are a continuous story separated by dashed lane markings (replacing identical boxed cards); each opens with a one-sentence key finding.
- New closing section, “What this means”: key points and limits of the data.

### Q4
- Replaced the tile map with a **real map of Australia** (simplified ABS boundaries): proportional circles (area = number of people) in the count view, a choropleth in the rate view. Circles for counts and shading for rates follow standard mapping practice.
- NSW hatched for its reporting caveat; ACT labelled offshore with a leader line; legends for both views; linked highlighting with the ranked bars kept.

### Q5
- **Variable-width age histogram**: each age group is as wide as its age range and its height is the average per year of age, so unequal age bands no longer mislead. Toggle back to totals per group. The open-ended 75+ group is hatched and noted as an assumption.
- **Isotype pictogram** for remoteness: each figure is a set number of people (count) or people per 100,000 residents (rate), stated in the key and sized to fill the chart; partial figures and an all-areas reference line.

## Iteration 3 — lecturer feedback (complexity, year filters, mobile, accessibility)

### New visualisations and features
- **Q3 Sankey flow diagram** (road user → counterparty) alongside the 100% share bars, with a view toggle; legend highlighting and the breakdown panel work in both views.
- **Q4 Australia tile map** shown with the ranked bars as **coordinated views**: hovering or focusing a state highlights it in both charts.
- **Q2 dumbbell (“Before & after”) view** in addition to the diverging change bars.
- **Year filters** for Q2 (compare any two years), Q3 (period), Q4 and Q5 (year). They use multi-year CSVs listed in `data/manifest.json` and fall back to the current files until those are exported.
- **Reporting-change warnings** appear automatically when a selected year or comparison crosses the VIC 2012 or NSW 2017 counting changes.
- Hero card now shows three headline figures; intro and note text use the full card width (no empty right-hand side).

### Mobile
- Every chart now **redraws at the screen width** (`DV.responsive` with `ResizeObserver`) instead of scrolling sideways at a fixed 860px.
- Phone layouts: labels above bars, fewer/compact ticks, angled age labels, Sankey labels with a white halo, shorter annotations.

### Accessibility
- Fixed 59 axe violations: focusable chart marks now have `role="img"` so their labels are announced.
- Annotation text changed from yellow to dark text (yellow failed contrast); lines and outlines on white use a darker amber (`--accent-strong`, about 4.5:1).
- Increase bars, the NSW caveat bar and tile have outlines so they meet the 3:1 non-text contrast guideline; segment labels choose dark or white text automatically.
- Chart descriptions (and therefore the narration) are generated from the current data, so they stay correct after any filter change; hidden charts are skipped.
- Narration uses `en-AU`; active navigation link is marked with `aria-current`.

### Fixes
- Q2 note now matches the yellow/dark-green colours.
- “National average” replaced by accurate labels: **All states & territories** (Q4) and **All areas** (Q5, calculated from the remoteness data, 151.4 per 100,000 in 2021).
- Added `.gitattributes` to normalise line endings (stops whole-file CRLF diffs).

## Iteration 2 — chart upgrades, mobile layout, accessibility

### Q1 annual trend

- Added a **Filter by Year / Period** selector for all years (2011–2021), 2011–2016, 2017–2021, and each individual year.
- Added a live KPI: a single year shows its annual total and year-over-year percentage change (unavailable for 2011); a range shows its total and the percentage change between its first and last annual observations.
- Animated the chart scales, line, points, and reporting-change annotations when the selection changes.
- Added a Deep Spruce / Clay Pink / Taxi Yellow area gradient, an interactive crosshair, and a toggleable trailing three-year moving-average line.

### Q2–Q5 visualizations

- Q2 can sort road users by absolute or percentage change while independently switching the displayed measure between number of people and share of hospitalisations. Bars animate into their updated positions.
- Q3 supports counterparty highlighting and selection of a road-user bar to reveal the underlying counterparty counts and shares.
- The Q4 jurisdiction chart and Q5 remoteness chart compare counts with rates per 100,000. Their rate views show a population-weighted national-average line; the same benchmark is included in their accessible tables.

### Responsive and touch behavior

- Added tablet navigation/layout rules and a swipeable sticky navigation row and horizontally scrollable, native-width charts below 600px.
- Kept chart text at its intended SVG size on narrow screens rather than shrinking a wide chart to fit.
- Added touch-pinnable tooltips that are clamped to the viewport and dismiss when the user taps elsewhere.
- Added a full-row touch target for Q3 road-user selection on small screens and set buttons, toggles, legends, and filter controls to a minimum 44px target size.

### Accessibility

- Added a “Skip to main content” link, labeled chart groups, and a shared polite status region for filter, toggle, detail-panel, and narration announcements.
- Added a visually hidden semantic HTML data table to each of the six chart containers. Tables include captions, column headers, row headers, and update with relevant filter/sort state.
- Added roving focus and arrow-key navigation between chart marks. Q3 road-user row targets also support Enter and Space.
- Added a labeled listen/pause/resume/stop narration group to each question card using the Web Speech API. Unsupported browsers disable narration controls; speech errors are announced and logged.
- Positioned hidden tables so their intrinsic width does not introduce horizontal page overflow on mobile.

### Files updated

- `README.md` — project overview, local run instructions, feature summary, structure, and data sources.
- `index.html` — Q1 controls, skip link, main-content target, live region, and chart/question-card structure.
- `css/style.css` — palette-preserving chart/control styles, 44px touch targets, hidden-content and focus styling, tooltips, and responsive rules.
- `js/common.js` — shared SVG, accessible-table, arrow-navigation, tooltip, toggle-announcement, narration, and switchable-chart helpers.
- `js/q1_trend.js` — annual filter/KPI, animated trend updates, area gradient, crosshair, moving average, table, and announcements.
- `js/q2_road_users.js` — sort and measure controls, animated bars, keyboard navigation, and sorted data table.
- `js/q3_counterparty.js` — counterparty highlighting, detailed breakdown, accessible row targets, table, and announcements.
- `js/q4_jurisdictions.js` — national-average rate reference and accessible data-table configuration.
- `js/q5_age_remoteness.js` — age and remoteness tables, keyboard navigation, and national-average rate reference.
- `FEATURES.md` — feature descriptions and manual verification guide.

# Features and verification guide

This guide describes the chart interactions, responsive behaviour and accessibility support, and how to check them manually.

## Data and chart scope

Q1 uses annual totals for 2011–2021. Q2 compares two years (2017 and 2021 until `q2_road_users_by_year.csv` is exported). Q3 shows 2017–2021 combined (single years once `q3_counterparty_by_year.csv` is exported). Q4 and Q5 show 2021 (other years once their by-year files are exported). See README → *Enabling the full year filters*.

## Chart features

### Q1 — annual trend
Choose **All Years**, **2011–2016**, **2017–2021** or a single year. The summary shows the total and the percentage change. The chart animates; a crosshair follows the pointer; **Show 3-year moving average** adds a trailing average. Dashed lines mark the VIC 2012 and NSW 2017 counting changes; the 2020 dip note says it *coincides* with COVID-19 restrictions.

### Q2 — road users
- **Compare [year] with [year]** (appears when more than two years are available; with the current file it offers 2017 and 2021).
- **View:** *Change* (diverging bars: yellow = more people, dark green = fewer) or *Before & after* (dumbbell: hollow circle = first year, filled = second).
- **Measure:** number of people or share of all hospitalisations. **Sort by:** absolute or % change.
- A caution note appears when the two years cross a reporting change.

### Q3 — counterparties
- **View:** *Flow diagram* (Sankey; flow width = hospitalisations) or *Share bars* (100% stacked).
- Legend buttons highlight one counterparty in either view; select again to clear.
- Select a road user (its block on the left of the flow diagram, or any of its bar segments; Enter/Space on the keyboard) to open the detailed breakdown; **Close** dismisses it.
- **Period** selector appears when `q3_counterparty_by_year.csv` is listed in the manifest.

### Q4 — jurisdictions
A **map of Australia** and **ranked bars** are shown together. In *Number of people* the map shows circles sized by count; in *Per 100,000 people* it shades each state by rate (darker = higher). Hover or focus a state in either view and it is outlined in both; bars re-sort when the measure changes. NSW is hatched (and marked NSW*) because of its 2017 counting change; the ACT is labelled offshore with a leader line. In rate view a dashed line on the bars shows the rate across all eight states and territories. **Year** selector appears with the by-year file.

### Q5 — age and remoteness
- **Age:** *Per year of age* shows a variable-width histogram (width = age range, height = average per year of age, area = people); *Total per age group* shows equal-width bars. The open-ended 75+ group is hatched and drawn as 75–89 for display only.
- **Remoteness:** an isotype pictogram. The key states what one figure represents (e.g. 500 people, or 5 people per 100,000 residents); the unit is chosen so the rows fill the chart width. Partial figures show remainders. In *Per 100,000 people* a dashed line shows the rate across all areas. Each row is focusable and has a tooltip.
- **Year** selector appears when both Q5 by-year files are listed.

## Responsive and touch behaviour
- Each chart is drawn at the actual width of its card and redrawn when the width changes (`DV.responsive`). Pages never scroll sideways.
- Under 560px chart width, charts switch to a phone layout: labels above bars, fewer and compact ticks (e.g. 13.0k), angled age labels, Sankey labels above/beside nodes with a white halo.
- Under 768px, the hero, cards and Q4 views stack vertically.
- Buttons, toggles, legend pills and selects are at least 44px high. On touch screens, tap a mark to pin its tooltip; tap elsewhere to dismiss it.

## Accessibility and how to test it

### Automated check
Run axe DevTools (or Lighthouse → Accessibility) on desktop and at 390px width: expect **no violations**.

### Skip link and landmarks
Press **Tab** on load: **Skip to main content** is first. Landmarks: section navigation (active link has `aria-current`), main, labelled chart groups, polite status region.

### Screen-reader chart tables
Every chart has a visually hidden table (caption, column and row headers) that follows the current filters and sort. Q4 and Q5 tables include the reference row.

### Keyboard chart navigation
Tab to a chart mark (one per chart is in the Tab order), then use the arrow keys to move to the nearest mark; Tab leaves the chart. Each mark has `role="img"` and a full text label. In Q3, Enter/Space on a road user opens its breakdown.

### Audio narration
**Listen to Summary** reads the section heading, the description of each visible chart (generated from the data currently shown), the Q1 summary and the notes. Activate again to pause/resume; **Stop** ends it. Unsupported browsers show the button as unavailable.

### Mobile checks
At 390px and 599px: no horizontal page scroll, all chart labels readable without zooming, tooltips stay on screen and close with an outside tap.

## Implementation map

| File | Feature areas |
| --- | --- |
| `index.html` | Guide-sign hero, chapter markers and key findings, filters and toggles, Q4 paired views, closing section, live region |
| `css/style.css` | Palette tokens (incl. `--accent-strong`), focus and contrast styles, chart styles, breakpoints (768px, 599px) |
| `js/common.js` | Responsive drawing, SVG/table helpers, arrow-key focus, tooltips, toggles and selects, optional-data loading via `data/manifest.json`, reporting-change notes, narration, linked highlighting, switchable bar chart |
| `js/q1_trend.js` | Period filter, KPI, area, crosshair, moving average, annotations |
| `js/q2_road_users.js` | Year comparison, diverging and dumbbell views, measure and sort controls |
| `js/q3_counterparty.js` | Sankey and share-bar views, legend highlighting, breakdown panel, period filter |
| `js/q4_jurisdictions.js` | Australia map (circles and choropleth), ranked bars, linked highlighting, year filter, all-states reference |
| `js/q5_age_remoteness.js` | Variable-width age histogram, isotype remoteness chart, year filter, all-areas reference |

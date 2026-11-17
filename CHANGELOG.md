# Changelog

This changelog records the interactive, responsive, and accessibility features now present in the data story.

## Unreleased

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

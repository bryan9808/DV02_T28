# Features and verification guide

This guide describes the current chart interactions, responsive behavior, accessibility support, and how to verify them manually.

## Data and chart scope

The Q1 trend uses annual observations from 2011 through 2021. Q2 compares 2017 with 2021; Q3 aggregates counterparty data over 2017–2021; Q4 and the Q5 age/remoteness charts are 2021 views. Do not interpret the Q2–Q5 views as annual time series.

## Chart features

### Q1 — annual trend

In the **Filter by Year / Period** selector, choose:

- **All Years (2011–2021)**
- **2011–2016** or **2017–2021**
- An individual year from 2011 to 2021

The KPI updates with the selected annual total and year-over-year percentage change. For a selected range, it shows the sum of annual observations and the percentage difference between the range’s first and last years. 2011 has no earlier year for a year-over-year comparison.

The chart animates its axes, line, points, and reporting-change annotations. Move a pointer over the plot to show the crosshair and nearest year’s value. Check **Show 3-year moving average** to display the trailing average; the first two years do not have a three-year value.

### Q2 — road users

Use the measure buttons to switch between the change in number of people and the change in share of hospitalisations (percentage points). Separately choose **Absolute Change** or **% Change** in the sort control. The bars, values, and accessible table follow the selected measure and ranking.

### Q3 — counterparties

The 100% stacked bars show counterparty shares for motorcyclists, pedal cyclists, and pedestrians. Select a counterparty legend button to highlight that group, then select it again to restore all groups. Select a stacked segment—or, on a small touch screen, its full road-user row—to open the detailed count/share breakdown. Use **Close** to dismiss the breakdown.

### Q4 — jurisdictions and Q5 — age/remoteness

Q4 switches between 2021 counts and rates per 100,000 by state or territory. Q5 includes 2021 counts by age group and a switchable count/rate chart by remoteness. The national-average rate line appears in the rate views; the accessible tables also identify the reference value.

## Responsive and touch behavior

- At widths up to 768px, navigation and page layout adapt for tablets.
- At widths up to 599px, the sticky navigation scrolls horizontally; charts scroll horizontally at their native SVG width to preserve text legibility.
- Buttons, toggles, legend pills, filter controls, and Q3 touch rows have 44px-or-larger targets.
- On touch screens, tap a data mark to pin its tooltip; tap elsewhere to dismiss it. Tooltip positioning is clamped to the viewport edges.

## Accessibility and how to test it

### Skip link and landmarks

1. Reload the page and press **Tab** before interacting with the navigation.
2. Confirm **Skip to main content** is the first focusable control; press **Enter** and confirm focus/navigation moves to the main content.
3. Use a screen reader’s landmarks/regions list to locate the labeled section navigation, main content, chart groups, and shared status region.

### Screen-reader chart tables

There are six charts: Q1, Q2, Q3, Q4, Q5 age, and Q5 remoteness. Each chart container includes a visually hidden HTML table with a caption, column headers, and row headers.

1. Use a screen reader’s table navigation to find each chart’s table and move through its rows and columns.
2. Change Q1’s year/period and verify the table contains only the active year/range.
3. Change Q2’s sort and measure and verify the table order/data follows the chart.
4. Confirm Q4 and Q5 remoteness tables include a national-average reference row.

### Keyboard chart navigation

1. Tab to a chart mark. One mark per keyboard-navigation set is in the Tab order; each SVG is labeled as a group and describes the arrow-key help.
2. Press **Arrow Up**, **Arrow Down**, **Arrow Left**, or **Arrow Right** to move focus to the nearest mark in that direction. Press **Tab** to leave the chart.
3. In Q3, use the keyboard-accessible road-user row target and press **Enter** or **Space** to open its breakdown; use the close button to dismiss it.
4. Focus Q1’s filter and moving-average checkbox and the Q2/Q4/Q5 toggles with **Tab** and operate them with the standard select/checkbox/button keys. Verify the shared polite status region announces the changes.

### Audio narration

Each question card has a labeled narration control group. Narration combines the card heading, chart descriptions, available Q1 KPI, and explanatory notes into a concise spoken summary.

1. Activate **Listen to Summary**. The button changes to **Pause Summary**.
2. Activate it again to pause; the label changes to **Resume Summary**. Activate again to resume.
3. Activate **Stop** and confirm the control returns to **Listen to Summary**.
4. Confirm the polite status region reports narration start, pause/resume, stop, completion, or an error. On a browser without `window.speechSynthesis` / `SpeechSynthesisUtterance`, narration is disabled with an accessible unavailable label.

### Mobile checks

1. Use browser responsive tools at 390px and 599px viewport widths.
2. Confirm the page itself does not scroll horizontally; use the chart’s own horizontal scroller to inspect the full-size SVG.
3. Swipe the navbar and charts horizontally. Tap marks near the viewport edges and verify tooltips remain visible and can be dismissed with an outside tap.
4. Confirm controls remain at least 44px high and Q3’s full-row touch targets open the correct details.

## Implementation map

| File | Feature areas |
| --- | --- |
| `index.html` | Q1 filter and moving-average controls; skip link and main target; question cards; shared polite status region; chart containers. |
| `css/style.css` | Deep Spruce / Clay Pink / Taxi Yellow tokens; visually hidden content and focus indication; narration controls; touch targets; tooltip, navigation, and mobile chart behavior. Breakpoints: 768px and 599px. |
| `js/common.js` | Labeled SVG groups; semantic data tables; arrow-key roving focus; viewport-clamped/touch-pinnable tooltips; toggle announcements; Web Speech narration; shared national-rate chart helper. |
| `js/q1_trend.js` | Year/period selection, KPI, transitions, gradient area, crosshair, moving average, filtered table, and live announcements. |
| `js/q2_road_users.js` | Independent measure and sort controls, animated bars, keyboard access, and dynamically sorted table. |
| `js/q3_counterparty.js` | Stacked data table, keyboard-accessible segments and row targets, legend highlighting, detailed breakdown, and announcements. |
| `js/q4_jurisdictions.js` | State/territory count-rate chart, national-average rate, and table configuration. |
| `js/q5_age_remoteness.js` | Age chart table and keyboard access; remoteness count-rate chart and national-average reference. |

## Running the page

Serve the repository over HTTP rather than opening `index.html` directly, because the browser must fetch the CSV files. The [README](./README.md) includes the VS Code Live Server steps. The project currently uses manual browser checks rather than a configured automated test runner.

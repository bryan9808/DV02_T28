// Q4 – Where: States and Territories, counts vs rates per 100,000
// Data: data/q4_jurisdictions_by_year.csv (year, state, hospitalisations, population) if exported,
//       otherwise data/q4_jurisdictions.csv (2021 only); map: data/australia_states.json.
// Two coordinated views:
//   - a map of Australia: proportional circles for the number of people (circle area = count),
//     shading for the rate per 100,000 (a choropleth is only appropriate for rates, not raw counts);
//   - ranked bars with exact values.
// Hovering or focusing a state in one view highlights it in the other.

(function () {
  const names = {
    NSW: "New South Wales", Vic: "Victoria", Qld: "Queensland", WA: "Western Australia",
    SA: "South Australia", Tas: "Tasmania", ACT: "Australian Capital Territory", NT: "Northern Territory"
  };
  // Label anchors [longitude, latitude] chosen so labels sit inside each state. The ACT is too small
  // to label inside, so its label sits offshore with a leader line to its centre.
  const anchors = {
    WA: [121.5, -25.5], NT: [133.4, -19.8], Qld: [144.5, -22.8], SA: [135.2, -30.2],
    NSW: [146.6, -32.4], Vic: [144.0, -37.0], Tas: [146.6, -42.1], ACT: [149.0, -35.45]
  };
  const actLabel = [153.6, -37.4];
  const state = { measure: "count", year: 2021 };
  const caveat = document.getElementById("q4-caveat");

  Promise.all([
    DV.loadOptional("data/q4_jurisdictions_by_year.csv", d => ({
      year: +d.year, state: d.state, count: +d.hospitalisations, pop: +d.population
    }), ["year", "state", "hospitalisations", "population"]),
    d3.csv("data/q4_jurisdictions.csv", d => ({
      year: 2021, state: d.state, count: +d.hospitalisations, pop: +d.population
    })),
    d3.json("data/australia_states.json")
  ]).then(([byYear, single, geo]) => {
    const all = (byYear && byYear.length ? byYear : single).map(d => ({ ...d, rate: d.count / d.pop * 100000 }));
    const years = [...new Set(all.map(d => d.year))].sort(d3.ascending);
    state.year = String(years[years.length - 1]);   // the selected period: a year, "2017-2021" or "all"
    const label = () => DV.periodLabel(state.year, years);
    const multi = () => DV.periodYears(state.year, years).length > 1;
    // One row per state for the selected period. For several years, counts are summed and populations
    // are summed as person-years, so rate = average yearly hospitalisations per 100,000 people.
    const rowsFor = period => {
      const span = DV.periodYears(period, years);
      return d3.flatRollup(all.filter(d => span.includes(d.year)),
        v => ({ count: d3.sum(v, d => d.count), pop: d3.sum(v, d => d.pop) }), d => d.state)
        .map(([st, v]) => ({
          state: st, count: v.count, pop: v.pop, avgPop: v.pop / span.length,
          rate: v.count / v.pop * 100000, year: DV.periodLabel(period, years), nYears: span.length
        }));
    };
    // Population-weighted rate across all eight states and territories (not the national total,
    // because about 1% of national cases have no state recorded).
    const reference = year => ({ measureKey: "rate", value: DV.weightedRate(rowsFor(year), "count", "pop"), label: "All states & territories" });

    const measures = {
      count: { key: "count", format: DV.fmtInt, axisFormat: DV.fmtInt, compactFormat: DV.fmtCompact,
        get label() { return multi() ? `Hospitalisations, ${label()} (total)` : `Hospitalisations, ${label()}`; } },
      rate: { key: "rate", format: v => d3.format(".0f")(v), axisFormat: d3.format(".0f"),
        get label() { return multi() ? `Per 100,000 people per year, ${label()} (average)` : `Hospitalisations per 100,000 people, ${label()}`; } }
    };
    const tooltipHtml = d => `<strong>${names[d.state]}</strong><br>${DV.fmtInt(d.count)} hospitalisations in ${d.year}${d.nYears > 1 ? " (total)" : ""}<br>Population: ${DV.fmtInt(Math.round(d.avgPop))}${d.nYears > 1 ? " (yearly average)" : ""}<br>Rate: ${DV.fmt1(d.rate)} per 100,000${d.nYears > 1 ? " per year" : ""}${d.state === "NSW" ? '<br><span class="tip-muted">Since 2017, NSW does not count emergency-department-only cases</span>' : ""}`;
    const tooltipText = d => `${names[d.state]}: ${DV.fmtInt(d.count)} hospitalisations, ${DV.fmt1(d.rate)} per 100,000 people, ${d.year}`;

    function describe(rows, key) {
      const sorted = [...rows].sort((a, b) => d3.descending(a[key], b[key]));
      const fmt = key === "rate" ? (v => `${d3.format(".0f")(v)} per 100,000`) : DV.fmtInt;
      return `${label()}, ${key === "rate" ? "rate per 100,000 people" : "number of hospitalisations"} by state and territory: ` +
        `${names[sorted[0].state]} is highest (${fmt(sorted[0][key])}) and ${names[sorted[sorted.length - 1].state]} is lowest (${fmt(sorted[sorted.length - 1][key])}).`;
    }

    // Ranked bars (shared helper). The measure toggle below drives both views.
    const bars = DV.switchableBarChart({
      selector: "#q4", data: rowsFor(state.year), nameKey: "state", initial: state.measure,
      height: 400, leftMargin: 70,
      tableCaption: () => `${label()} hospitalisations by state and territory, with the all-states rate reference`,
      tableColumns: [
        { label: "State or territory", value: d => names[d.state] || d.state },
        { label: "Hospitalisations", value: d => d.count === undefined ? "" : DV.fmtInt(d.count) },
        { label: "Population (yearly average for a period)", value: d => d.avgPop === undefined ? "" : DV.fmtInt(Math.round(d.avgPop)) },
        { label: "Rate per 100,000 people per year", value: d => DV.fmt1(d.rate) }
      ],
      referenceLine: reference(state.year),
      ariaLabel: (rows, key) => `Ranked bar chart. ${describe(rows, key)}`,
      nameLabel: s => s === "NSW" ? "NSW*" : s,
      highlight: d => d.state === "NSW",
      measures, tooltipHtml, tooltipText
    });

    // ---------- Map ----------
    let map = null;
    function buildMap(width, narrow) {
      const height = Math.round(width * (narrow ? 0.92 : 0.84));
      const { svg, g } = DV.createSvg("#q4-map", width, height, { top: 0, right: 0, bottom: 0, left: 0 }, "");
      const pad = narrow ? 6 : 12;
      // Leave room on the right for the offshore ACT label and at the bottom-left for the legend.
      const projection = d3.geoMercator().fitExtent([[pad, pad], [width - (narrow ? 44 : 64), height - pad - 8]], geo);
      const path = d3.geoPath(projection);

      // Diagonal hatching marks the NSW reporting caveat without relying on colour alone.
      const defs = svg.append("defs");
      defs.append("pattern").attr("id", "q4-hatch").attr("patternUnits", "userSpaceOnUse")
        .attr("width", 7).attr("height", 7).attr("patternTransform", "rotate(45)")
        .append("line").attr("x1", 0).attr("y1", 0).attr("x2", 0).attr("y2", 7)
        .attr("stroke", "#102420").attr("stroke-opacity", 0.35).attr("stroke-width", 2);
      const ramp = defs.append("linearGradient").attr("id", "q4-ramp");
      const low = "#F3DDD6";
      const high = "#1B3B36";
      ramp.append("stop").attr("offset", "0%").attr("stop-color", low);
      ramp.append("stop").attr("offset", "100%").attr("stop-color", high);
      const colour = d3.scaleLinear().range([low, high]).interpolate(d3.interpolateLab);
      const neutral = "#E3ECEA";

      const statesG = g.append("g");
      const bubblesG = g.append("g");
      const labelsG = g.append("g");
      const legendG = g.append("g").attr("transform", `translate(${pad + 4},${height - (narrow ? 64 : 74)})`);

      const features = geo.features;
      const statePaths = statesG.selectAll(".state").data(features, f => f.properties.code)
        .join("path").attr("class", "state").attr("d", path).attr("data-key", f => f.properties.code);
      statesG.selectAll(".state-caveat-overlay").data(features.filter(f => f.properties.code === "NSW"))
        .join("path").attr("class", "state-caveat-overlay").attr("d", path).attr("fill", "url(#q4-hatch)");

      // ACT leader line from the territory to its offshore label.
      const actPoint = projection(anchors.ACT);
      const actLabelPoint = projection(actLabel);
      labelsG.append("line").attr("class", "leader")
        .attr("x1", actPoint[0]).attr("y1", actPoint[1])
        .attr("x2", actLabelPoint[0] - 4).attr("y2", actLabelPoint[1] - 10);

      function update(animate) {
        const t = animate ? DV.duration : 0;
        const rows = rowsFor(state.year);
        const byState = new Map(rows.map(d => [d.state, d]));
        const isRate = state.measure === "rate";
        const m = measures[state.measure];
        colour.domain(d3.extent(rows, d => d.rate));
        const radius = d3.scaleSqrt().domain([0, d3.max(rows, d => d.count)]).range([0, narrow ? 30 : 46]);
        const fillOf = code => isRate ? colour(byState.get(code).rate) : neutral;

        svg.attr("aria-label", `Map of Australia. ${describe(rows, m.key)}`);

        // State shapes are the focusable marks (tooltips, arrow keys, linked highlighting).
        statePaths.datum(function () { return byState.get(this.getAttribute("data-key")); });
        DV.addTooltip(statePaths, tooltipHtml, tooltipText);
        DV.enableArrowNavigation(statePaths);
        statePaths.transition().duration(t).attr("fill", d => fillOf(d.state));

        // Circles (count view only): area proportional to the number of people.
        bubblesG.selectAll(".state-bubble").data(rows, d => d.state)
          .join(enter => enter.append("circle").attr("class", "state-bubble").attr("r", 0)
            .attr("cx", d => projection(anchors[d.state])[0]).attr("cy", d => projection(anchors[d.state])[1]))
          .attr("data-key", d => d.state)
          .transition().duration(t)
          .attr("r", d => isRate ? 0 : radius(d.count));

        // Labels: state code and value. Dark text with a white halo on light fills, white on dark fills.
        const labelPos = d => d.state === "ACT" ? actLabelPoint : projection(anchors[d.state]);
        const labelColour = d => d.state === "ACT" ? "#102420" : (isRate ? DV.textOn(fillOf(d.state)) : "#102420");
        const labels = labelsG.selectAll(".state-text").data(rows, d => d.state)
          .join(enter => {
            const group = enter.append("g").attr("class", "state-text");
            group.append("text").attr("class", "state-label").attr("text-anchor", "middle");
            group.append("text").attr("class", "state-value").attr("text-anchor", "middle").attr("dy", "1.2em");
            return group;
          })
          .attr("transform", d => `translate(${labelPos(d)[0]},${labelPos(d)[1] - 4})`);
        labels.select(".state-label").text(d => d.state === "NSW" ? "NSW*" : d.state)
          .classed("halo", d => labelColour(d) !== "#ffffff")
          .transition().duration(t).attr("fill", labelColour);
        labels.select(".state-value").text(d => narrow ? (m.compactFormat || m.format)(d[m.key]) : m.format(d[m.key]))
          .classed("halo", d => labelColour(d) !== "#ffffff")
          .transition().duration(t).attr("fill", labelColour);

        // Legend: colour ramp for rates, nested circles for counts.
        legendG.selectAll("*").remove();
        if (isRate) {
          const legendW = narrow ? 110 : 150;
          const extent = d3.extent(rows, d => d.rate);
          legendG.append("text").attr("class", "legend-text").attr("y", 14).text("Rate per 100,000");
          legendG.append("rect").attr("y", 22).attr("width", legendW).attr("height", 10).attr("fill", "url(#q4-ramp)");
          legendG.append("text").attr("class", "legend-text").attr("y", 48).text(d3.format(".0f")(extent[0]));
          legendG.append("text").attr("class", "legend-text").attr("x", legendW).attr("y", 48).attr("text-anchor", "end").text(d3.format(".0f")(extent[1]));
        } else {
          // Size key: two filled circles that match the map circles, each with a leader line to its value.
          const max = d3.max(rows, d => d.count);
          // Two round values for the key, e.g. 10,000 and 1,000 for one year, 100,000 and 10,000 for all years.
          const bigStep = Math.pow(10, Math.floor(Math.log10(max)));
          const steps = [bigStep, bigStep / 10];
          const big = radius(steps[0]);
          const base = 62;             // shared bottom of the nested circles
          const lineEnd = big * 2 + 14; // where the leader lines end and labels start
          legendG.append("text").attr("class", "legend-text legend-title").attr("y", base - big * 2 - 10)
            .text("Circle size = people hospitalised");
          steps.forEach(v => {
            const r = radius(v);
            const top = base - r * 2;
            legendG.append("circle").attr("class", "legend-bubble").attr("cx", big).attr("cy", base - r).attr("r", r);
            legendG.append("line").attr("class", "legend-leader")
              .attr("x1", big).attr("x2", lineEnd).attr("y1", top).attr("y2", top);
            legendG.append("text").attr("class", "legend-text").attr("x", lineEnd + 4).attr("y", top).attr("dy", "0.35em")
              .text(DV.fmtInt(v));
          });
        }
      }
      return { update };
    }
    DV.responsive("#q4-map", (width, narrow) => { map = buildMap(width, narrow); map.update(false); });
    DV.linkHighlights("#q4-section");

    function updateCaveat() {
      caveat.textContent = DV.reportingCaveat(DV.periodYears(state.year, years)) ||
        "Rates use ABS population estimates for the same year.";
    }

    DV.setupToggle("#q4-toggle", key => {
      state.measure = key;
      bars.setMeasure(key);
      if (map) map.update(true);
    });
    DV.setupSelect("q4-year", DV.periodOptions(years), state.year, value => {
      state.year = value;
      bars.setData(rowsFor(state.year), reference(state.year));
      if (map) map.update(true);
      updateCaveat();
      DV.announce(`Q4 period: ${label()}.`);
    });
    updateCaveat();
  });
})();

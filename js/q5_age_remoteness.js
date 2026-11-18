// Q5 – Who is most at risk: age and remoteness of residence
// Data: data/q5_age_by_year.csv (year, age_group, hospitalisations, age_order) and
//       data/q5_remoteness_by_year.csv (year, remoteness, hospitalisations, population) if exported,
//       otherwise data/q5_age.csv and data/q5_remoteness.csv (2021 only).
//
// Part A – age: a variable-width histogram. The age groups cover different numbers of years, so each bar
//   is as wide as its age range and its height is the average per year of age (area = number of people).
//   A toggle switches to equal-width bars of the group totals for comparison.
// Part B – remoteness: an isotype (pictogram) chart. One figure = 1,000 people hospitalised, or
//   10 people per 100,000 residents in the rate view, so the reversal between counts and rates is visible.

(function () {
  // Age ranges [start, end) in years. 75+ is open-ended: drawn as 75–89 for display only.
  const bands = {
    "0-7": [0, 8], "8-16": [8, 17], "17-25": [17, 26], "26-39": [26, 40],
    "40-64": [40, 65], "65-74": [65, 75], "75+": [75, 90]
  };
  const areaOrder = ["Major Cities", "Regional", "Remote"];
  const state = { year: 2021, ageView: "density", remoteMeasure: "count" };

  Promise.all([
    // Rows with an age group the chart does not draw (e.g. "Unknown") are skipped.
    DV.loadOptional("data/q5_age_by_year.csv", d => bands[d.age_group]
      ? ({ year: +d.year, age: d.age_group, count: +d.hospitalisations, order: +d.age_order })
      : null,
      ["year", "age_group", "hospitalisations", "age_order"]),
    DV.loadOptional("data/q5_remoteness_by_year.csv", d => ({ year: +d.year, area: d.remoteness, count: +d.hospitalisations, pop: +d.population }),
      ["year", "remoteness", "hospitalisations", "population"]),
    d3.csv("data/q5_age.csv", d => ({ year: 2021, age: d.age_group, count: +d.hospitalisations, order: +d.age_order })),
    d3.csv("data/q5_remoteness.csv", d => ({ year: 2021, area: d.remoteness, count: +d.hospitalisations, pop: +d.population }))
  ]).then(([ageByYear, remoteByYear, age2021, remote2021]) => {
    // Use the multi-year files only if both exist and share at least one year; otherwise use 2021 for both.
    const shared = ageByYear && remoteByYear &&
      ageByYear.some(a => remoteByYear.some(r => r.year === a.year));
    if ((ageByYear || remoteByYear) && !shared) {
      console.warn("Q5: the age and remoteness by-year files must both be listed in data/manifest.json and cover the same years. Showing 2021.");
    }
    const ages = (shared ? ageByYear : age2021).filter(d => bands[d.age]).map(d => {
      const [start, end] = bands[d.age];
      return { ...d, start, end, years: end - start, open: d.age === "75+", density: d.count / (end - start) };
    });
    const areas = (shared ? remoteByYear : remote2021)
      .map(d => ({ ...d, rate: d.count / d.pop * 100000 }));
    // The year filter offers only years present in both files, so both charts always show the same year.
    const ageYears = new Set(ages.map(d => d.year));
    const years = [...new Set(areas.map(d => d.year))].filter(y => ageYears.has(y)).sort(d3.ascending);
    state.year = String(years[years.length - 1]);   // the selected period: a year, "2017-2021" or "all"
    const label = () => DV.periodLabel(state.year, years);
    const span = () => DV.periodYears(state.year, years);
    // For a period, counts are summed; for remoteness, populations are summed as person-years so the
    // rate is the average yearly hospitalisations per 100,000 residents.
    const ageRows = () => d3.flatRollup(ages.filter(d => span().includes(d.year)),
      v => ({ ...v[0], count: d3.sum(v, d => d.count) }), d => d.age)
      .map(([, d]) => ({ ...d, year: label(), nYears: span().length, density: d.count / d.years }))
      .sort((a, b) => a.order - b.order);
    const areaRows = () => d3.flatRollup(areas.filter(d => span().includes(d.year)),
      v => ({ count: d3.sum(v, d => d.count), pop: d3.sum(v, d => d.pop) }), d => d.area)
      .map(([area, v]) => ({
        area, count: v.count, pop: v.pop, avgPop: v.pop / span().length,
        rate: v.count / v.pop * 100000, year: label(), nYears: span().length
      }))
      .sort((a, b) => areaOrder.indexOf(a.area) - areaOrder.indexOf(b.area));
    const allAreasRate = () => DV.weightedRate(areaRows(), "count", "pop");

    // ---------- Part A: age ----------
    let ageChart = null;
    function buildAge(width, narrow) {
      const height = narrow ? 320 : 400;
      const margin = narrow ? { top: 28, right: 10, bottom: 58, left: 46 } : { top: 28, right: 20, bottom: 58, left: 70 };
      const { svg, g, innerW, innerH } = DV.createSvg("#q5-age", width, height, margin, "");
      // Light hatching for the open-ended 75+ group, whose width is an assumption.
      svg.append("defs").append("pattern").attr("id", "q5-open-pattern").attr("patternUnits", "userSpaceOnUse")
        .attr("width", 8).attr("height", 8).attr("patternTransform", "rotate(45)")
        .call(p => p.append("rect").attr("width", 8).attr("height", 8).attr("fill", "#1B3B36"))
        .call(p => p.append("line").attr("x1", 0).attr("y1", 0).attr("x2", 0).attr("y2", 8)
          .attr("stroke", "#5E7E78").attr("stroke-width", 3));
      const xLin = d3.scaleLinear().domain([0, 90]).range([0, innerW]);
      const xBand = d3.scaleBand().range([0, innerW]).padding(narrow ? 0.18 : 0.25);
      const y = d3.scaleLinear().range([innerH, 0]);
      const gridG = g.append("g").attr("class", "grid");
      const xAxisG = g.append("g").attr("class", "axis").attr("transform", `translate(0,${innerH})`);
      const yAxisG = g.append("g").attr("class", "axis");
      const xLabel = g.append("text").attr("class", "axis-label").attr("x", innerW / 2).attr("y", innerH + 46).attr("text-anchor", "middle");
      const yLabel = g.append("text").attr("class", "axis-label").attr("x", 0).attr("y", -12);

      function update(animate) {
        const t = animate ? DV.duration : 0;
        const data = ageRows();
        const density = state.ageView === "density";
        const key = density ? "density" : "count";
        xBand.domain(data.map(d => d.age));
        y.domain([0, d3.max(data, d => d[key])]).nice();
        const top = d3.greatest(data.filter(d => !d.open || !density), d => d[key]);
        svg.attr("aria-label", density
          ? `Histogram of ${label()} road crash hospitalisations by age, adjusted for the width of each age group. Ages ${top.age} have the most per year of age (about ${d3.format(",.0f")(top.density)} per year of age).`
          : `Bar chart of ${label()} road crash hospitalisations by age group. Ages ${top.age} have the most (${DV.fmtInt(top.count)}).`);

        gridG.transition().duration(t).call(d3.axisLeft(y).ticks(5).tickSize(-innerW).tickFormat(""));
        yAxisG.transition().duration(t).call(d3.axisLeft(y).ticks(5).tickFormat(narrow ? DV.fmtCompact : DV.fmtInt));
        yLabel.text(density ? "Average per year of age" : "Hospitalisations");
        if (density) {
          xAxisG.transition().duration(t).call(d3.axisBottom(xLin).tickValues([0, 8, 17, 26, 40, 65, 75]).tickFormat(d3.format("d")));
          xLabel.text("Age (years); bar width = age range");
        } else {
          xAxisG.transition().duration(t).call(d3.axisBottom(xBand));
          xLabel.text("Age group (years)");
        }

        const barX = d => density ? xLin(d.start) : xBand(d.age);
        const barW = d => density ? Math.max(1, xLin(d.end) - xLin(d.start) - 1) : xBand.bandwidth();
        const bars = g.selectAll(".age-bar").data(data, d => d.age)
          .join(enter => enter.append("rect").attr("x", barX).attr("width", barW).attr("y", innerH).attr("height", 0))
          .attr("class", d => `age-bar bar${d.open && density ? " age-open" : ""}`);
        DV.addTooltip(bars,
          d => `<strong>Age ${d.age}</strong><br>${DV.fmtInt(d.count)} hospitalisations in ${d.year}${d.nYears > 1 ? " (total)" : ""}` +
            (d.open
              ? `<br><span class="tip-muted">Open-ended group, drawn as 15 years for display</span>`
              : `<br>About ${d3.format(",.0f")(d.density)} per year of age (${d.years}-year range)`),
          d => `Age ${d.age}: ${DV.fmtInt(d.count)} hospitalisations${d.open ? "" : `, about ${d3.format(",.0f")(d.density)} per year of age`}`);
        DV.enableArrowNavigation(bars);
        bars.transition().duration(t)
          .attr("x", barX).attr("width", barW)
          .attr("y", d => y(d[key])).attr("height", d => innerH - y(d[key]));

        // Value labels above bars. The open-ended 75+ group has no per-year value, so it is labelled as open-ended.
        g.selectAll(".value").data(data, d => d.age).join("text").attr("class", "value").attr("text-anchor", "middle")
          .transition().duration(t)
          .attr("x", d => barX(d) + barW(d) / 2).attr("y", d => y(d[key]) - 6)
          .text(d => {
            if (density && d.open) return narrow ? "75+*" : "75+ (open-ended)*";
            const v = d[key];
            return narrow ? DV.fmtCompact(Math.round(v)) : d3.format(",.0f")(v);
          });

        // In the histogram the axis shows age boundaries, so each bar also carries its group name.
        g.selectAll(".age-group-label").data(density ? data.filter(d => !d.open) : [], d => d.age)
          .join("text").attr("class", "age-group-label").attr("text-anchor", "middle")
          .attr("x", d => barX(d) + barW(d) / 2).attr("y", innerH - 8)
          .text(d => barW(d) >= 34 ? d.age.replace("-", "–") : "");

        DV.addDataTable("#q5-age", `${label()} hospitalisations by age group`, [
          { label: "Age group", key: "age" },
          { label: "Hospitalisations", value: d => DV.fmtInt(d.count) },
          { label: "Years in age group", value: d => d.open ? "Open-ended (75 and over)" : d.years },
          { label: "Average per year of age", value: d => d.open ? "Not calculated" : d3.format(",.0f")(d.density) }
        ], data);
      }
      return { update };
    }

    // ---------- Part B: remoteness isotype ----------
    let remoteChart = null;
    function buildRemote(width, narrow) {
      const rows = areaRows();
      const rowH = narrow ? 66 : 72;
      const margin = { top: 62, right: 8, bottom: 16, left: 4 };
      const height = rows.length * rowH + margin.top + margin.bottom;
      const { svg, g, innerW } = DV.createSvg("#q5-remote", width, height, margin, "");
      // One person figure, drawn in a 1 x 2 box: head and body.
      const symbol = svg.append("defs").append("symbol").attr("id", "q5-person").attr("viewBox", "0 0 1 2");
      symbol.append("circle").attr("cx", 0.5).attr("cy", 0.3).attr("r", 0.26);
      symbol.append("path").attr("d", "M0.12,0.72 Q0.12,0.62 0.24,0.62 H0.76 Q0.88,0.62 0.88,0.72 V1.3 H0.68 V1.98 H0.53 V1.36 H0.47 V1.98 H0.32 V1.3 H0.12 Z");
      const keyG = g.append("g").attr("transform", "translate(0,-54)");
      const rowsG = g.append("g");
      const refG = g.append("g");

      function update(animate) {
        const t = animate ? DV.duration : 0;
        const data = areaRows();
        const isRate = state.remoteMeasure === "rate";
        const valueOf = d => isRate ? d.rate : d.count;
        const maxValue = d3.max(data, d => valueOf(d));
        // Pick the smallest "1 figure = …" unit whose longest row still fits with figures at least 16px apart,
        // so the rows fill the panel instead of leaving empty space on the right.
        const units = isRate ? [2, 5, 10, 20, 50] : [250, 500, 1000, 2000, 5000];
        const unit = units.find(u => innerW / Math.ceil(maxValue / u) >= 16) || units[units.length - 1];
        const fw = Math.min(26, innerW / Math.ceil(maxValue / unit));   // horizontal step per figure
        const figW = Math.min(fw * 0.8, 18);                               // figure drawing width
        const fh = figW * 2;
        const highest = d3.greatest(data, valueOf);
        const lowest = d3.least(data, valueOf);
        svg.attr("aria-label", isRate
          ? `Pictogram of ${label()} hospitalisations per 100,000 residents by remoteness. Each figure is ${unit} people per 100,000. ${highest.area}: ${d3.format(".0f")(highest.rate)}; ${lowest.area}: ${d3.format(".0f")(lowest.rate)}.`
          : `Pictogram of ${label()} hospitalisations by remoteness. Each figure is ${DV.fmtInt(unit)} people. ${highest.area}: ${DV.fmtInt(highest.count)}; ${lowest.area}: ${DV.fmtInt(lowest.count)}.`);

        keyG.selectAll("*").remove();
        keyG.append("use").attr("href", "#q5-person").attr("width", 9).attr("height", 18).attr("class", "isotype-figure");
        keyG.append("text").attr("class", "legend-text").attr("x", 14).attr("y", 13)
          .text(isRate ? `= ${unit} people hospitalised per 100,000 residents` : `= ${DV.fmtInt(unit)} people hospitalised`);

        const groups = rowsG.selectAll(".isotype-row").data(data, d => d.area)
          .join(enter => {
            const row = enter.append("g").attr("class", "isotype-row");
            row.append("rect").attr("class", "isotype-focus").attr("rx", 6);
            row.append("text").attr("class", "bar-label").attr("y", 0);
            row.append("text").attr("class", "value isotype-value").attr("y", 0).attr("text-anchor", "end");
            row.append("g").attr("class", "figures");
            return row;
          })
          .attr("transform", (d, i) => `translate(0,${i * rowH})`)
          .attr("data-key", d => d.area);
        groups.select(".isotype-focus").attr("x", -4).attr("y", -16).attr("width", innerW + 8).attr("height", rowH - 6);
        groups.select(".bar-label").text(d => d.area);
        groups.select(".isotype-value").attr("x", innerW)
          .text(d => isRate ? `${d3.format(".0f")(d.rate)} per 100,000` : `${DV.fmtInt(d.count)} people`);

        groups.each(function (d, rowIndex) {
          const n = valueOf(d) / unit;
          const slots = d3.range(Math.ceil(n)).map(i => ({ i, fraction: Math.min(1, n - i) }));
          const figuresG = d3.select(this).select(".figures").attr("transform", "translate(0,8)").attr("aria-hidden", "true");
          figuresG.selectAll("*").remove();
          slots.forEach(slot => {
            const x = slot.i * fw;
            const delay = t ? slot.i * 8 + rowIndex * 60 : 0;
            if (slot.fraction < 1) {
              // Partial figure: a pale full figure, with a nested <svg> window showing only the
              // filled fraction of a dark figure on top (nested SVGs clip their content).
              figuresG.append("use").attr("href", "#q5-person").attr("class", "isotype-ghost")
                .attr("x", x).attr("width", figW).attr("height", fh);
              figuresG.append("svg").attr("x", x).attr("y", 0)
                .attr("width", Math.max(1, figW * slot.fraction)).attr("height", fh)
                .append("use").attr("href", "#q5-person").attr("class", "isotype-figure")
                .attr("width", figW).attr("height", fh)
                .style("opacity", t ? 0 : 1).transition().delay(delay).duration(t ? 200 : 0).style("opacity", 1);
            } else {
              figuresG.append("use").attr("href", "#q5-person").attr("class", "isotype-figure")
                .attr("x", x).attr("width", figW).attr("height", fh)
                .style("opacity", t ? 0 : 1).transition().delay(delay).duration(t ? 200 : 0).style("opacity", 1);
            }
          });
        });
        DV.addTooltip(groups,
          d => `<strong>${d.area}</strong><br>${DV.fmtInt(d.count)} hospitalisations in ${d.year}${d.nYears > 1 ? " (total)" : ""}<br>Population: ${DV.fmtInt(Math.round(d.avgPop))}${d.nYears > 1 ? " (yearly average)" : ""}<br>Rate: ${DV.fmt1(d.rate)} per 100,000${d.nYears > 1 ? " per year" : ""}`,
          d => `${d.area}: ${DV.fmtInt(d.count)} hospitalisations, ${DV.fmt1(d.rate)} per 100,000 residents, ${d.year}`);
        DV.enableArrowNavigation(groups);

        // Reference: the rate across all three areas, shown as a dashed line in the rate view.
        refG.selectAll("*").remove();
        if (isRate) {
          const refX = allAreasRate() / unit * fw;
          refG.append("line").attr("class", "reference-line")
            .attr("x1", refX).attr("x2", refX).attr("y1", -8).attr("y2", data.length * rowH - 10);
          refG.append("text").attr("class", "reference-label").attr("x", refX + 4).attr("y", data.length * rowH - 2)
            .text(`All areas: ${d3.format(".0f")(allAreasRate())}`);
        }

        DV.addDataTable("#q5-remote", `${label()} hospitalisations by remoteness of residence, with the all-areas rate`, [
          { label: "Remoteness area", key: "area" },
          { label: "Hospitalisations", value: d => d.count === undefined ? "" : DV.fmtInt(d.count) },
          { label: "Population (yearly average for a period)", value: d => d.avgPop === undefined ? "" : DV.fmtInt(Math.round(d.avgPop)) },
          { label: "Rate per 100,000 people per year", value: d => DV.fmt1(d.rate) }
        ], [...data, { area: "All areas (reference)", rate: allAreasRate() }]);
      }
      return { update };
    }

    const caveat = document.getElementById("q5-caveat");
    function updateCaveat() { if (caveat) caveat.textContent = DV.reportingCaveat(span()); }
    updateCaveat();
    DV.responsive("#q5-age", (width, narrow) => { ageChart = buildAge(width, narrow); ageChart.update(false); });
    DV.responsive("#q5-remote", (width, narrow) => { remoteChart = buildRemote(width, narrow); remoteChart.update(false); });

    DV.setupToggle("#q5-age-toggle", value => { state.ageView = value; if (ageChart) ageChart.update(true); });
    DV.setupToggle("#q5-toggle", value => { state.remoteMeasure = value; if (remoteChart) remoteChart.update(true); });
    DV.setupSelect("q5-year", DV.periodOptions(years), state.year, value => {
      state.year = value;
      if (ageChart) ageChart.update(true);
      if (remoteChart) remoteChart.update(true);
      updateCaveat();
      DV.announce(`Q5 period: ${label()}.`);
    });
  });
})();

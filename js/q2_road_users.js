// Q2 – Who is injured: change in hospitalisations by road user between two years.
// Data: data/q2_road_users_by_year.csv (year, road_user, hospitalisations) if exported from KNIME,
//       otherwise data/q2_road_users.csv (2017 and 2021 only).
// Views: diverging bars of the change, or a dumbbell chart of the "before" and "after" values.
// Controls: compare any two years, measure (people / share), sort (absolute / % change).

(function () {
  const state = { view: "change", measure: "abs", sort: "abs", yearA: 2017, yearB: 2021 };
  const caveat = document.getElementById("q2-caveat");

  Promise.all([
    DV.loadOptional("data/q2_road_users_by_year.csv", d => ({
      year: +d.year, road: d.road_user, count: +d.hospitalisations
    }), ["year", "road_user", "hospitalisations"]),
    d3.csv("data/q2_road_users.csv", d => d)
  ]).then(([byYear, wide]) => {
    // Long format: one row per year and road user. The 2017/2021 file is converted to the same shape.
    const long = byYear && byYear.length
      ? byYear
      : wide.flatMap(d => [
        { year: 2017, road: d.road_user, count: +d.count_2017 },
        { year: 2021, road: d.road_user, count: +d.count_2021 }
      ]);
    const years = [...new Set(long.map(d => d.year))].sort(d3.ascending);
    const roads = [...new Set(long.map(d => d.road))];
    if (!years.includes(state.yearA)) state.yearA = years[0];
    if (!years.includes(state.yearB)) state.yearB = years[years.length - 1];

    // Counts, shares and the three change measures for the selected pair of years.
    function compute() {
      const totalA = d3.sum(long.filter(d => d.year === state.yearA), d => d.count);
      const totalB = d3.sum(long.filter(d => d.year === state.yearB), d => d.count);
      const countOf = (road, year) => {
        const row = long.find(d => d.road === road && d.year === year);
        return row ? row.count : 0;
      };
      return roads.map(road => {
        const a = countOf(road, state.yearA);
        const b = countOf(road, state.yearB);
        const sa = a / totalA * 100;
        const sb = b / totalB * 100;
        return { road, a, b, sa, sb, abs: b - a, pct: a ? (b - a) / a * 100 : 0, pp: sb - sa };
      });
    }

    const fmtSigned = v => (v === 0 ? "0" : d3.format("+,")(v));
    const fmtPp = v => Math.abs(v) < 0.05 ? "0.0 pp" : `${d3.format("+.1f")(v)} pp`;
    const measures = {
      abs: { key: "abs", label: () => `Change in hospitalisations, ${state.yearB} compared with ${state.yearA}`, format: fmtSigned },
      pp: { key: "pp", label: () => "Change in share of all hospitalisations (percentage points)", format: fmtPp }
    };
    // In the dumbbell view the same toggle shows the raw values instead of their difference.
    const levels = {
      abs: { a: "a", b: "b", label: "Hospitalisations", format: DV.fmtInt, compact: DV.fmtCompact },
      pp: { a: "sa", b: "sb", label: "Share of all hospitalisations (%)", format: v => `${DV.fmt1(v)}%`, compact: v => `${d3.format(".0f")(v)}%` }
    };

    const tipHtml = d => `<strong>${d.road}</strong><br>
      ${state.yearA}: ${DV.fmtInt(d.a)} (${DV.fmt1(d.sa)}% of all)<br>
      ${state.yearB}: ${DV.fmtInt(d.b)} (${DV.fmt1(d.sb)}% of all)<br>
      Change: ${fmtSigned(d.abs)} (${d3.format("+.1f")(d.pct)}%)
      ${d.a < 1000 ? '<br><span class="tip-muted">Small group: per cent change can swing widely</span>' : ""}`;
    const tipText = d => `${d.road}: ${DV.fmtInt(d.a)} in ${state.yearA}, ${DV.fmtInt(d.b)} in ${state.yearB}, change ${fmtSigned(d.abs)} or ${d3.format("+.1f")(d.pct)} per cent`;

    // Spoken/screen-reader summary generated from the current data, so it stays true for any year pair.
    function describe(rows) {
      const up = d3.greatest(rows, d => d.abs);
      const down = d3.least(rows, d => d.abs);
      const view = state.view === "change"
        ? "Diverging bar chart of the change in hospitalisations"
        : "Dumbbell chart comparing hospitalisations";
      return `${view} by road user between ${state.yearA} and ${state.yearB}. ` +
        `${up.road} increased the most (${fmtSigned(up.abs)}); ${down.road} decreased the most (${fmtSigned(down.abs)}).`;
    }

    function updateCaveat() {
      const text = DV.reportingCaveat([state.yearA, state.yearB]);
      caveat.textContent = text || `Both ${state.yearA} and ${state.yearB} come after the reporting changes, so they can be compared directly.`;
      caveat.classList.toggle("caveat-warning", Boolean(text));
    }

    let chart = null;

    function build(width, narrow) {
      const rowH = narrow ? 44 : 34;
      const margin = narrow
        ? { top: 30, right: 54, bottom: 50, left: 54 }
        : { top: 30, right: 80, bottom: 50, left: 240 };
      const height = roads.length * rowH + margin.top + margin.bottom;
      const { svg, g, innerW, innerH } = DV.createSvg("#q2", width, height, margin, "");
      const x = d3.scaleLinear().range([0, innerW]);
      const y = d3.scaleBand().range([0, innerH]).padding(narrow ? 0 : 0.2);
      const xAxisG = g.append("g").attr("class", "axis").attr("transform", `translate(0,${innerH})`);
      const yAxisG = g.append("g").attr("class", "axis axis-y");
      const xLabel = g.append("text").attr("class", "axis-label").attr("x", innerW / 2).attr("y", innerH + 40).attr("text-anchor", "middle");
      const zeroLine = g.append("line").attr("class", "zero-line");
      const marks = g.append("g").attr("class", "marks");
      const legend = g.append("g").attr("class", "dumbbell-legend").attr("transform", "translate(0,-18)");
      // Phone layout: road-user label above the bar, bar in the lower part of the row.
      const markY = d => narrow ? y(d.road) + 26 : y(d.road) + y.bandwidth() / 2;
      const barH = () => narrow ? 14 : y.bandwidth();
      let lastView = null;

      function update(animate) {
        const t = animate ? DV.duration : 0;
        const rows = compute().sort((a, b) => d3.descending(Math.abs(a[state.sort]), Math.abs(b[state.sort])));
        y.domain(rows.map(d => d.road));
        if (lastView !== state.view) { marks.selectAll("*").remove(); lastView = state.view; }
        svg.attr("aria-label", describe(rows));

        if (narrow) {
          yAxisG.selectAll("*").remove();
          g.selectAll(".bar-label").data(rows, d => d.road).join("text").attr("class", "bar-label")
            .attr("x", state.view === "change" ? -margin.left + 4 : 0)
            .text(d => d.road)
            .transition().duration(t).attr("y", d => y(d.road) + 13);
        } else {
          g.selectAll(".bar-label").remove();
          yAxisG.transition().duration(t).call(d3.axisLeft(y).tickSize(0).tickPadding(8));
        }

        if (state.view === "change") {
          legend.selectAll("*").remove();
          const m = measures[state.measure];
          const maxAbs = d3.max(rows, d => Math.abs(d[m.key])) || 1;
          // Symmetric domain so 0 sits in the middle and increases/decreases are comparable.
          x.domain([-maxAbs, maxAbs]).nice();
          xAxisG.transition().duration(t).call(d3.axisBottom(x).ticks(narrow ? 4 : 6).tickFormat(m.format));
          zeroLine.attr("x1", x(0)).attr("x2", x(0)).attr("y1", 0).attr("y2", innerH).style("opacity", 1);
          xLabel.text(narrow ? (state.measure === "abs" ? `Change, ${state.yearA} to ${state.yearB}` : "Change in share (pp)") : m.label());

          const bars = marks.selectAll(".bar").data(rows, d => d.road)
            .join(enter => enter.append("rect").attr("class", "bar")
              .attr("x", x(0)).attr("width", 0).attr("y", d => markY(d) - (narrow ? 7 : barH() / 2)).attr("height", barH()));
          DV.addTooltip(bars, tipHtml, tipText);
          DV.enableArrowNavigation(bars);
          bars.transition().duration(t).delay(t ? (d, i) => i * 30 : 0)
            .attr("y", d => markY(d) - (narrow ? 7 : barH() / 2)).attr("height", barH())
            .attr("x", d => x(Math.min(0, d[m.key])))
            .attr("width", d => Math.abs(x(d[m.key]) - x(0)))
            // Two colours only: yellow = more people hospitalised, dark green = fewer.
            .attr("class", d => `bar ${d[m.key] > 0 ? "bar-increase" : "bar-decrease"}`);

          marks.selectAll(".value").data(rows, d => d.road).join("text").attr("class", "value")
            .transition().duration(t).delay(t ? (d, i) => i * 30 : 0)
            .attr("x", d => d[m.key] >= 0 ? x(d[m.key]) + 5 : x(d[m.key]) - 5)
            .attr("text-anchor", d => d[m.key] >= 0 ? "start" : "end")
            .attr("y", d => markY(d)).attr("dy", "0.35em")
            .text(d => m.format(d[m.key]));
        } else {
          const lv = levels[state.measure];
          x.domain([0, d3.max(rows, d => Math.max(d[lv.a], d[lv.b]))]).nice();
          xAxisG.transition().duration(t).call(d3.axisBottom(x).ticks(narrow ? 4 : 6).tickFormat(narrow ? lv.compact : lv.format));
          zeroLine.style("opacity", 0);
          xLabel.text(narrow ? lv.label : `${lv.label}, ${state.yearA} and ${state.yearB}`);

          // Legend: hollow circle = first year, filled circle = second year.
          legend.selectAll("*").remove();
          const items = [{ label: String(state.yearA), filled: false }, { label: String(state.yearB), filled: true }];
          const item = legend.selectAll("g").data(items).join("g").attr("transform", (d, i) => `translate(${i * 70},0)`);
          item.append("circle").attr("r", 6).attr("cx", 6)
            .attr("class", d => d.filled ? "dot-b" : "dot-a");
          item.append("text").attr("x", 16).attr("dy", "0.35em").attr("class", "legend-text").text(d => d.label);

          const rowsG = marks.selectAll(".dumbbell").data(rows, d => d.road)
            .join(enter => {
              const group = enter.append("g").attr("class", "dumbbell");
              group.append("line").attr("class", "dumbbell-line");
              group.append("circle").attr("class", "dot-a").attr("r", 6);
              group.append("circle").attr("class", "dot-b").attr("r", 6);
              return group;
            });
          rowsG.select(".dumbbell-line").transition().duration(t)
            .attr("x1", d => x(d[lv.a])).attr("x2", d => x(d[lv.b]))
            .attr("y1", markY).attr("y2", markY)
            .attr("class", d => `dumbbell-line ${d[lv.b] > d[lv.a] ? "line-increase" : "line-decrease"}`);
          rowsG.select(".dot-a").transition().duration(t).attr("cx", d => x(d[lv.a])).attr("cy", markY);
          rowsG.select(".dot-b").transition().duration(t).attr("cx", d => x(d[lv.b])).attr("cy", markY);
          // The second-year dot is the focusable mark; its tooltip describes both years.
          const focusDots = rowsG.select(".dot-b");
          DV.addTooltip(focusDots, tipHtml, tipText);
          DV.enableArrowNavigation(focusDots);

          marks.selectAll(".value").data(rows, d => d.road).join("text").attr("class", "value")
            .transition().duration(t)
            .attr("x", d => x(Math.max(d[lv.a], d[lv.b])) + 10)
            .attr("text-anchor", "start")
            .attr("y", markY).attr("dy", "0.35em")
            .text(d => lv.format(d[lv.b]));
        }

        DV.addDataTable("#q2", `Road-user hospitalisations, ${state.yearA} and ${state.yearB}, sorted by ${state.sort === "pct" ? "percentage" : "absolute"} change`, [
          { label: "Road user", key: "road" },
          { label: `${state.yearA} hospitalisations`, value: d => DV.fmtInt(d.a) },
          { label: `${state.yearB} hospitalisations`, value: d => DV.fmtInt(d.b) },
          { label: "Absolute change", value: d => fmtSigned(d.abs) },
          { label: "Percentage change", value: d => `${d3.format("+.1f")(d.pct)}%` },
          { label: "Share change", value: d => `${d3.format("+.1f")(d.pp)} percentage points` }
        ], rows);
      }
      return { update };
    }

    function refresh() {
      updateCaveat();
      if (chart) chart.update(true);
    }

    const yearOptions = years.map(y => ({ value: y, label: String(y) }));
    DV.setupSelect("q2-year-a", yearOptions, state.yearA, value => {
      state.yearA = +value;
      refresh();
      DV.announce(`Q2 comparison: ${state.yearA} with ${state.yearB}.`);
    });
    DV.setupSelect("q2-year-b", yearOptions, state.yearB, value => {
      state.yearB = +value;
      refresh();
      DV.announce(`Q2 comparison: ${state.yearA} with ${state.yearB}.`);
    });
    // Show the two year selects together (setupSelect hides a group with only one option).
    document.getElementById("q2-years").hidden = years.length < 2;

    updateCaveat();
    DV.responsive("#q2", (width, narrow) => {
      chart = build(width, narrow);
      chart.update(false);
    });
    DV.setupToggle("#q2-view", value => { state.view = value; refresh(); });
    DV.setupToggle("#q2-toggle", value => { state.measure = value; refresh(); });
    DV.setupToggle("#q2-sort", value => { state.sort = value; refresh(); });
  });
})();

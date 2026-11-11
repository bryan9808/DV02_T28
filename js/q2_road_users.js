// Q2 – Who is injured: change by road user, 2017 vs 2021 (diverging bar chart)
// Data: data/q2_road_users.csv
// Toggle switches between the change in number of people and the change in share (percentage points).

(function () {
  const width = 860, height = 480;
  const margin = { top: 10, right: 80, bottom: 50, left: 240 };
  const { g, innerW, innerH } = DV.createSvg("#q2", width, height, margin,
    "Diverging bar chart of the change in hospitalisations by road user between 2017 and 2021. Pedal cyclists increased the most (plus 1,087); car passengers (minus 607) and pedestrians (minus 380) decreased the most.");

  const measures = {
    abs: { key: "abs", label: "Change in hospitalisations, 2021 compared with 2017", format: d3.format("+,") },
    pp:  { key: "pp",  label: "Change in share of all hospitalisations (percentage points)", format: v => Math.abs(v) < 0.05 ? "0.0 pp" : `${d3.format("+.1f")(v)} pp` }
  };

  d3.csv("data/q2_road_users.csv", d => ({
    road: d.road_user,
    c17: +d.count_2017, c21: +d.count_2021,
    s17: +d.share_2017, s21: +d.share_2021,
    abs: +d.change_abs, pct: +d.change_pct, pp: +d.share_change_pp
  })).then(data => {
    const x = d3.scaleLinear().range([0, innerW]);
    const y = d3.scaleBand().range([0, innerH]).padding(0.2);
    const xAxisG = g.append("g").attr("class", "axis").attr("transform", `translate(0,${innerH})`);
    const yAxisG = g.append("g").attr("class", "axis axis-y");
    const zeroLine = g.append("line").attr("stroke", "var(--ink)");
    const xLabel = g.append("text").attr("class", "axis-label")
      .attr("x", innerW / 2).attr("y", innerH + 42).attr("text-anchor", "middle");

    const tipHtml = d => `<strong>${d.road}</strong><br>
      2017: ${DV.fmtInt(d.c17)} (${DV.fmt1(d.s17)}% of all)<br>
      2021: ${DV.fmtInt(d.c21)} (${DV.fmt1(d.s21)}% of all)<br>
      Change: ${d3.format("+,")(d.abs)} (${d3.format("+.1f")(d.pct)}%)
      ${d.c17 < 1000 ? '<br><span class="tip-muted">Small group: per cent change can swing widely</span>' : ""}`;

    function update(key) {
      const m = measures[key];
      const rows = [...data].sort((a, b) => d3.descending(a[m.key], b[m.key]));
      const maxAbs = d3.max(data, d => Math.abs(d[m.key]));
      // Symmetric domain so 0 sits in the middle and increases/decreases are comparable.
      x.domain([-maxAbs, maxAbs]).nice();
      y.domain(rows.map(d => d.road));

      xAxisG.transition().duration(DV.duration).call(d3.axisBottom(x).ticks(6).tickFormat(m.format));
      yAxisG.transition().duration(DV.duration).call(d3.axisLeft(y).tickSize(0).tickPadding(8));
      zeroLine.attr("x1", x(0)).attr("x2", x(0)).attr("y1", 0).attr("y2", innerH);
      xLabel.text(m.label);

      const bars = g.selectAll(".bar").data(rows, d => d.road).join("rect").attr("class", "bar");
      DV.addTooltip(bars, tipHtml,
        d => `${d.road}: ${m.format(d[m.key])}, from ${DV.fmtInt(d.c17)} in 2017 to ${DV.fmtInt(d.c21)} in 2021`);
      bars.transition().duration(DV.duration)
        .attr("y", d => y(d.road)).attr("height", y.bandwidth())
        .attr("x", d => x(Math.min(0, d[m.key])))
        .attr("width", d => Math.abs(x(d[m.key]) - x(0)))
        // Two colours only: orange = more people hospitalised, blue = fewer.
        .attr("fill", d => d[m.key] > 0 ? "var(--accent)" : "var(--line)");

      g.selectAll(".value").data(rows, d => d.road).join("text").attr("class", "value")
        .transition().duration(DV.duration)
        .attr("x", d => d[m.key] >= 0 ? x(d[m.key]) + 5 : x(d[m.key]) - 5)
        .attr("text-anchor", d => d[m.key] >= 0 ? "start" : "end")
        .attr("y", d => y(d.road) + y.bandwidth() / 2).attr("dy", "0.35em")
        .text(d => m.format(d[m.key]));
    }

    update("abs");
    DV.setupToggle("#q2-toggle", update);
  });
})();

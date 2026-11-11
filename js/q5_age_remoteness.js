// Q5 – Who is most at risk: age group (counts) and remoteness (counts vs rates), 2021
// Data: data/q5_age.csv and data/q5_remoteness.csv

// Part A: age groups (vertical bars, ordered by age, not alphabetically)
(function () {
  const width = 860, height = 380;
  const margin = { top: 20, right: 20, bottom: 55, left: 75 };
  const { g, innerW, innerH } = DV.createSvg("#q5-age", width, height, margin,
    "Bar chart of 2021 road crash hospitalisations by age group. The 40 to 64 group has the most (13,026), followed by 26 to 39 (9,423) and 17 to 25 (8,010); 0 to 7 has the fewest (707).");

  // Width of each age band in years, used to explain why wide bands have more cases.
  const bandYears = { "0-7": 8, "8-16": 9, "17-25": 9, "26-39": 14, "40-64": 25, "65-74": 10, "75+": null };

  d3.csv("data/q5_age.csv", d => ({ age: d.age_group, count: +d.hospitalisations, order: +d.age_order }))
    .then(raw => {
      const data = raw.sort((a, b) => a.order - b.order);
      const x = d3.scaleBand().domain(data.map(d => d.age)).range([0, innerW]).padding(0.25);
      const y = d3.scaleLinear().domain([0, d3.max(data, d => d.count)]).nice().range([innerH, 0]);

      g.append("g").attr("class", "grid").call(d3.axisLeft(y).ticks(5).tickSize(-innerW).tickFormat(""));
      g.append("g").attr("class", "axis").attr("transform", `translate(0,${innerH})`).call(d3.axisBottom(x));
      g.append("g").attr("class", "axis").call(d3.axisLeft(y).ticks(5).tickFormat(DV.fmtInt));
      g.append("text").attr("class", "axis-label").attr("x", innerW / 2).attr("y", innerH + 45)
        .attr("text-anchor", "middle").text("Age group (years)");

      const bars = g.selectAll(".bar").data(data).join("rect").attr("class", "bar")
        .attr("x", d => x(d.age)).attr("width", x.bandwidth())
        .attr("y", d => y(d.count)).attr("height", d => innerH - y(d.count))
        .attr("fill", "var(--line)");
      DV.addTooltip(bars,
        d => `<strong>Age ${d.age}</strong><br>${DV.fmtInt(d.count)} hospitalisations${bandYears[d.age] ? `<br><span class="tip-muted">This group covers ${bandYears[d.age]} years of age</span>` : ""}`,
        d => `Age ${d.age}: ${DV.fmtInt(d.count)} hospitalisations`);

      g.selectAll(".value").data(data).join("text").attr("class", "value")
        .attr("x", d => x(d.age) + x.bandwidth() / 2).attr("y", d => y(d.count) - 6)
        .attr("text-anchor", "middle").text(d => DV.fmtInt(d.count));
    });
})();

// Part B: remoteness (same switchable chart as Q4, kept in Major → Regional → Remote order)
d3.csv("data/q5_remoteness.csv", d => ({
  area: d.remoteness, count: +d.hospitalisations, pop: +d.population, rate: +d.rate_per_100k
})).then(data => {
  DV.switchableBarChart({
    selector: "#q5-remote", toggleSelector: "#q5-toggle", data, nameKey: "area", initial: "count",
    height: 260, leftMargin: 110, sort: false,
    ariaLabel: "Bar chart of 2021 road crash hospitalisations by remoteness of residence. Major Cities have the most cases (26,355) but the lowest rate (142 per 100,000); Remote areas have the fewest cases (1,114) but the highest rate (225 per 100,000).",
    measures: {
      count: { key: "count", label: "Hospitalisations, 2021", format: DV.fmtInt, axisFormat: DV.fmtInt },
      rate:  { key: "rate", label: "Hospitalisations per 100,000 people, 2021", format: v => d3.format(".0f")(v), axisFormat: d3.format(".0f") }
    },
    tooltipHtml: d => `<strong>${d.area}</strong><br>${DV.fmtInt(d.count)} hospitalisations<br>Population: ${DV.fmtInt(d.pop)}<br>Rate: ${DV.fmt1(d.rate)} per 100,000`,
    tooltipText: d => `${d.area}: ${DV.fmtInt(d.count)} hospitalisations, ${DV.fmt1(d.rate)} per 100,000 people`
  });
});

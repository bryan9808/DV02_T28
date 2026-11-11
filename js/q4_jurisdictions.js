// Q4 – Where: States and Territories, 2021, counts vs rates per 100,000
// Data: data/q4_jurisdictions.csv (state, hospitalisations, population, rate_per_100k)
// Switching measure re-sorts the bars, so users see the ranking change.

d3.csv("data/q4_jurisdictions.csv", d => ({
  state: d.state, count: +d.hospitalisations, pop: +d.population, rate: +d.rate_per_100k
})).then(data => {
  DV.switchableBarChart({
    selector: "#q4", toggleSelector: "#q4-toggle", data, nameKey: "state", initial: "count",
    height: 400, leftMargin: 70,
    ariaLabel: "Bar chart of 2021 road crash hospitalisations by state and territory. By count, Victoria is highest and the Northern Territory lowest; by rate per 100,000 people, the Northern Territory is highest (286) and New South Wales lowest (111).",
    nameLabel: s => s === "NSW" ? "NSW*" : s,
    highlight: d => d.state === "NSW",
    measures: {
      count: { key: "count", label: "Hospitalisations, 2021", format: DV.fmtInt, axisFormat: DV.fmtInt },
      rate:  { key: "rate", label: "Hospitalisations per 100,000 people, 2021", format: v => d3.format(".0f")(v), axisFormat: d3.format(".0f") }
    },
    tooltipHtml: d => `<strong>${d.state}</strong><br>${DV.fmtInt(d.count)} hospitalisations<br>Population: ${DV.fmtInt(d.pop)}<br>Rate: ${DV.fmt1(d.rate)} per 100,000${d.state === "NSW" ? '<br><span class="tip-muted">Since 2017, NSW does not count emergency-department-only cases</span>' : ""}`,
    tooltipText: d => `${d.state}: ${DV.fmtInt(d.count)} hospitalisations, ${DV.fmt1(d.rate)} per 100,000 people`
  });
});

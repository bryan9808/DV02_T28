// Q1 – Overview: annual non-fatal road traffic hospitalisations, Australia, 2011–2021
// Data: data/q1_trend.csv (year, hospitalisations, reporting_period)

(function () {
  const width = 860, height = 420;
  const margin = { top: 30, right: 30, bottom: 50, left: 75 };
  const { g, innerW, innerH } = DV.createSvg("#q1", width, height, margin,
    "Line chart of annual non-fatal road traffic hospitalisations in Australia, rising from 34,033 in 2011 to a peak of 39,866 in 2019, dipping to 37,966 in 2020 and reaching 39,505 in 2021.");

  // d3.csv reads text, so "+" converts numbers.
  d3.csv("data/q1_trend.csv", d => ({
    year: +d.year,
    value: +d.hospitalisations,
    period: d.reporting_period
  })).then(data => {
    const x = d3.scaleLinear().domain(d3.extent(data, d => d.year)).range([0, innerW]);
    // Y axis starts at 0 (graphical integrity: a cropped axis would exaggerate the rise).
    const y = d3.scaleLinear().domain([0, d3.max(data, d => d.value) * 1.1]).nice().range([innerH, 0]);

    g.append("g").attr("class", "grid")
      .call(d3.axisLeft(y).ticks(5).tickSize(-innerW).tickFormat(""));
    g.append("g").attr("class", "axis").attr("transform", `translate(0,${innerH})`)
      .call(d3.axisBottom(x).ticks(data.length).tickFormat(d3.format("d")));
    g.append("g").attr("class", "axis").call(d3.axisLeft(y).ticks(5).tickFormat(DV.fmtInt));
    g.append("text").attr("class", "axis-label")
      .attr("transform", "rotate(-90)").attr("x", -innerH / 2).attr("y", -60)
      .attr("text-anchor", "middle").text("Hospitalisations");

    // Annotations: reporting breaks (not real changes in injuries).
    const breaks = [
      { year: 2012, label: "VIC counting change" },
      { year: 2017, label: "NSW counting change" }
    ];
    const ann = g.selectAll(".break").data(breaks).join("g").attr("class", "break")
      .attr("transform", d => `translate(${x(d.year)},0)`);
    ann.append("line").attr("y1", -10).attr("y2", innerH)
      .attr("stroke", "var(--accent)").attr("stroke-dasharray", "4 4");
    ann.append("text").attr("class", "annotation").attr("x", 6).attr("y", -2).text(d => d.label);

    // Annotation: 2020 dip (careful wording: coincides, not caused).
    const d2020 = data.find(d => d.year === 2020);
    if (d2020) {
      g.append("text").attr("class", "annotation")
        .attr("x", x(2020)).attr("y", y(d2020.value) + 28).attr("text-anchor", "middle")
        .text("2020 dip coincides with COVID-19 restrictions");
    }

    g.append("path").datum(data)
      .attr("fill", "none").attr("stroke", "var(--line)").attr("stroke-width", 2.5)
      .attr("d", d3.line().x(d => x(d.year)).y(d => y(d.value)));

    const points = g.selectAll(".point").data(data).join("circle")
      .attr("class", "point")
      .attr("cx", d => x(d.year)).attr("cy", d => y(d.value)).attr("r", 5)
      .attr("fill", "var(--line)");
    DV.addTooltip(points,
      d => `<strong>${d.year}</strong><br>${DV.fmtInt(d.value)} hospitalisations<br><span class="tip-muted">${d.period}</span>`,
      d => `${d.year}: ${DV.fmtInt(d.value)} hospitalisations`);
  });
})();

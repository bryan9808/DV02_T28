// Q3 – What vulnerable road users collided with, 2017–2021 (100% stacked bar chart)
// Data: data/q3_counterparty.csv
// Small counterparty categories are grouped into "Other parties" to keep the chart readable.

(function () {
  const width = 860, height = 300;
  const margin = { top: 10, right: 20, bottom: 40, left: 120 };
  const { g, innerW, innerH } = DV.createSvg("#q3", width, height, margin,
    "100 per cent stacked bar chart of what motorcyclists, pedal cyclists and pedestrians collided with, 2017 to 2021. Non-collision accidents are the largest group for motorcyclists (42%) and pedal cyclists (44%); cars, pick-up trucks or vans account for 88% of pedestrian cases.");

  // Display groups, in stacking order, with Okabe–Ito colour-blind-safe colours.
  const groups = [
    { key: "Non-collision", color: "#E69F00", match: c => c === "Non-collision transport accident" },
    { key: "Car, pick-up truck or van", color: "#0072B2", match: c => c === "Car, pick-up truck or van" },
    { key: "Heavy vehicle or bus", color: "#CC79A7", match: c => c === "Heavy transport vehicle or bus" },
    { key: "Fixed or stationary object", color: "#009E73", match: c => c === "Fixed or stationary object" },
    { key: "Other parties", color: "#56B4E9", match: () => true },  // fallback, checked after the others
    { key: "Unspecified", color: "#BBBBBB", match: c => c === "Other and unspecified transport accidents" }
  ];
  const groupOf = c => (groups.find(g => g.key !== "Other parties" && g.match(c)) || groups[4]).key;
  const color = d3.scaleOrdinal(groups.map(g => g.key), groups.map(g => g.color));

  d3.csv("data/q3_counterparty.csv", d => ({
    road: d.road_user, counterparty: d.counterparty, count: +d.hospitalisations
  })).then(raw => {
    // Sum counts per road user and display group, then convert to shares.
    const roads = ["Motorcyclist", "Pedal cyclist", "Pedestrian"];
    const rows = roads.map(road => {
      const subset = raw.filter(d => d.road === road);
      const total = d3.sum(subset, d => d.count);
      const row = { road, total };
      groups.forEach(gr => {
        const count = d3.sum(subset.filter(d => groupOf(d.counterparty) === gr.key), d => d.count);
        row[gr.key] = count / total * 100;
        row[`${gr.key}_n`] = count;
      });
      return row;
    });

    const series = d3.stack().keys(groups.map(g => g.key))(rows);
    const x = d3.scaleLinear().domain([0, 100]).range([0, innerW]);
    const y = d3.scaleBand().domain(roads).range([0, innerH]).padding(0.3);

    g.append("g").attr("class", "axis").attr("transform", `translate(0,${innerH})`)
      .call(d3.axisBottom(x).ticks(5).tickFormat(d => `${d}%`));
    g.append("g").attr("class", "axis axis-y").call(d3.axisLeft(y).tickSize(0).tickPadding(8));

    const layers = g.selectAll(".layer").data(series).join("g")
      .attr("class", "layer").attr("fill", s => color(s.key));

    const segs = layers.selectAll("rect").data(s => s.map(v => ({ key: s.key, v }))).join("rect")
      .attr("class", "seg")
      .attr("x", d => x(d.v[0])).attr("width", d => x(d.v[1]) - x(d.v[0]))
      .attr("y", d => y(d.v.data.road)).attr("height", y.bandwidth());
    const share = d => d.v.data[d.key];
    DV.addTooltip(segs,
      d => `<strong>${d.v.data.road}</strong><br>${d.key}: ${DV.fmtInt(d.v.data[`${d.key}_n`])} of ${DV.fmtInt(d.v.data.total)} cases (${DV.fmt1(share(d))}%)`,
      d => `${d.v.data.road}, ${d.key}: ${DV.fmt1(share(d))} per cent`);

    // Direct labels on segments wide enough to hold them.
    layers.selectAll("text").data(s => s.map(v => ({ key: s.key, v }))).join("text")
      .attr("class", "seg-label")
      .attr("x", d => x((d.v[0] + d.v[1]) / 2)).attr("y", d => y(d.v.data.road) + y.bandwidth() / 2)
      .attr("dy", "0.35em").attr("text-anchor", "middle")
      .text(d => share(d) >= 8 ? `${Math.round(share(d))}%` : "");

    // Clickable legend: highlight one counterparty across all road users.
    let active = null;
    const legend = d3.select("#q3-legend").selectAll("button").data(groups).join("button")
      .attr("type", "button").attr("aria-pressed", "false")
      .html(d => `<span class="swatch" style="background:${d.color}"></span>${d.key}`)
      .on("click", function (event, d) {
        active = active === d.key ? null : d.key;
        legend.attr("aria-pressed", gr => String(gr.key === active));
        layers.transition().duration(DV.duration).attr("opacity", s => !active || s.key === active ? 1 : 0.2);
      });
  });
})();

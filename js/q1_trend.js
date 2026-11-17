// Q1 – Overview: annual non-fatal road traffic hospitalisations, Australia, 2011–2021
// Data: data/q1_trend.csv (year, hospitalisations, reporting_period)

(function () {
  const width = 860, height = 420;
  const margin = { top: 30, right: 30, bottom: 50, left: 75 };
  const { svg, g, innerW, innerH } = DV.createSvg("#q1", width, height, margin,
    "Line chart of annual non-fatal road traffic hospitalisations in Australia, 2011 to 2021.");
  const filter = document.getElementById("q1-period");
  const summary = document.getElementById("q1-summary");
  const averageToggle = document.getElementById("q1-ma");
  const x = d3.scaleLinear().range([0, innerW]);
  const y = d3.scaleLinear().range([innerH, 0]);
  const gradient = svg.append("defs").append("linearGradient")
    .attr("id", "q1-area-gradient").attr("x1", "0").attr("x2", "0").attr("y1", "0").attr("y2", "1");
  gradient.append("stop").attr("offset", "0%").attr("stop-color", "var(--accent)").attr("stop-opacity", 0.4);
  gradient.append("stop").attr("offset", "48%").attr("stop-color", "var(--caveat)").attr("stop-opacity", 0.3);
  gradient.append("stop").attr("offset", "100%").attr("stop-color", "var(--line)").attr("stop-opacity", 0.08);
  g.insert("rect", ":first-child").attr("class", "chart-interaction")
    .attr("width", innerW).attr("height", innerH).attr("aria-hidden", "true");
  const gridG = g.append("g").attr("class", "grid");
  const xAxisG = g.append("g").attr("class", "axis").attr("transform", `translate(0,${innerH})`);
  const yAxisG = g.append("g").attr("class", "axis");
  g.append("text").attr("class", "axis-label")
    .attr("transform", "rotate(-90)").attr("x", -innerH / 2).attr("y", -60)
    .attr("text-anchor", "middle").text("Hospitalisations");

  const area = d3.area().x(d => x(d.year)).y0(y(0)).y1(d => y(d.value));
  const line = d3.line().x(d => x(d.year)).y(d => y(d.value));
  const movingAverageLine = d3.line().defined(d => d.movingAverage !== null)
    .x(d => x(d.year)).y(d => y(d.movingAverage));
  const areaPath = g.append("path").attr("fill", "url(#q1-area-gradient)")
    .attr("pointer-events", "none").lower();
  const linePath = g.append("path")
    .attr("fill", "none").attr("stroke", "var(--line)").attr("stroke-width", 2.5)
    .attr("pointer-events", "none");
  const averagePath = g.append("path").attr("class", "moving-average").style("opacity", 0);
  const crosshair = g.append("g").attr("class", "crosshair").style("display", "none");
  const crosshairLine = crosshair.append("line").attr("y1", 0).attr("y2", innerH);
  const crosshairPoint = crosshair.append("circle").attr("r", 5);
  const crosshairText = crosshair.append("text").attr("y", 16);

  // Read the annual values once; each filter view is derived from this complete series.
  d3.csv("data/q1_trend.csv", d => ({
    year: +d.year,
    value: +d.hospitalisations,
    period: d.reporting_period
  })).then(data => {
    // Calculate a trailing three-year average once, using the current year and two prior years.
    data.forEach((d, index) => {
      d.movingAverage = index >= 2
        ? d3.mean(data.slice(index - 2, index + 1), row => row.value)
        : null;
    });
    const breaks = [
      { year: 2012, label: "VIC counting change" },
      { year: 2017, label: "NSW counting change" }
    ];

    // Return the annual rows and display label represented by the selected control value.
    function getSelection(value) {
      if (value === "all") {
        return { rows: data, label: "All Years (2011–2021)", year: null };
      }
      if (value === "2011-2016" || value === "2017-2021") {
        const [start, end] = value.split("-").map(Number);
        return {
          rows: data.filter(d => d.year >= start && d.year <= end),
          label: `${start}–${end}`,
          year: null
        };
      }
      const year = Number(value.replace("year-", ""));
      return {
        rows: data.filter(d => d.year === year),
        label: String(year),
        year
      };
    }

    // Show an annual count and year-over-year change, or a range sum and endpoint change.
    function updateSummary(selection) {
      const total = d3.sum(selection.rows, d => d.value);
      const totalLabel = `${DV.fmtInt(total)} hospitalisations`;
      let changeLabel = "";

      if (selection.year !== null) {
        const previous = data.find(d => d.year === selection.year - 1);
        changeLabel = previous
          ? `${d3.format("+.1f")(((selection.rows[0].value - previous.value) / previous.value) * 100)}% vs ${previous.year}`
          : "year-over-year change unavailable";
      } else if (selection.rows.length > 1) {
        const first = selection.rows[0];
        const last = selection.rows[selection.rows.length - 1];
        const change = ((last.value - first.value) / first.value) * 100;
        changeLabel = `${d3.format("+.1f")(change)}% from ${first.year} to ${last.year}`;
      }

      summary.textContent = `${selection.label}: ${totalLabel}${changeLabel ? ` · ${changeLabel}` : ""}`;
    }

    // Animate the axes, line, points, and reporting annotations to the selected time window.
    function updateChart(selection) {
      const rows = selection.rows;
      const years = rows.map(d => d.year);
      const yearExtent = d3.extent(years);
      // Pad a single-year view so its point is centered and the year remains readable.
      x.domain(yearExtent[0] === yearExtent[1]
        ? [yearExtent[0] - 0.5, yearExtent[1] + 0.5]
        : yearExtent);
      y.domain([0, d3.max(rows, d => d.value) * 1.1]).nice();

      const xAxis = d3.axisBottom(x).tickValues(years).tickFormat(d3.format("d"));
      const yAxis = d3.axisLeft(y).ticks(5).tickFormat(DV.fmtInt);
      xAxisG.transition().duration(DV.duration).call(xAxis);
      yAxisG.transition().duration(DV.duration).call(yAxis);
      gridG.transition().duration(DV.duration)
        .call(d3.axisLeft(y).ticks(5).tickSize(-innerW).tickFormat(""));

      areaPath.datum(rows).transition().duration(DV.duration).attr("d", area);
      linePath.datum(rows).transition().duration(DV.duration).attr("d", line);
      averagePath.datum(rows).interrupt().transition().duration(DV.duration)
        .attr("d", movingAverageLine)
        .style("opacity", averageToggle.checked ? 1 : 0);

      const points = g.selectAll(".point").data(rows, d => d.year)
        .join(
          enter => enter.append("circle").attr("class", "point")
            .attr("cx", d => x(d.year)).attr("cy", d => y(d.value))
            .attr("r", 5).attr("fill", "var(--line)").style("opacity", 0),
          update => update,
          exit => exit.attr("tabindex", -1)
            .transition().duration(DV.duration).style("opacity", 0).remove()
        );
      // Points use roving arrow-key focus; the hidden table below is rebuilt for the active period.
      DV.addTooltip(points,
        d => `<strong>${d.year}</strong><br>${DV.fmtInt(d.value)} hospitalisations<br><span class="tip-muted">${d.period}</span>`,
        d => `${d.year}: ${DV.fmtInt(d.value)} hospitalisations`);
      DV.enableArrowNavigation(points);
      points.transition().duration(DV.duration)
        .attr("cx", d => x(d.year)).attr("cy", d => y(d.value))
        .style("opacity", 1);

      // Keep only reporting-break annotations inside the selected window and animate their positions.
      const visibleBreaks = breaks.filter(d => years.includes(d.year));
      const annotations = g.selectAll(".break").data(visibleBreaks, d => d.year)
        .join(
          enter => {
            const group = enter.append("g").attr("class", "break").style("opacity", 0);
            group.append("line")
              .attr("y1", -10).attr("y2", innerH)
              .attr("stroke", "var(--accent)").attr("stroke-dasharray", "4 4");
            group.append("text").attr("class", "annotation")
              .attr("x", 6).attr("y", -2).text(d => d.label);
            return group;
          },
          update => update,
          exit => exit.transition().duration(DV.duration).style("opacity", 0).remove()
        );
      annotations.transition().duration(DV.duration)
        .attr("transform", d => `translate(${x(d.year)},0)`).style("opacity", 1);

      // Show the contextual 2020 note only while its annual observation is in view.
      const dip = rows.filter(d => d.year === 2020);
      g.selectAll(".covid-annotation").data(dip, d => d.year)
        .join(
          enter => enter.append("text").attr("class", "annotation covid-annotation")
            .attr("text-anchor", "middle").style("opacity", 0)
            .text("2020 dip coincides with COVID-19 restrictions"),
          update => update,
          exit => exit.transition().duration(DV.duration).style("opacity", 0).remove()
        )
        .transition().duration(DV.duration)
        .attr("x", d => x(d.year)).attr("y", d => y(d.value) + 28)
        .style("opacity", 1);

      DV.addDataTable("#q1", `Annual hospitalisation data, ${selection.label}`, [
        { label: "Year", key: "year" },
        { label: "Hospitalisations", value: d => DV.fmtInt(d.value) },
        {
          label: "Three-year moving average",
          value: d => d.movingAverage === null ? "Not available" : DV.fmt1(d.movingAverage)
        },
        { label: "Reporting period", key: "period" }
      ], rows);
      crosshair.style("display", "none");
    }

    // Snap the interactive vertical guideline and value marker to the nearest visible year.
    g.on("pointermove", event => {
      const [pointerX, pointerY] = d3.pointer(event, g.node());
      if (pointerX < 0 || pointerX > innerW || pointerY < 0 || pointerY > innerH) {
        crosshair.style("display", "none");
        return;
      }
      const selection = getSelection(filter.value);
      const point = d3.least(selection.rows, d => Math.abs(x(d.year) - pointerX));
      if (!point) return;
      const pointX = x(point.year);
      crosshair.style("display", null);
      crosshairLine.attr("x1", pointX).attr("x2", pointX);
      crosshairPoint.attr("cx", pointX).attr("cy", y(point.value));
      crosshairText
        .attr("x", pointX > innerW - 150 ? pointX - 8 : pointX + 8)
        .attr("text-anchor", pointX > innerW - 150 ? "end" : "start")
        .text(`${point.year} · ${DV.fmtInt(point.value)}`);
    }).on("pointerleave", () => crosshair.style("display", "none"));

    // Refresh the KPI and chart whenever the year/period select control changes.
    function update(event) {
      const selection = getSelection(filter.value);
      svg.attr("aria-label", `Line chart of annual non-fatal road traffic hospitalisations for ${selection.label}.`);
      updateSummary(selection);
      updateChart(selection);
      if (event) DV.announce(`Q1 filter: ${summary.textContent}`);
    }

    filter.addEventListener("change", update);
    // Re-render only the trend overlays when the moving-average checkbox is toggled.
    averageToggle.addEventListener("change", () => {
      updateChart(getSelection(filter.value));
      DV.announce(`Q1 three-year moving average ${averageToggle.checked ? "shown" : "hidden"}.`);
    });
    update();
  });
})();

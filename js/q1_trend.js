// Q1 – Overview: annual non-fatal road traffic hospitalisations, Australia, 2011–2021
// Data: data/q1_trend.csv (year, hospitalisations, reporting_period)
// Features: year/period filter with KPI, animated transitions, area gradient, crosshair,
// 3-year moving average, reporting-break annotations, responsive layout.

(function () {
  const filter = document.getElementById("q1-period");
  const summary = document.getElementById("q1-summary");
  const averageToggle = document.getElementById("q1-ma");
  const breaks = [
    { year: 2012, label: "VIC counting change", short: "VIC change" },
    { year: 2017, label: "NSW counting change", short: "NSW change" }
  ];

  d3.csv("data/q1_trend.csv", d => ({
    year: +d.year,
    value: +d.hospitalisations,
    period: d.reporting_period
  })).then(data => {
    // Trailing three-year average: the current year and the two before it.
    data.forEach((d, index) => {
      d.movingAverage = index >= 2 ? d3.mean(data.slice(index - 2, index + 1), row => row.value) : null;
    });

    // Return the annual rows and display label represented by the selected control value.
    function getSelection(value) {
      if (value === "all") return { rows: data, label: "All Years (2011–2021)", year: null };
      if (value === "2011-2016" || value === "2017-2021") {
        const [start, end] = value.split("-").map(Number);
        return { rows: data.filter(d => d.year >= start && d.year <= end), label: `${start}–${end}`, year: null };
      }
      const year = Number(value.replace("year-", ""));
      return { rows: data.filter(d => d.year === year), label: String(year), year };
    }

    // Show an annual count and year-over-year change, or a range total and endpoint change.
    function updateSummary(selection) {
      const total = d3.sum(selection.rows, d => d.value);
      const totalLabel = selection.year !== null
        ? `${DV.fmtInt(total)} hospitalisations`
        : `${DV.fmtInt(total)} hospitalisations in total`;
      let changeLabel = "";
      if (selection.year !== null) {
        const previous = data.find(d => d.year === selection.year - 1);
        changeLabel = previous
          ? `${d3.format("+.1f")(((selection.rows[0].value - previous.value) / previous.value) * 100)}% vs ${previous.year}`
          : "no earlier year to compare";
      } else if (selection.rows.length > 1) {
        const first = selection.rows[0];
        const last = selection.rows[selection.rows.length - 1];
        changeLabel = `${d3.format("+.1f")(((last.value - first.value) / first.value) * 100)}% from ${first.year} to ${last.year}`;
      }
      summary.textContent = `${selection.label}: ${totalLabel}${changeLabel ? ` · ${changeLabel}` : ""}`;
    }

    let chart = null;

    // Build every SVG element for the current container width; update() animates within it.
    function build(width, narrow) {
      const height = narrow ? 320 : 420;
      const margin = narrow ? { top: 34, right: 16, bottom: 40, left: 52 } : { top: 34, right: 30, bottom: 50, left: 75 };
      const { svg, g, innerW, innerH } = DV.createSvg("#q1", width, height, margin, "");
      const x = d3.scaleLinear().range([0, innerW]);
      const y = d3.scaleLinear().range([innerH, 0]);

      const gradient = svg.append("defs").append("linearGradient")
        .attr("id", "q1-area-gradient").attr("x1", "0").attr("x2", "0").attr("y1", "0").attr("y2", "1");
      gradient.append("stop").attr("offset", "0%").attr("stop-color", "var(--accent)").attr("stop-opacity", 0.4);
      gradient.append("stop").attr("offset", "48%").attr("stop-color", "var(--caveat)").attr("stop-opacity", 0.3);
      gradient.append("stop").attr("offset", "100%").attr("stop-color", "var(--line)").attr("stop-opacity", 0.08);

      g.append("rect").attr("class", "chart-interaction")
        .attr("width", innerW).attr("height", innerH).attr("aria-hidden", "true");
      const gridG = g.append("g").attr("class", "grid");
      const xAxisG = g.append("g").attr("class", "axis").attr("transform", `translate(0,${innerH})`);
      const yAxisG = g.append("g").attr("class", "axis");
      // On phones the axis title would collide with tick labels; the heading already names the unit.
      if (!narrow) {
        g.append("text").attr("class", "axis-label")
          .attr("transform", "rotate(-90)").attr("x", -innerH / 2).attr("y", -60)
          .attr("text-anchor", "middle").text("Hospitalisations");
      }

      const area = d3.area().x(d => x(d.year)).y0(() => y(0)).y1(d => y(d.value));
      const line = d3.line().x(d => x(d.year)).y(d => y(d.value));
      const movingAverageLine = d3.line().defined(d => d.movingAverage !== null)
        .x(d => x(d.year)).y(d => y(d.movingAverage));
      const areaPath = g.append("path").attr("fill", "url(#q1-area-gradient)").attr("pointer-events", "none");
      const linePath = g.append("path").attr("fill", "none").attr("stroke", "var(--line)")
        .attr("stroke-width", 2.5).attr("pointer-events", "none");
      const averagePath = g.append("path").attr("class", "moving-average").style("opacity", 0);
      const crosshair = g.append("g").attr("class", "crosshair").style("display", "none");
      const crosshairLine = crosshair.append("line").attr("y1", 0).attr("y2", innerH);
      const crosshairPoint = crosshair.append("circle").attr("r", 5);
      const crosshairText = crosshair.append("text").attr("y", 16);

      function update(animate) {
        const t = animate ? DV.duration : 0;
        const selection = getSelection(filter.value);
        const rows = selection.rows;
        const years = rows.map(d => d.year);
        const extent = d3.extent(years);
        // Pad a single-year view so its point is centred and the year remains readable.
        x.domain(extent[0] === extent[1] ? [extent[0] - 0.5, extent[1] + 0.5] : extent);
        y.domain([0, d3.max(rows, d => d.value) * 1.1]).nice();

        // On phones, label every second year so tick labels never collide.
        const tickYears = narrow && years.length > 6 ? years.filter((yr, i) => i % 2 === 0) : years;
        xAxisG.transition().duration(t).call(d3.axisBottom(x).tickValues(tickYears).tickFormat(d3.format("d")));
        yAxisG.transition().duration(t).call(d3.axisLeft(y).ticks(5).tickFormat(narrow ? DV.fmtCompact : DV.fmtInt));
        gridG.transition().duration(t).call(d3.axisLeft(y).ticks(5).tickSize(-innerW).tickFormat(""));

        areaPath.datum(rows).transition().duration(t).attr("d", area);
        linePath.datum(rows).transition().duration(t).attr("d", line);
        averagePath.datum(rows).interrupt().transition().duration(t)
          .attr("d", movingAverageLine).style("opacity", averageToggle.checked ? 1 : 0);

        const points = g.selectAll(".point").data(rows, d => d.year)
          .join(
            enter => enter.append("circle").attr("class", "point")
              .attr("cx", d => x(d.year)).attr("cy", d => y(d.value))
              .attr("r", 5).attr("fill", "var(--line)").style("opacity", 0),
            update => update,
            exit => exit.attr("tabindex", -1).transition().duration(t).style("opacity", 0).remove()
          );
        DV.addTooltip(points,
          d => `<strong>${d.year}</strong><br>${DV.fmtInt(d.value)} hospitalisations<br><span class="tip-muted">${d.period}</span>`,
          d => `${d.year}: ${DV.fmtInt(d.value)} hospitalisations, ${d.period}`);
        DV.enableArrowNavigation(points);
        points.transition().duration(t).attr("cx", d => x(d.year)).attr("cy", d => y(d.value)).style("opacity", 1);

        // Reporting-break annotations: dashed line plus dark label text (readable at 4.5:1).
        const visibleBreaks = breaks.filter(d => years.includes(d.year));
        g.selectAll(".break").data(visibleBreaks, d => d.year)
          .join(
            enter => {
              const group = enter.append("g").attr("class", "break").style("opacity", 0);
              group.append("line").attr("class", "break-line").attr("y1", -14).attr("y2", innerH);
              group.append("text").attr("class", "annotation").attr("x", 5).attr("y", -6)
                .text(d => narrow ? d.short : d.label);
              return group;
            },
            update => update,
            exit => exit.transition().duration(t).style("opacity", 0).remove()
          )
          .transition().duration(t)
          .attr("transform", d => `translate(${x(d.year)},0)`).style("opacity", 1);

        // The 2020 note is shown only while 2020 is in view; worded as "coincides", not "caused".
        g.selectAll(".covid-annotation").data(rows.filter(d => d.year === 2020), d => d.year)
          .join(
            enter => enter.append("text").attr("class", "annotation covid-annotation")
              .attr("text-anchor", "end").style("opacity", 0)
              .text(narrow ? "2020 dip (COVID-19)" : "2020 dip coincides with COVID-19 restrictions"),
            update => update,
            exit => exit.transition().duration(t).style("opacity", 0).remove()
          )
          .transition().duration(t)
          .attr("x", d => Math.min(x(d.year) + 20, innerW)).attr("y", d => y(d.value) + 30)
          .style("opacity", 1);

        svg.attr("aria-label", `Line chart of annual non-fatal road traffic hospitalisations for ${selection.label}. ${summary.textContent}.`);
        DV.addDataTable("#q1", `Annual hospitalisation data, ${selection.label}`, [
          { label: "Year", key: "year" },
          { label: "Hospitalisations", value: d => DV.fmtInt(d.value) },
          { label: "Three-year moving average", value: d => d.movingAverage === null ? "Not available" : DV.fmt1(d.movingAverage) },
          { label: "Reporting period", key: "period" }
        ], rows);
        crosshair.style("display", "none");
      }

      // Snap the vertical guideline and value marker to the nearest visible year.
      g.on("pointermove", event => {
        const [px, py] = d3.pointer(event, g.node());
        if (px < 0 || px > innerW || py < 0 || py > innerH) { crosshair.style("display", "none"); return; }
        const point = d3.least(getSelection(filter.value).rows, d => Math.abs(x(d.year) - px));
        if (!point) return;
        const cx = x(point.year);
        const flip = cx > innerW - 110;
        crosshair.style("display", null);
        crosshairLine.attr("x1", cx).attr("x2", cx);
        crosshairPoint.attr("cx", cx).attr("cy", y(point.value));
        crosshairText.attr("x", flip ? cx - 8 : cx + 8).attr("text-anchor", flip ? "end" : "start")
          .text(`${point.year} · ${DV.fmtInt(point.value)}`);
      }).on("pointerleave", () => crosshair.style("display", "none"));

      return { update };
    }

    function refresh(event) {
      updateSummary(getSelection(filter.value));
      if (chart) chart.update(Boolean(event));
      if (event) DV.announce(`Q1 filter: ${summary.textContent}`);
    }

    updateSummary(getSelection(filter.value));
    DV.responsive("#q1", (width, narrow) => {
      chart = build(width, narrow);
      chart.update(false);
    });
    filter.addEventListener("change", refresh);
    averageToggle.addEventListener("change", () => {
      if (chart) chart.update(true);
      DV.announce(`Q1 three-year moving average ${averageToggle.checked ? "shown" : "hidden"}.`);
    });
  });
})();

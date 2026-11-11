// Shared helpers used by every chart (loaded before the chart files).
// Keeping these in one place avoids repeating the same code five times.

const DV = (() => {
  const tooltip = d3.select("#tooltip");
  const fmtInt = d3.format(",");
  const fmt1 = d3.format(",.1f");

  // Respect users who ask their operating system for reduced motion.
  const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 600;

  // Create a responsive SVG (viewBox) plus an inner group shifted by the margins.
  function createSvg(selector, width, height, margin, ariaLabel) {
    const svg = d3.select(selector).append("svg")
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("role", "img")
      .attr("aria-label", ariaLabel);
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
    return {
      svg, g,
      innerW: width - margin.left - margin.right,
      innerH: height - margin.top - margin.bottom
    };
  }

  // Tooltip that works on mouse hover AND keyboard focus (Tab key).
  // htmlFn builds the tooltip content; textFn gives a plain-text label for screen readers.
  function addTooltip(selection, htmlFn, textFn) {
    selection
      .attr("tabindex", 0)
      .attr("aria-label", d => textFn(d))
      .on("mouseenter focus", (event, d) => {
        const box = event.currentTarget.getBoundingClientRect();
        tooltip.attr("hidden", null).html(htmlFn(d))
          .style("left", `${window.scrollX + box.left + box.width / 2 + 10}px`)
          .style("top", `${window.scrollY + box.top - 10}px`);
      })
      .on("mouseleave blur", () => tooltip.attr("hidden", true));
  }

  // Button group that behaves like a switch. Calls onChange(value) when clicked.
  function setupToggle(groupSelector, onChange) {
    const buttons = d3.selectAll(`${groupSelector} button`);
    buttons.on("click", function () {
      buttons.attr("aria-pressed", "false");
      d3.select(this).attr("aria-pressed", "true");
      onChange(this.dataset.value);
    });
  }

  // Horizontal bar chart that can switch between two measures (e.g. count vs rate)
  // and optionally re-sort, so users can see how the ranking changes.
  // Used by Q4 (states) and Q5 (remoteness).
  function switchableBarChart(cfg) {
    const width = 860, height = cfg.height || 380;
    const margin = { top: 10, right: 110, bottom: 50, left: cfg.leftMargin || 120 };
    const { g, innerW, innerH } = createSvg(cfg.selector, width, height, margin, cfg.ariaLabel);

    const x = d3.scaleLinear().range([0, innerW]);
    const y = d3.scaleBand().range([0, innerH]).padding(0.25);
    const xAxisG = g.append("g").attr("class", "axis").attr("transform", `translate(0,${innerH})`);
    const yAxisG = g.append("g").attr("class", "axis axis-y");
    const xLabel = g.append("text").attr("class", "axis-label")
      .attr("x", innerW / 2).attr("y", innerH + 42).attr("text-anchor", "middle");

    function update(measureKey) {
      const m = cfg.measures[measureKey];
      const rows = cfg.sort === false
        ? cfg.data
        : [...cfg.data].sort((a, b) => d3.descending(a[m.key], b[m.key]));

      x.domain([0, d3.max(cfg.data, d => d[m.key])]).nice();
      y.domain(rows.map(d => d[cfg.nameKey]));

      xAxisG.transition().duration(duration).call(d3.axisBottom(x).ticks(5).tickFormat(m.axisFormat));
      yAxisG.transition().duration(duration)
        .call(d3.axisLeft(y).tickSize(0).tickPadding(8).tickFormat(cfg.nameLabel || (n => n)));
      xLabel.text(m.label);

      const bars = g.selectAll(".bar").data(rows, d => d[cfg.nameKey])
        .join("rect").attr("class", "bar")
        .attr("x", 0)
        .attr("fill", d => (cfg.highlight && cfg.highlight(d)) ? "var(--caveat)" : "var(--line)");
      addTooltip(bars, cfg.tooltipHtml, d => cfg.tooltipText(d));
      bars.transition().duration(duration)
        .attr("y", d => y(d[cfg.nameKey]))
        .attr("height", y.bandwidth())
        .attr("width", d => x(d[m.key]));

      g.selectAll(".value").data(rows, d => d[cfg.nameKey])
        .join("text").attr("class", "value")
        .transition().duration(duration)
        .attr("x", d => x(d[m.key]) + 6)
        .attr("y", d => y(d[cfg.nameKey]) + y.bandwidth() / 2)
        .attr("dy", "0.35em")
        .text(d => m.format(d[m.key]));
    }

    update(cfg.initial);
    setupToggle(cfg.toggleSelector, update);
  }

  return { fmtInt, fmt1, duration, createSvg, addTooltip, setupToggle, switchableBarChart };
})();

// Shared helpers used by every chart (loaded before the chart files).
// Keeping these in one place avoids repeating the same code five times.

const DV = (() => {
  const tooltip = d3.select("#tooltip");
  const fmtInt = d3.format(",");
  const fmt1 = d3.format(",.1f");
  let pinnedTooltipTarget = null;

  // Respect users who ask their operating system for reduced motion.
  const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 600;

  // Create a labeled SVG group, not an image, so its focusable data marks remain available to assistive technology.
  function createSvg(selector, width, height, margin, ariaLabel) {
    const svg = d3.select(selector).append("svg")
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("role", "group")
      .attr("aria-label", ariaLabel);
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
    return {
      svg, g,
      innerW: width - margin.left - margin.right,
      innerH: height - margin.top - margin.bottom
    };
  }

  // Generate a semantic, visually hidden table for every chart's plotted data.
  function addDataTable(selector, caption, columns, rows) {
    const container = d3.select(selector);
    if (container.empty()) throw new Error(`Chart container not found: ${selector}`);
    container.selectAll(".chart-data-table, .chart-keyboard-hint").remove();

    const hintId = `${container.attr("id")}-keyboard-help`;
    const svg = container.select("svg");
    if (!svg.empty()) svg.attr("aria-describedby", hintId);
    container.append("p").attr("id", hintId).attr("class", "sr-only chart-keyboard-hint")
      .text("Chart keyboard navigation: focus a data mark, then use the arrow keys to move to the nearest mark. Use Tab to leave the chart.");

    const table = container.append("table")
      .attr("class", "sr-only chart-data-table")
      .attr("aria-label", caption);
    table.append("caption").text(caption);
    table.append("thead").append("tr").selectAll("th")
      .data(columns).join("th")
      .attr("scope", "col")
      .text(column => column.label);

    const bodyRows = table.append("tbody").selectAll("tr").data(rows).join("tr");
    bodyRows.each(function (row) {
      const cells = columns.map((column, index) => ({ column, row, index }));
      d3.select(this).selectAll("th, td").data(cells)
        .join(enter => enter.append(cell => document.createElement(
          cell.index === 0 ? "th" : "td"
        )))
        .attr("scope", cell => cell.index === 0 ? "row" : null)
        .text(cell => {
          const value = typeof cell.column.value === "function"
            ? cell.column.value(cell.row)
            : cell.row[cell.column.key];
          return value == null ? "" : value;
        });
    });
  }

  // Let users move focus spatially between chart marks with the four arrow keys.
  // One mark per selection is tabbable; arrows move to the nearest mark in that direction.
  function enableArrowNavigation(selection) {
    const nodes = selection.nodes();
    if (!nodes.length) return selection;

    nodes.forEach((node, index) => {
      d3.select(node)
        .attr("tabindex", index === 0 ? 0 : -1)
        .attr("aria-keyshortcuts", "ArrowUp ArrowDown ArrowLeft ArrowRight");
    });
    selection.on("keydown.arrow-navigation", function (event) {
      const directions = {
        ArrowUp: { axis: "y", sign: -1 },
        ArrowDown: { axis: "y", sign: 1 },
        ArrowLeft: { axis: "x", sign: -1 },
        ArrowRight: { axis: "x", sign: 1 }
      };
      const direction = directions[event.key];
      if (!direction) return;

      const currentBox = this.getBoundingClientRect();
      const current = {
        x: currentBox.left + currentBox.width / 2,
        y: currentBox.top + currentBox.height / 2
      };
      const candidates = selection.nodes().filter(node => node !== this && node.isConnected)
        .map(node => {
          const box = node.getBoundingClientRect();
          return {
            node,
            x: box.left + box.width / 2,
            y: box.top + box.height / 2
          };
        })
        .filter(point => (point[direction.axis] - current[direction.axis]) * direction.sign > 0)
        .sort((a, b) => {
          const primary = Math.abs(a[direction.axis] - current[direction.axis]) -
            Math.abs(b[direction.axis] - current[direction.axis]);
          const secondaryAxis = direction.axis === "x" ? "y" : "x";
          return primary || Math.abs(a[secondaryAxis] - current[secondaryAxis]) -
            Math.abs(b[secondaryAxis] - current[secondaryAxis]);
        });

      if (candidates.length) {
        event.preventDefault();
        selection.attr("tabindex", -1);
        d3.select(candidates[0].node).attr("tabindex", 0).node().focus();
      }
    });
    return selection;
  }

  // Write concise interaction feedback to the shared polite live region.
  function announce(message) {
    const status = d3.select("#chart-status");
    if (!status.empty()) status.text(message);
  }

  // Place tooltip content beside its target and clamp it to the visible viewport.
  function showTooltip(event, d, htmlFn, pinToTarget) {
    const target = event.currentTarget;
    if (!pinToTarget && pinnedTooltipTarget && pinnedTooltipTarget !== target) {
      pinnedTooltipTarget = null;
    }
    tooltip.attr("hidden", null).html(htmlFn(d));
    const targetBox = target.getBoundingClientRect();
    const tooltipBox = tooltip.node().getBoundingClientRect();
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = window.innerHeight;
    const left = Math.min(
      Math.max(8, targetBox.left + targetBox.width / 2 - tooltipBox.width / 2),
      Math.max(8, viewportWidth - tooltipBox.width - 8)
    );
    let top = targetBox.top - tooltipBox.height - 12;
    if (top < 8) top = targetBox.bottom + 12;
    top = Math.min(Math.max(8, top), Math.max(8, viewportHeight - tooltipBox.height - 8));
    tooltip.style("left", `${left}px`).style("top", `${top}px`);
    if (pinToTarget) pinnedTooltipTarget = target;
  }

  // Hide transient hover/focus tooltips, but leave a touch-pinned tooltip open.
  function hideTooltip() {
    if (!pinnedTooltipTarget) tooltip.attr("hidden", true);
  }

  // Touch users can dismiss a pinned tooltip by tapping anywhere outside its target.
  document.addEventListener("pointerdown", event => {
    if (pinnedTooltipTarget &&
        !pinnedTooltipTarget.contains(event.target) &&
        !tooltip.node().contains(event.target)) {
      pinnedTooltipTarget = null;
      tooltip.attr("hidden", true);
    }
  });

  // Tooltips work on hover and keyboard focus; touch taps pin them until another tap.
  // htmlFn builds the tooltip content; textFn gives a plain-text label for screen readers.
  function addTooltip(selection, htmlFn, textFn) {
    selection
      .attr("tabindex", 0)
      .attr("aria-label", d => textFn(d))
      .on("mouseenter.tooltip focus.tooltip", (event, d) => {
        showTooltip(event, d, htmlFn, false);
      })
      .on("pointerup.tooltip", (event, d) => {
        if (event.pointerType !== "mouse") {
          if (pinnedTooltipTarget === event.currentTarget) {
            pinnedTooltipTarget = null;
            tooltip.attr("hidden", true);
          } else {
            showTooltip(event, d, htmlFn, true);
          }
        }
      })
      .on("mouseleave.tooltip blur.tooltip", hideTooltip);
  }

  // Button group that behaves like a switch. Calls onChange(value) when clicked.
  function setupToggle(groupSelector, onChange) {
    const buttons = d3.selectAll(`${groupSelector} button`);
    const group = document.querySelector(groupSelector);
    buttons.on("click", function () {
      buttons.attr("aria-pressed", "false");
      d3.select(this).attr("aria-pressed", "true");
      onChange(this.dataset.value);
      const groupLabel = group ? group.getAttribute("aria-label") : "Chart control";
      announce(`${groupLabel}: ${this.textContent.trim()}`);
    });
  }

  // Add play/pause and stop controls to every question card using the browser speech engine.
  function setupNarrationControls() {
    const speech = window.speechSynthesis;
    const SpeechUtterance = window.SpeechSynthesisUtterance;
    const supported = Boolean(speech && typeof SpeechUtterance === "function");
    let activeUtterance = null;
    let activeControls = null;

    // Build a short spoken summary from the heading, chart descriptions, current KPI, and notes.
    function buildSummary(card) {
      const heading = card.querySelector("h2");
      const parts = [heading ? heading.textContent.trim() : ""];
      card.querySelectorAll(".chart svg[aria-label]").forEach(svg => {
        parts.push(svg.getAttribute("aria-label"));
      });
      card.querySelectorAll(".q1-summary, .note").forEach(element => {
        if (element.textContent.trim()) parts.push(element.textContent.trim());
      });
      return parts.filter(Boolean).join(" ");
    }

    // Keep the main button label and stop button availability synchronized with speech state.
    function setNarrationState(controls, state) {
      const labels = {
        idle: "Listen to Summary",
        speaking: "Pause Summary",
        paused: "Resume Summary"
      };
      controls.play.textContent = labels[state];
      controls.play.setAttribute("aria-label", `${labels[state]} for ${controls.title}`);
      controls.play.setAttribute("aria-pressed", String(state !== "idle"));
      controls.stop.disabled = state === "idle";
    }

    // Finish the active utterance and restore its controls if it has not been superseded.
    function finishNarration(utterance, message) {
      if (activeUtterance !== utterance) return;
      const controls = activeControls;
      activeUtterance = null;
      activeControls = null;
      setNarrationState(controls, "idle");
      announce(message);
    }

    // Start narration, or pause/resume it when its own card is already active.
    function toggleNarration(card, controls) {
      if (!supported) {
        announce("Audio narration is not supported in this browser.");
        return;
      }
      if (activeControls === controls && activeUtterance) {
        if (speech.paused) {
          speech.resume();
          setNarrationState(controls, "speaking");
          announce(`${controls.title} summary resumed.`);
        } else {
          speech.pause();
          setNarrationState(controls, "paused");
          announce(`${controls.title} summary paused.`);
        }
        return;
      }

      if (activeUtterance) {
        const previousControls = activeControls;
        activeUtterance = null;
        activeControls = null;
        speech.cancel();
        setNarrationState(previousControls, "idle");
      }

      const text = buildSummary(card);
      if (!text) {
        announce(`${controls.title} summary is unavailable.`);
        return;
      }
      const utterance = new SpeechUtterance(text);
      activeUtterance = utterance;
      activeControls = controls;
      utterance.onend = () => finishNarration(utterance, `${controls.title} summary finished.`);
      utterance.onerror = event => {
        console.error("Speech synthesis failed:", event.error);
        finishNarration(utterance, `Audio narration failed: ${event.error}.`);
      };
      speech.speak(utterance);
      setNarrationState(controls, "speaking");
      announce(`${controls.title} summary started.`);
    }

    // Stop only the utterance owned by this card and return its controls to the idle state.
    function stopNarration(controls) {
      if (activeControls !== controls || !activeUtterance) return;
      activeUtterance = null;
      activeControls = null;
      speech.cancel();
      setNarrationState(controls, "idle");
      announce(`${controls.title} summary stopped.`);
    }

    document.querySelectorAll(".question-card").forEach(card => {
      const heading = card.querySelector("h2");
      if (!heading) return;
      const title = heading.textContent.trim();
      const group = document.createElement("div");
      group.className = "narration-controls";
      group.setAttribute("role", "group");
      group.setAttribute("aria-label", `Narration controls for ${title}`);
      const play = document.createElement("button");
      play.type = "button";
      play.textContent = "Listen to Summary";
      play.setAttribute("aria-pressed", "false");
      const stop = document.createElement("button");
      stop.type = "button";
      stop.textContent = "Stop";
      stop.setAttribute("aria-label", `Stop summary for ${title}`);
      stop.disabled = true;
      group.append(play, stop);
      heading.insertAdjacentElement("afterend", group);
      const controls = { title, play, stop };

      if (!supported) {
        play.disabled = true;
        play.setAttribute("aria-label", `Audio narration unavailable for ${title}`);
        return;
      }
      play.setAttribute("aria-label", `Listen to Summary for ${title}`);
      play.addEventListener("click", () => toggleNarration(card, controls));
      stop.addEventListener("click", () => stopNarration(controls));
    });
  }

  // Calculate a population-weighted rate per 100,000 for a set of count/population rows.
  function weightedRate(rows, countKey, populationKey) {
    const population = d3.sum(rows, d => d[populationKey]);
    if (!population) throw new Error("Cannot calculate a weighted rate without population data.");
    return d3.sum(rows, d => d[countKey]) / population * 100000;
  }

  // Horizontal bar chart that can switch between two measures (e.g. count vs rate)
  // and optionally re-sort, so users can see how the ranking changes. A reference line
  // can be configured for one measure (for example the national average on rate views).
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
    const referenceLine = g.append("line").attr("class", "reference-line").style("opacity", 0);
    const referenceLabel = g.append("text").attr("class", "reference-label")
      .attr("y", -2).style("opacity", 0);

    // Redraw the axes, bars, value labels, and optional benchmark for the active measure.
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
        .join(
          enter => enter.append("rect").attr("class", "bar")
            .attr("x", d => x(Math.min(0, d[m.key])))
            .attr("y", d => y(d[cfg.nameKey])).attr("height", y.bandwidth())
            .attr("width", 0).style("opacity", 0),
          update => update,
          exit => exit.transition().duration(duration).style("opacity", 0).remove()
        )
        .attr("fill", d => (cfg.highlight && cfg.highlight(d)) ? "var(--caveat)" : "var(--line)");
      addTooltip(bars, cfg.tooltipHtml, d => cfg.tooltipText(d));
      enableArrowNavigation(bars);
      bars.transition().duration(duration).delay(duration ? (d, i) => i * 30 : 0)
        .attr("y", d => y(d[cfg.nameKey]))
        .attr("height", y.bandwidth())
        .attr("x", d => x(Math.min(0, d[m.key])))
        .attr("width", d => Math.abs(x(d[m.key]) - x(0)))
        .style("opacity", 1);

      const values = g.selectAll(".value").data(rows, d => d[cfg.nameKey])
        .join(
          enter => enter.append("text").attr("class", "value").style("opacity", 0),
          update => update,
          exit => exit.transition().duration(duration).style("opacity", 0).remove()
        );
      values.transition().duration(duration).delay(duration ? (d, i) => i * 30 : 0)
        .attr("x", d => x(d[m.key]) + 6)
        .attr("y", d => y(d[cfg.nameKey]) + y.bandwidth() / 2)
        .attr("dy", "0.35em")
        .text(d => m.format(d[m.key]))
        .style("opacity", 1);

      const benchmark = cfg.referenceLine && cfg.referenceLine.measureKey === measureKey
        ? cfg.referenceLine
        : null;
      referenceLine.raise().interrupt().transition().duration(duration)
        .attr("x1", benchmark ? x(benchmark.value) : 0)
        .attr("x2", benchmark ? x(benchmark.value) : 0)
        .attr("y1", 0).attr("y2", innerH)
        .style("opacity", benchmark ? 1 : 0);
      referenceLabel.raise().interrupt().transition().duration(duration)
        .attr("x", benchmark
          ? x(benchmark.value) + (x(benchmark.value) > innerW - 150 ? -5 : 5)
          : 0)
        .attr("text-anchor", benchmark && x(benchmark.value) > innerW - 150 ? "end" : "start")
        .text(benchmark ? `${benchmark.label}: ${m.format(benchmark.value)}` : "")
        .style("opacity", benchmark ? 1 : 0);

      if (cfg.tableColumns) {
        const tableRows = [...rows];
        if (cfg.referenceLine) {
          const referenceRow = {
            [cfg.nameKey]: `${cfg.referenceLine.label} reference`
          };
          const referenceDataKey = cfg.measures[cfg.referenceLine.measureKey].key;
          referenceRow[referenceDataKey] = cfg.referenceLine.value;
          tableRows.push(referenceRow);
        }
        addDataTable(cfg.selector, cfg.tableCaption, cfg.tableColumns, tableRows);
      }
    }

    update(cfg.initial);
    setupToggle(cfg.toggleSelector, update);
  }

  return {
    fmtInt, fmt1, duration, createSvg, addDataTable, enableArrowNavigation,
    addTooltip, setupToggle, announce, setupNarrationControls, weightedRate, switchableBarChart
  };
})();

document.addEventListener("DOMContentLoaded", () => {
  DV.setupNarrationControls();
  const sections = document.querySelectorAll(".question-section");
  const navLinks = document.querySelectorAll(".nav-link");
  const progressBar = document.getElementById("scrollProgress");

  // 1. Highlight active section in navbar on scroll
  const observerOptions = {
    root: null,
    // Triggers when a section crosses the upper-middle portion of the viewport
    rootMargin: "-20% 0px -65% 0px",
    threshold: 0
  };

  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const currentId = entry.target.getAttribute("id");
        navLinks.forEach((link) => {
          link.classList.toggle(
            "active",
            link.getAttribute("href") === `#${currentId}`
          );
        });
      }
    });
  }, observerOptions);

  sections.forEach((section) => sectionObserver.observe(section));

  // 2. Update bottom progress bar
  window.addEventListener("scroll", () => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    if (progressBar) {
      progressBar.style.width = `${scrollPercent}%`;
    }
  }, { passive: true });
});
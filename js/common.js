// Shared helpers used by every chart (loaded before the chart files).
// Keeping these in one place avoids repeating the same code in each question file.

const DV = (() => {
  const tooltip = d3.select("#tooltip");
  const fmtInt = d3.format(",");
  const fmt1 = d3.format(",.1f");
  // Compact numbers for narrow screens, e.g. 13,026 -> "13.0k".
  const fmtCompact = v => (Math.abs(v) >= 10000 ? d3.format(".3s")(v) : fmtInt(v));
  let pinnedTooltipTarget = null;

  // Below this chart width, charts switch to their phone layout (labels above bars, fewer ticks).
  const NARROW = 560;

  // Respect users who ask their operating system for reduced motion.
  const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 600;

  // Pick dark or white text so labels on coloured shapes keep at least 4.5:1 contrast.
  function textOn(color) {
    return d3.lab(color).l > 58 ? "#102420" : "#ffffff";
  }

  // Draw a chart at the real width of its container and redraw it when that width changes.
  // draw(width, narrow) must build the whole SVG from the module's current state.
  function responsive(selector, draw) {
    const node = document.querySelector(selector);
    if (!node) throw new Error(`Chart container not found: ${selector}`);
    let lastWidth = 0;
    let timer = null;

    function render(force) {
      if (!node.clientWidth) return; // hidden containers are drawn when they become visible
      const style = getComputedStyle(node);
      const width = Math.max(260, Math.floor(
        node.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
      ));
      if (!force && Math.abs(width - lastWidth) < 8) return;
      lastWidth = width;
      d3.select(node).selectAll("svg").remove();
      draw(width, width < NARROW);
    }

    render(true);
    if ("ResizeObserver" in window) {
      new ResizeObserver(() => {
        clearTimeout(timer);
        timer = setTimeout(() => render(false), 150);
      }).observe(node);
    }
    return { redraw: () => render(true) };
  }

  // Create a labeled SVG group, not an image, so its focusable data marks remain available to assistive technology.
  function createSvg(selector, width, height, margin, ariaLabel) {
    const svg = d3.select(selector).insert("svg", ":first-child")
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("width", width)
      .attr("height", height)
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
          return { node, x: box.left + box.width / 2, y: box.top + box.height / 2 };
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
  // Marks get role="img" (unless they already have a role, e.g. "button") so their aria-label is announced.
  function addTooltip(selection, htmlFn, textFn) {
    selection
      .attr("role", function () { return this.getAttribute("role") || "img"; })
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
    buttons.on("click.toggle", function () {
      buttons.attr("aria-pressed", "false");
      d3.select(this).attr("aria-pressed", "true");
      onChange(this.dataset.value);
      const groupLabel = group ? group.getAttribute("aria-label") : "Chart control";
      announce(`${groupLabel}: ${this.textContent.trim()}`);
    });
  }

  // Fill a <select> with options; hide its filter bar when there is nothing to choose.
  function setupSelect(selectId, options, initial, onChange) {
    const select = document.getElementById(selectId);
    if (!select) return;
    const wrapper = select.closest(".filter-group") || select.parentElement;
    select.innerHTML = "";
    options.forEach(option => {
      const element = document.createElement("option");
      element.value = option.value;
      element.textContent = option.label;
      select.append(element);
    });
    select.value = String(initial);
    wrapper.hidden = options.length < 2;
    // Hide the whole control panel if nothing in it is left to show (e.g. only one year of data).
    const panel = select.closest(".controls");
    if (panel) {
      const visible = [...panel.children].some(child => child.classList.contains("filter-bar")
        ? [...child.children].some(item => !item.hidden)
        : !child.hidden);
      panel.hidden = !visible;
    }
    select.addEventListener("change", () => onChange(select.value));
  }

  // Optional multi-year CSVs are listed in data/manifest.json once they are exported from KNIME.
  // Unlisted files are not requested (so the console stays free of 404 errors) and the chart
  // falls back to its single-period file.
  const manifest = d3.json("data/manifest.json").catch(() => ({ optional: [] }));
  // `columns` lists the exact header names the chart needs. If a listed file is missing a column,
  // or a number column does not contain numbers, a clear warning is written to the browser console
  // (F12) and the chart falls back to its single-period file instead of showing blank or "NaN" values.
  function loadOptional(url, row, columns) {
    const file = url.split("/").pop();
    return manifest.then(m => {
      if (!(m.optional || []).includes(file)) return null;
      return d3.csv(url).then(raw => {
        const missing = (columns || []).filter(c => !raw.columns.includes(c));
        if (missing.length) {
          console.warn(`${file}: missing column(s) ${missing.join(", ")}. Found: ${raw.columns.join(", ")}. Using the single-period file instead.`);
          return null;
        }
        const rows = raw.map(row).filter(r => r != null); // a row function may return null to skip a row
        const bad = rows.find(r => Object.values(r).some(v => typeof v === "number" && Number.isNaN(v)));
        if (!rows.length || bad) {
          console.warn(`${file}: some values are not numbers (check the year and count columns). Using the single-period file instead.`);
          return null;
        }
        return rows;
      }).catch(error => {
        console.warn(`${file} could not be loaded (${error.message}). Using the single-period file instead.`);
        return null;
      });
    });
  }

  // Period choices for the year filters: all years, the consistent 2017–2021 period, then single years.
  function periodOptions(years) {
    const options = [];
    const first = d3.min(years);
    const last = d3.max(years);
    if (years.length > 1) options.push({ value: "all", label: `All years (${first}–${last})` });
    const consistent = d3.range(2017, 2022).every(y => years.includes(y));
    if (consistent && years.length > 5) options.push({ value: "2017-2021", label: "2017–2021 (consistent counting)" });
    years.forEach(y => options.push({ value: String(y), label: String(y) }));
    return options;
  }
  // The list of years a period value covers.
  function periodYears(value, years) {
    if (value === "all") return years;
    const range = /^(\d{4})-(\d{4})$/.exec(value);
    if (range) return years.filter(y => y >= +range[1] && y <= +range[2]);
    return [+value];
  }
  // Text for a period value, e.g. "2021", "2017–2021" or "2011–2021".
  function periodLabel(value, years) {
    const list = periodYears(value, years);
    return list.length > 1 ? `${d3.min(list)}–${d3.max(list)}` : String(list[0]);
  }

  // Note shown when a selected year or comparison crosses a reporting change.
  function reportingCaveat(years) {
    const min = d3.min(years);
    const max = d3.max(years);
    const notes = [];
    if (min < 2012 && max >= 2012) notes.push("Victoria’s 2012 counting change");
    if (min < 2017 && max >= 2017) notes.push("New South Wales’ 2017 counting change");
    if (notes.length) {
      return `Caution: this selection spans ${notes.join(" and ")}, so differences between years are partly due to counting, not real change. 2017–2021 is the first period counted the same way in every state.`;
    }
    if (max < 2017) {
      return "Note: before 2017, New South Wales also counted cases treated only in emergency departments, so these years are not directly comparable with 2017 onwards.";
    }
    return "";
  }

  // Add play/pause and stop controls to every question card using the browser speech engine.
  function setupNarrationControls() {
    const speech = window.speechSynthesis;
    const SpeechUtterance = window.SpeechSynthesisUtterance;
    const supported = Boolean(speech && typeof SpeechUtterance === "function");
    let activeUtterance = null;
    let activeControls = null;

    // Build a short spoken summary from the heading, visible chart descriptions, current KPI, and notes.
    function buildSummary(card) {
      const visible = element => !element.closest("[hidden]");
      const heading = card.querySelector("h2");
      const parts = [heading ? heading.textContent.trim() : ""];
      card.querySelectorAll(".chart svg[aria-label]").forEach(svg => {
        if (visible(svg)) parts.push(svg.getAttribute("aria-label"));
      });
      card.querySelectorAll(".q1-summary, .note").forEach(element => {
        if (visible(element) && element.textContent.trim()) parts.push(element.textContent.trim());
      });
      return parts.filter(Boolean).join(" ");
    }

    // Keep the main button label and stop button availability synchronized with speech state.
    function setNarrationState(controls, state) {
      const labels = { idle: "Listen to Summary", speaking: "Pause Summary", paused: "Resume Summary" };
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
      utterance.lang = "en-AU";
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

  // Link marks that share a data-key inside one section (e.g. a state's map tile and its bar),
  // so hovering or focusing one highlights the other: coordinated views.
  function linkHighlights(sectionSelector) {
    const section = document.querySelector(sectionSelector);
    if (!section) return;
    const set = key => section.querySelectorAll("[data-key]").forEach(el => {
      el.classList.toggle("is-linked", key !== null && el.getAttribute("data-key") === key);
    });
    const handler = event => {
      const target = event.target.closest && event.target.closest("[data-key]");
      set(target ? target.getAttribute("data-key") : null);
    };
    section.addEventListener("mouseover", handler);
    section.addEventListener("focusin", handler);
    section.addEventListener("mouseleave", () => set(null));
    section.addEventListener("focusout", event => {
      if (!section.contains(event.relatedTarget)) set(null);
    });
  }

  // Responsive horizontal bar chart that switches between two measures (e.g. count vs rate)
  // and optionally re-sorts, so users can see how the ranking changes. A reference line
  // can be shown for one measure. On narrow screens each label sits above its bar.
  // Used by Q4 (states) and Q5 (remoteness). Returns a controller for filters and toggles.
  function switchableBarChart(cfg) {
    let data = cfg.data;
    let measureKey = cfg.initial;
    let reference = cfg.referenceLine || null;
    let chart = null;

    function build(width, narrow) {
      const n = data.length;
      const rowH = 46;
      const margin = narrow
        ? { top: 24, right: 58, bottom: 48, left: 4 }
        : { top: 24, right: 70, bottom: 50, left: cfg.leftMargin || 120 };
      const height = narrow ? n * rowH + margin.top + margin.bottom : (cfg.height || 380);
      const { svg, g, innerW, innerH } = createSvg(cfg.selector, width, height, margin, "");

      const x = d3.scaleLinear().range([0, innerW]);
      const y = d3.scaleBand().range([0, innerH]).padding(narrow ? 0 : 0.25);
      const xAxisG = g.append("g").attr("class", "axis").attr("transform", `translate(0,${innerH})`);
      const yAxisG = g.append("g").attr("class", "axis axis-y");
      const xLabel = g.append("text").attr("class", "axis-label")
        .attr("x", innerW / 2).attr("y", innerH + 40).attr("text-anchor", "middle");
      const referenceLine = g.append("line").attr("class", "reference-line").style("opacity", 0);
      const referenceLabel = g.append("text").attr("class", "reference-label").attr("y", -10).style("opacity", 0);
      const nameLabel = cfg.nameLabel || (name => name);
      const barY = d => narrow ? y(d[cfg.nameKey]) + 20 : y(d[cfg.nameKey]);
      const barH = () => narrow ? 18 : y.bandwidth();

      // Redraw the axes, bars, value labels, and optional benchmark for the active measure.
      function update(animate) {
        const t = animate ? duration : 0;
        const m = cfg.measures[measureKey];
        const rows = cfg.sort === false
          ? data
          : [...data].sort((a, b) => d3.descending(a[m.key], b[m.key]));

        x.domain([0, d3.max(data, d => d[m.key])]).nice();
        y.domain(rows.map(d => d[cfg.nameKey]));
        svg.attr("aria-label", typeof cfg.ariaLabel === "function" ? cfg.ariaLabel(rows, measureKey) : cfg.ariaLabel);

        xAxisG.transition().duration(t).call(d3.axisBottom(x).ticks(narrow ? 3 : 5).tickFormat(m.axisFormat));
        if (narrow) {
          yAxisG.selectAll("*").remove();
          g.selectAll(".bar-label").data(rows, d => d[cfg.nameKey])
            .join("text").attr("class", "bar-label")
            .text(d => nameLabel(d[cfg.nameKey]))
            .transition().duration(t)
            .attr("x", 0).attr("y", d => y(d[cfg.nameKey]) + 14);
        } else {
          yAxisG.transition().duration(t)
            .call(d3.axisLeft(y).tickSize(0).tickPadding(8).tickFormat(nameLabel));
        }
        xLabel.text(m.label);

        const bars = g.selectAll(".bar").data(rows, d => d[cfg.nameKey])
          .join(
            enter => enter.append("rect").attr("class", "bar")
              .attr("x", 0).attr("y", barY).attr("height", barH()).attr("width", 0),
            update => update,
            exit => exit.transition().duration(t).style("opacity", 0).remove()
          )
          .attr("data-key", d => d[cfg.nameKey])
          .classed("bar-caveat", d => Boolean(cfg.highlight && cfg.highlight(d)))
          .attr("fill", d => (cfg.highlight && cfg.highlight(d)) ? "var(--caveat)" : "var(--line)");
        addTooltip(bars, cfg.tooltipHtml, d => cfg.tooltipText(d));
        enableArrowNavigation(bars);
        bars.transition().duration(t).delay(t ? (d, i) => i * 30 : 0)
          .attr("y", barY).attr("height", barH())
          .attr("x", 0)
          .attr("width", d => Math.max(0, x(d[m.key])))
          .style("opacity", 1);

        g.selectAll(".value").data(rows, d => d[cfg.nameKey])
          .join("text").attr("class", "value")
          .transition().duration(t).delay(t ? (d, i) => i * 30 : 0)
          .attr("x", d => x(d[m.key]) + 6)
          .attr("y", d => barY(d) + barH() / 2)
          .attr("dy", "0.35em")
          .text(d => narrow ? (m.compactFormat || m.format)(d[m.key]) : m.format(d[m.key]));

        const benchmark = reference && reference.measureKey === measureKey ? reference : null;
        const refX = benchmark ? x(benchmark.value) : 0;
        referenceLine.raise().interrupt().transition().duration(t)
          .attr("x1", refX).attr("x2", refX).attr("y1", -4).attr("y2", innerH)
          .style("opacity", benchmark ? 1 : 0);
        referenceLabel.raise().interrupt().transition().duration(t)
          .attr("x", refX > innerW * 0.6 ? refX - 5 : refX + 5)
          .attr("text-anchor", refX > innerW * 0.6 ? "end" : "start")
          .text(benchmark ? `${benchmark.label}: ${m.format(benchmark.value)}` : "")
          .style("opacity", benchmark ? 1 : 0);

        if (cfg.tableColumns) {
          const tableRows = [...rows];
          if (reference) {
            const referenceRow = { [cfg.nameKey]: `${reference.label} (reference)` };
            referenceRow[cfg.measures[reference.measureKey].key] = reference.value;
            tableRows.push(referenceRow);
          }
          addDataTable(cfg.selector, typeof cfg.tableCaption === "function" ? cfg.tableCaption() : cfg.tableCaption,
            cfg.tableColumns, tableRows);
        }
      }
      return { update };
    }

    responsive(cfg.selector, (width, narrow) => {
      chart = build(width, narrow);
      chart.update(false);
    });
    if (cfg.toggleSelector) {
      setupToggle(cfg.toggleSelector, key => {
        measureKey = key;
        if (chart) chart.update(true);
      });
    }

    return {
      setMeasure(key) { measureKey = key; if (chart) chart.update(true); },
      setData(rows, newReference) {
        data = rows;
        if (newReference) reference = newReference;
        if (chart) chart.update(true);
      },
      get measure() { return measureKey; }
    };
  }

  return {
    fmtInt, fmt1, fmtCompact, duration, NARROW, textOn, responsive, createSvg, addDataTable,
    enableArrowNavigation, addTooltip, setupToggle, setupSelect, loadOptional, reportingCaveat,
    periodOptions, periodYears, periodLabel,
    announce, setupNarrationControls, weightedRate, linkHighlights, switchableBarChart
  };
})();

document.addEventListener("DOMContentLoaded", () => {
  DV.setupNarrationControls();
  const sections = document.querySelectorAll(".question-section");
  const navLinks = document.querySelectorAll(".nav-link");
  const progressBar = document.getElementById("scrollProgress");

  // 1. Highlight the active section in the navbar on scroll.
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const currentId = entry.target.getAttribute("id");
        navLinks.forEach((link) => {
          const isActive = link.getAttribute("href") === `#${currentId}`;
          link.classList.toggle("active", isActive);
          if (isActive) link.setAttribute("aria-current", "true");
          else link.removeAttribute("aria-current");
        });
      }
    });
  }, { root: null, rootMargin: "-20% 0px -65% 0px", threshold: 0 });

  sections.forEach((section) => sectionObserver.observe(section));

  // 2. Update the reading progress bar.
  window.addEventListener("scroll", () => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    if (progressBar) progressBar.style.width = `${scrollPercent}%`;
  }, { passive: true });
});

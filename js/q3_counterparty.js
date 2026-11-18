// Q3 – What vulnerable road users collided with (motorcyclists, pedal cyclists, pedestrians)
// Data: data/q3_counterparty_by_year.csv (year, road_user, counterparty, hospitalisations) if exported,
//       otherwise data/q3_counterparty.csv (2017–2021 combined).
// Views: a Sankey flow diagram (road user -> counterparty) or 100% stacked bars.
// Interactions: legend highlighting, period filter, click a road user for the detailed breakdown.

(function () {
  // Display groups, in order, with Okabe–Ito colour-blind-safe colours.
  const groups = [
    { key: "Non-collision", color: "#E69F00", match: c => c === "Non-collision transport accident" },
    { key: "Car, pick-up truck or van", color: "#0072B2", match: c => c === "Car, pick-up truck or van" },
    { key: "Heavy vehicle or bus", color: "#CC79A7", match: c => c === "Heavy transport vehicle or bus" },
    { key: "Fixed or stationary object", color: "#009E73", match: c => c === "Fixed or stationary object" },
    { key: "Other parties", color: "#56B4E9", match: () => false },
    { key: "Unspecified", color: "#8C8C8C", match: c => c === "Other and unspecified transport accidents" }
  ];
  const groupOf = c => (groups.find(g => g.match(c)) || groups[4]).key;
  const color = d3.scaleOrdinal(groups.map(g => g.key), groups.map(g => g.color));
  const roads = ["Motorcyclist", "Pedal cyclist", "Pedestrian"];
  const state = { view: "flow", period: "combined", active: null, selectedRoad: null };

  const detailCard = d3.select("#q3-detail");
  const detailTitle = d3.select("#q3-detail-title");
  const detailTotal = d3.select("#q3-detail-total");

  Promise.all([
    DV.loadOptional("data/q3_counterparty_by_year.csv", d => ({
      year: +d.year, road: d.road_user, counterparty: d.counterparty, count: +d.hospitalisations
    }), ["year", "road_user", "counterparty", "hospitalisations"]),
    d3.csv("data/q3_counterparty.csv", d => ({
      year: null, road: d.road_user, counterparty: d.counterparty, count: +d.hospitalisations
    }))
  ]).then(([byYear, combined]) => {
    const hasYears = Boolean(byYear && byYear.length);
    const years = hasYears ? [...new Set(byYear.map(d => d.year))].sort(d3.ascending) : [];
    const periodLabel = () => state.period === "combined" ? "2017–2021 combined"
      : state.period === "all" ? `${d3.min(years)}–${d3.max(years)} combined` : state.period;
    const periodYears = () => state.period === "combined" ? d3.range(2017, 2022)
      : state.period === "all" ? years : [+state.period];

    // Raw rows for the selected period (combined = the 2017–2021 file, or 2017–2021 summed by year).
    function rawRows() {
      if (!hasYears) return combined;
      const span = periodYears();
      const filtered = byYear.filter(d => span.includes(d.year));
      return d3.flatRollup(filtered, v => d3.sum(v, d => d.count), d => d.road, d => d.counterparty)
        .map(([road, counterparty, count]) => ({ road, counterparty, count }));
    }

    // One summary row per road user: totals, group counts (_n) and group shares (%).
    function summaryRows(raw) {
      return roads.map(road => {
        const subset = raw.filter(d => d.road === road);
        const total = d3.sum(subset, d => d.count);
        const row = { road, total };
        groups.forEach(gr => {
          const count = d3.sum(subset.filter(d => groupOf(d.counterparty) === gr.key), d => d.count);
          row[gr.key] = total ? count / total * 100 : 0;
          row[`${gr.key}_n`] = count;
        });
        return row;
      });
    }

    function describe(rows) {
      const parts = rows.map(r => {
        const top = d3.greatest(groups, g => r[`${g.key}_n`]);
        return `${r.road}s: ${top.key.toLowerCase()} is largest at ${Math.round(r[top.key])}%`;
      });
      const kind = state.view === "flow" ? "Flow diagram" : "100 per cent stacked bar chart";
      return `${kind} of what motorcyclists, pedal cyclists and pedestrians collided with, ${periodLabel()}. ${parts.join("; ")}.`;
    }

    // Display the complete raw counterparty breakdown for one road user.
    function showBreakdown(road) {
      state.selectedRoad = road;
      const subset = rawRows().filter(d => d.road === road).sort((a, b) => d3.descending(a.count, b.count));
      const total = d3.sum(subset, d => d.count);
      detailTitle.text(`${road}: detailed breakdown`);
      detailTotal.text(`${DV.fmtInt(total)} hospitalisations, ${periodLabel()}`);
      d3.select("#q3-detail-rows").selectAll("tr").data(subset, d => d.counterparty).join("tr")
        .each(function (d) {
          d3.select(this).selectAll("td")
            .data([d.counterparty, DV.fmtInt(d.count), `${DV.fmt1(d.count / total * 100)}%`])
            .join("td").text(value => value);
        });
      detailCard.attr("hidden", null);
      applyHighlights();
      DV.announce(`${road} detailed breakdown shown.`);
    }

    function closeBreakdown() {
      state.selectedRoad = null;
      detailCard.attr("hidden", true);
      applyHighlights();
      DV.announce("Road-user breakdown closed.");
    }

    // Fade everything except the highlighted counterparty and/or the selected road user.
    function applyHighlights() {
      const svg = d3.select("#q3 svg");
      const on = (group, road) => (!state.active || group === state.active) && (!state.selectedRoad || road === state.selectedRoad);
      svg.selectAll(".seg").transition().duration(DV.duration).attr("opacity", d => on(d.key, d.road) ? 1 : 0.2);
      svg.selectAll(".seg-label").transition().duration(DV.duration).attr("opacity", d => on(d.key, d.road) ? 1 : 0.2);
      svg.selectAll(".sankey-link").transition().duration(DV.duration)
        .attr("stroke-opacity", d => on(d.target.id, d.source.id) ? 0.55 : 0.08);
    }

    function drawBars(width, narrow, rows) {
      const rowH = narrow ? 66 : 70;
      const margin = narrow ? { top: 10, right: 8, bottom: 40, left: 8 } : { top: 10, right: 20, bottom: 40, left: 120 };
      const height = roads.length * rowH + margin.top + margin.bottom;
      const { svg, g, innerW, innerH } = DV.createSvg("#q3", width, height, margin, describe(rows));
      const x = d3.scaleLinear().domain([0, 100]).range([0, innerW]);
      const y = d3.scaleBand().domain(roads).range([0, innerH]).padding(narrow ? 0 : 0.3);
      const barY = road => narrow ? y(road) + 24 : y(road);
      const barH = narrow ? 30 : y.bandwidth();

      g.append("g").attr("class", "axis").attr("transform", `translate(0,${innerH})`)
        .call(d3.axisBottom(x).ticks(narrow ? 4 : 5).tickFormat(d => `${d}%`));
      if (narrow) {
        g.selectAll(".bar-label").data(roads).join("text").attr("class", "bar-label")
          .attr("x", 0).attr("y", d => y(d) + 16).text(d => d);
      } else {
        g.append("g").attr("class", "axis axis-y").call(d3.axisLeft(y).tickSize(0).tickPadding(8));
      }

      const segData = rows.flatMap(row => {
        let start = 0;
        return groups.map(gr => {
          const d = { road: row.road, key: gr.key, share: row[gr.key], count: row[`${gr.key}_n`], total: row.total, x0: start };
          start += row[gr.key];
          d.x1 = start;
          return d;
        });
      });
      const segs = g.selectAll(".seg").data(segData).join("rect").attr("class", "seg")
        .attr("x", d => x(d.x0)).attr("width", d => Math.max(0, x(d.x1) - x(d.x0)))
        .attr("y", d => barY(d.road)).attr("height", barH)
        .attr("fill", d => color(d.key));
      DV.addTooltip(segs,
        d => `<strong>${d.road}</strong><br>${d.key}: ${DV.fmtInt(d.count)} of ${DV.fmtInt(d.total)} cases (${DV.fmt1(d.share)}%)<br><span class="tip-muted">Click for the full breakdown</span>`,
        d => `${d.road}, ${d.key}: ${DV.fmtInt(d.count)} cases, ${DV.fmt1(d.share)} per cent`);
      DV.enableArrowNavigation(segs);
      segs.on("click", (event, d) => showBreakdown(d.road))
        .on("keydown.open", (event, d) => {
          if (event.key === "Enter" || event.key === " ") { event.preventDefault(); showBreakdown(d.road); }
        });

      // Direct labels only where the segment is wide enough; text colour chosen for contrast.
      g.selectAll(".seg-label").data(segData).join("text").attr("class", "seg-label")
        .attr("x", d => x((d.x0 + d.x1) / 2)).attr("y", d => barY(d.road) + barH / 2)
        .attr("dy", "0.35em").attr("text-anchor", "middle")
        .attr("fill", d => DV.textOn(color(d.key)))
        .text(d => (x(d.x1) - x(d.x0)) >= 34 ? `${Math.round(d.share)}%` : "");
    }

    function drawFlow(width, narrow, raw, rows) {
      const margin = narrow ? { top: 22, right: 4, bottom: 10, left: 4 } : { top: 10, right: 210, bottom: 10, left: 120 };
      const height = narrow ? 520 : 420;
      const { svg, g, innerW, innerH } = DV.createSvg("#q3", width, height, margin, describe(rows));
      const order = new Map([...roads, ...groups.map(gr => gr.key)].map((k, i) => [k, i]));

      const nodes = [...roads.map(id => ({ id, side: "road" })), ...groups.map(gr => ({ id: gr.key, side: "group" }))];
      const links = [];
      rows.forEach(row => groups.forEach(gr => {
        if (row[`${gr.key}_n`] > 0) links.push({ source: row.road, target: gr.key, value: row[`${gr.key}_n`], share: row[gr.key], total: row.total });
      }));
      const usedNodes = nodes.filter(n => links.some(l => l.source === n.id || l.target === n.id));

      const sankey = d3.sankey()
        .nodeId(d => d.id)
        .nodeWidth(narrow ? 12 : 16)
        .nodePadding(narrow ? 30 : 16)
        .nodeSort((a, b) => order.get(a.id) - order.get(b.id))
        .extent([[0, 0], [innerW, innerH]]);
      const graph = sankey({ nodes: usedNodes.map(d => ({ ...d })), links: links.map(d => ({ ...d })) });

      // Flows: width = number of hospitalisations; colour = counterparty group.
      const linkPaths = g.append("g").attr("fill", "none").selectAll("path").data(graph.links).join("path")
        .attr("class", "sankey-link")
        .attr("d", d3.sankeyLinkHorizontal())
        .attr("stroke", d => color(d.target.id))
        .attr("stroke-opacity", 0.55)
        .attr("stroke-width", d => Math.max(1.5, d.width));
      DV.addTooltip(linkPaths,
        d => `<strong>${d.source.id} → ${d.target.id}</strong><br>${DV.fmtInt(d.value)} hospitalisations<br>${DV.fmt1(d.share)}% of ${d.source.id.toLowerCase()} cases`,
        d => `${d.source.id} to ${d.target.id}: ${DV.fmtInt(d.value)} hospitalisations, ${DV.fmt1(d.share)} per cent of ${d.source.id} cases`);
      DV.enableArrowNavigation(linkPaths);

      const node = g.append("g").selectAll("rect").data(graph.nodes).join("rect")
        .attr("class", d => `sankey-node ${d.side === "road" ? "sankey-road" : ""}`)
        .attr("x", d => d.x0).attr("y", d => d.y0)
        .attr("width", d => d.x1 - d.x0).attr("height", d => Math.max(2, d.y1 - d.y0))
        .attr("fill", d => d.side === "road" ? "var(--line)" : color(d.id));
      // Road-user nodes are buttons that open the breakdown panel.
      const roadNodes = node.filter(d => d.side === "road").attr("role", "button");
      DV.addTooltip(roadNodes,
        d => `<strong>${d.id}</strong><br>${DV.fmtInt(d.value)} hospitalisations<br><span class="tip-muted">Click for the full breakdown</span>`,
        d => `${d.id}: ${DV.fmtInt(d.value)} hospitalisations. Press Enter for the detailed breakdown.`);
      DV.enableArrowNavigation(roadNodes);
      roadNodes.on("click", (event, d) => showBreakdown(d.id))
        .on("keydown.open", (event, d) => {
          if (event.key === "Enter" || event.key === " ") { event.preventDefault(); showBreakdown(d.id); }
        });

      // Labels sit outside the nodes on wide screens. On phones, road-user labels sit above their node
      // and counterparty labels sit just left of theirs; a white halo keeps them readable over the flows.
      g.append("g").selectAll("text").data(graph.nodes).join("text")
        .attr("class", d => d.side === "road" ? "sankey-label sankey-label-road" : "sankey-label")
        .classed("sankey-halo", narrow)
        .attr("x", d => d.side === "road" ? (narrow ? d.x0 : d.x0 - 8) : (narrow ? d.x0 - 6 : d.x1 + 8))
        .attr("y", d => narrow && d.side === "road" ? d.y0 - 6 : (d.y0 + d.y1) / 2)
        .attr("dy", d => narrow && d.side === "road" ? 0 : "0.35em")
        .attr("text-anchor", d => d.side === "road" ? (narrow ? "start" : "end") : (narrow ? "end" : "start"))
        .text(d => d.side === "road" ? `${d.id} (${DV.fmtCompact(d.value)})` : `${d.id} · ${DV.fmtCompact(d.value)}`);
    }

    function draw(width, narrow) {
      const raw = rawRows();
      const rows = summaryRows(raw);
      if (state.view === "flow") drawFlow(width, narrow, raw, rows);
      else drawBars(width, narrow, rows);

      const tableRows = rows.flatMap(row => groups.map(group => ({
        road: row.road, category: group.key, count: row[`${group.key}_n`], share: row[group.key]
      })));
      DV.addDataTable("#q3", `Hospitalisations by road user and counterparty group, ${periodLabel()}`, [
        { label: "Road user", key: "road" },
        { label: "Counterparty group", key: "category" },
        { label: "Hospitalisations", value: d => DV.fmtInt(d.count) },
        { label: "Share of road user's cases", value: d => `${DV.fmt1(d.share)}%` }
      ], tableRows);
      applyHighlights();
      if (state.selectedRoad) showBreakdown(state.selectedRoad);
    }

    // Clickable legend: highlight one counterparty in both views.
    const legend = d3.select("#q3-legend").selectAll("button").data(groups).join("button")
      .attr("type", "button").attr("aria-pressed", "false")
      .html(d => `<span class="swatch" style="background:${d.color}"></span>${d.key}`)
      .on("click", function (event, d) {
        state.active = state.active === d.key ? null : d.key;
        legend.attr("aria-pressed", gr => String(gr.key === state.active));
        applyHighlights();
        DV.announce(`Q3 counterparty highlight: ${state.active || "all groups"}.`);
      });
    d3.select("#q3-detail-close").on("click", closeBreakdown);

    const responsiveChart = DV.responsive("#q3", draw);
    DV.setupToggle("#q3-view", value => { state.view = value; responsiveChart.redraw(); });
    const periodOptions = [
      { value: "combined", label: "2017–2021 combined (consistent counting)" },
      ...(years.length ? [{ value: "all", label: `All years (${d3.min(years)}–${d3.max(years)}) combined` }] : []),
      ...years.map(y => ({ value: y, label: String(y) }))
    ];
    const caveat = document.getElementById("q3-caveat");
    const updateCaveat = () => { if (caveat) caveat.textContent = DV.reportingCaveat(periodYears()); };
    updateCaveat();
    DV.setupSelect("q3-period", periodOptions, "combined", value => {
      state.period = value;
      updateCaveat();
      responsiveChart.redraw();
      DV.announce(`Q3 period: ${periodLabel()}.`);
    });
  });
})();

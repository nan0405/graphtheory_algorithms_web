/* dijkstra.js (updated by assistant) */
// 🧠 Lưu danh sách các cạnh và node đã append (giữ nguyên màu xanh dương)
let persistedBlueEdges = new Set();
let persistedBlueNodes = new Set();
//bien kiem soat thoi gian thong bao
let notificationTimer = null;
/**
 * @param {string} message
 * @param {'success' | 'error'} type
 */

/* ------------- initial data (keeps same structure as before) ------------- */
let nodes = [
  {id: "a", x: 400, y: 100, _fixed: true},
  {id: "b", x: 250, y: 200, _fixed: true},
  {id: "c", x: 550, y: 200, _fixed: true},
  {id: "e", x: 250, y: 350, _fixed: true},
  {id: "d", x: 550, y: 350, _fixed: true},
  {id: "f", x: 400, y: 450, _fixed: true},
];

let links = [
  {source: "a", target: "b", weight: 42, id: "a-b"},
  {source: "a", target: "c", weight: 4, id: "a-c"},
  {source: "a", target: "d", weight: 10, id: "a-d"},
  {source: "b", target: "e", weight: 14, id: "b-e"},
  {source: "b", target: "f", weight: 3, id: "b-f"},
  {source: "c", target: "d", weight: 3, id: "c-d"},
  {source: "d", target: "e", weight: 1, id: "d-e"},
  {source: "e", target: "f", weight: 11, id: "e-f"},
  {source: "e", target: "a", weight: 9, id: "e-a"},
  {source: "d", target: "f", weight: 10, id: "d-f"},
];

/* ---------------- SVG + D3 simulation ---------------- */
const svg = d3.select("#graph");
const viewBox = svg.attr("viewBox").split(" ");
const width = +viewBox[2];
const height = +viewBox[3];

// Thêm marker mũi tên để hiển thị hướng di chuyển (dùng polygon riêng cho animation)
svg
  .append("defs")
  .append("marker")
  .attr("id", "arrow")
  .attr("viewBox", "0 -5 10 10")
  .attr("refX", 25)
  .attr("refY", 0)
  .attr("markerWidth", 6)
  .attr("markerHeight", 6)
  .attr("orient", "auto")
  .append("path")
  .attr("d", "M0,-5L10,0L0,5")
  .attr("fill", "#ffc107");

let simulation = d3
  .forceSimulation()
  .force(
    "link",
    d3
      .forceLink()
      .id((d) => d.id)
      .distance(110)
  )
  .force("charge", d3.forceManyBody().strength(-400))
  .force("center", d3.forceCenter(width / 2, height / 2))
  .force("collide", d3.forceCollide().radius(40))
  .force("x", d3.forceX(width / 2).strength(0.05))
  .force("y", d3.forceY(height / 2).strength(0.05));

let linkGroup = svg.append("g").attr("class", "links");
let nodeGroup = svg.append("g").attr("class", "nodes");
let labelGroup = svg.append("g").attr("class", "labels");
let weightGroup = svg.append("g").attr("class", "weights");

/* ---------------- state for animation/steps ---------------- */
let serverSteps = []; // steps returned from backend (array of StepDto)
let currentStepIndex = -1;
let running = false;
let stepTimer = null;
let consideringAnimationTimer = null; // interval nhấp nháy
const SERVER_BASE = "http://localhost:5196";
const PAGE_SIZE = 6;

/* ---------------- helpers ---------------- */
function getEndpoints(link) {
  const s = link.source && link.source.id ? link.source.id : link.source;
  const t = link.target && link.target.id ? link.target.id : link.target;
  return {s, t};
}
function ensureLinkIds() {
  links.forEach((l) => {
    const {s, t} = getEndpoints(l);
    if (!l.id) l.id = `${s}-${t}`;
  });
}
function normId(raw) {
  return raw ? raw.toString().trim().toLowerCase() : "";
}

/* ---------------- custom animation helpers ---------------- */

// hiệu ứng xuất hiện lần lượt từng cạnh sau khi đỉnh đã vẽ xong
function showEdgesGradually() {
  simulation.stop(); // đảm bảo không có tick

  const lines = linkGroup.selectAll("line");
  const weights = weightGroup.selectAll("text");

  // Ẩn tất cả cạnh lúc đầu
  lines
    .attr("x1", (d) => d.source.x)
    .attr("y1", (d) => d.source.y)
    .attr("x2", (d) => d.source.x)
    .attr("y2", (d) => d.source.y)
    .style("opacity", 0);

  // Vẽ lần lượt từng cạnh từ node nguồn → node đích
  lines.each(function (d, i) {
    const line = d3.select(this);
    const delay = i * 250;

    line
      .transition()
      .delay(delay)
      .duration(600)
      .style("opacity", 1)
      .attr("x2", d.target.x)
      .attr("y2", d.target.y)
      .ease(d3.easeLinear);
  });

  // Trọng số cạnh xuất hiện sau cùng
  weights
    .style("opacity", 0)
    .transition()
    .delay((d, i) => i * 250 + 600)
    .duration(300)
    .style("opacity", 1);
}

/* ---------------- custom animation helpers ---------------- */
function spawnNodes() {
  const centerX = width / 2;
  const centerY = height / 2;

  nodeGroup
    .selectAll("circle")
    .attr("cx", centerX)
    .attr("cy", centerY)
    .attr("r", 0)
    .transition()
    .delay((d, i) => i * 200)
    .duration(800)
    .attr("r", 20)
    .attr("cx", (d) => d.x)
    .attr("cy", (d) => d.y);

  labelGroup
    .selectAll("text")
    .attr("x", centerX)
    .attr("y", centerY)
    .style("opacity", 0)
    .transition()
    .delay((d, i) => i * 200 + 500)
    .duration(500)
    .style("opacity", 1)
    .attr("x", (d) => d.x)
    .attr("y", (d) => d.y);
}

function drawEdges() {
  linkGroup
    .selectAll("line")
    .attr("x2", (d) => d.source.x)
    .attr("y2", (d) => d.source.y)
    .attr("x1", (d) => d.source.x)
    .attr("y1", (d) => d.source.y)
    .transition()
    .delay((d, i) => i * 200)
    .duration(800)
    .attr("x2", (d) => d.target.x)
    .attr("y2", (d) => d.target.y);
}

function animateArrow(eid) {
  return new Promise((res) => {
    const line = d3.select(`#edge-${eid}`);
    if (line.empty()) return res();

    const pathNode = line.node();
    const length = pathNode.getTotalLength();

    // tạo (hoặc lấy lại) mũi tên
    let arrow = d3.select(`#arrow-${eid}`);
    if (arrow.empty()) {
      arrow = svg
        .append("polygon")
        .attr("id", `arrow-${eid}`)
        .attr("points", "0,0 10,5 0,10") // tam giác nhỏ
        .attr("fill", "#ffc107");
    }

    arrow.style("opacity", 1);

    // Di chuyển mũi tên từ đầu đến cuối
    arrow
      .transition()
      .duration(1000)
      .ease(d3.easeLinear)
      .attrTween("transform", function () {
        return function (t) {
          const p = pathNode.getPointAtLength(t * length);
          return `translate(${p.x},${p.y})`;
        };
      })
      .on("end", () => {
        arrow.style("opacity", 0);
        res();
      });

    setTimeout(res, 1200);
  });
}

function animateEdgeTraversal(eid) {
  return new Promise((res) => {
    const line = d3.select(`#edge-${eid}`);
    if (line.empty()) return res();
    line.transition().duration(800).attr("stroke-width", 4).on("end", res);
    setTimeout(res, 1000);
  });
}

/* ---------------- render / restart ---------------- */
function restart() {
  ensureLinkIds();

  // 🧹 Xóa toàn bộ cạnh và trọng số cũ để tránh mờ / opacity sai
  // 🧹 Reset cạnh và trọng số cũ để không bị mờ
  linkGroup.selectAll("line").remove();
  weightGroup.selectAll("text").remove();
  linkGroup.selectAll("line").style("opacity", 1);

  // LINKS
  const link = linkGroup.selectAll("line").data(links, (d) => d.id);

  // default for existing lines
  linkGroup
    .selectAll("line")
    .attr("stroke", "#999")
    .attr("stroke-width", 2)
    .style("opacity", 1);

  link.exit().remove();
  const linkEnter = link
    .enter()
    .append("line")
    .attr("stroke", "#999")
    .attr("stroke-width", 2)
    .attr("id", (d) => "edge-" + d.id)
    .style("cursor", "pointer");
  linkEnter.on("click", () => {});

  // WEIGHTS
  const wlabel = weightGroup.selectAll("text").data(links, (d) => d.id);
  wlabel.exit().remove();
  const wEnter = wlabel
    .enter()
    .append("text")
    .attr("class", "weight")
    .attr("data-edge", (d) => d.id)
    .attr("fill", "black")
    .attr("font-size", 12)
    .attr("text-anchor", "middle")
    .style("opacity", 0) // 🔸 ẩn trọng số ban đầu
    .text((d) => d.weight);
  wlabel.merge(wEnter).text((d) => d.weight);

  // NODES
  const node = nodeGroup.selectAll("circle").data(nodes, (d) => d.id);
  node.exit().remove();
  const nodeEnter = node
    .enter()
    .append("circle")
    .attr("r", 20)
    .attr("fill", "black")
    .attr("stroke", "#E6BE8A")
    .attr("stroke-width", 4)
    .attr("id", (d) => "node-" + d.id)
    .call(
      d3
        .drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended)
    );

  // LABELS
  const label = labelGroup.selectAll("text").data(nodes, (d) => d.id);
  label.exit().remove();
  const labelEnter = label
    .enter()
    .append("text")
    .attr("class", "label")
    .attr("fill", "white")
    .attr("font-size", 14)
    .attr("font-weight", "700")
    .attr("text-anchor", "middle")
    .attr("alignment-baseline", "middle")
    .style("cursor", "grab")
    .text((d) => d.id.toUpperCase())
    .call(
      d3
        .drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended)
    );

  // update simulation
  simulation.nodes(nodes);
  simulation.force("link").links(links);
  simulation.alpha(1).restart();

  simulation.on("tick", () => {
    linkGroup
      .selectAll("line")
      .attr("x1", (d) => d.source.x)
      .attr("y1", (d) => d.source.y)
      .attr("x2", (d) => d.target.x)
      .attr("y2", (d) => d.target.y);

    nodeGroup
      .selectAll("circle")
      .attr("cx", (d) => {
        if (d._fixed) {
          d.x = d.x0 ?? d.x;
          d.fx = d.x;
        }
        return d.x;
      })
      .attr("cy", (d) => {
        if (d._fixed) {
          d.y = d.y0 ?? d.y;
          d.fy = d.y;
        }
        return d.y;
      });

    labelGroup
      .selectAll("text")
      .attr("x", (d) => d.x)
      .attr("y", (d) => d.y);

    weightGroup
      .selectAll("text")
      .attr("x", (d) => (d.source.x + d.target.x) / 2)
      .attr("y", (d) => (d.source.y + d.target.y) / 2);
  });
  // Gọi hiệu ứng hiện cạnh sau khi đỉnh đã cố định
  setTimeout(showEdgesGradually, 500);

  // Sau khi restart layout xong, gọi hiệu ứng spawn
  setTimeout(() => {
    spawnNodes();
    setTimeout(drawEdges, nodes.length * 200 + 400);
  }, 400);

  simulation.on("end", () => {
    simulation.stop(); // ✨ Dừng mô phỏng sau khi bố trí xong
  });
}

/* ---------------- styling helpers ----------------- */
function resetStyles() {
  // edges & weights
  linkGroup.selectAll("line").attr("stroke", "#999").attr("stroke-width", 2);
  weightGroup.selectAll("text").attr("fill", "black").style("opacity", 1);
  nodeGroup
    .selectAll("circle")
    .attr("fill", "black")
    .attr("stroke", "#E6BE8A")
    .attr("stroke-width", 4);
}

/* ==================== applyStepVisuals (chuẩn Dijkstra theo màu bạn mô tả) ==================== */
async function applyStepVisuals(stepIndex) {
  if (!serverSteps || serverSteps.length === 0) return;
  const cur = serverSteps[stepIndex];
  if (!cur) return;

  // ==== Trạng thái toàn cục ====
  if (typeof persistedBlueEdges === "undefined") persistedBlueEdges = new Set();
  if (typeof persistedBlueNodes === "undefined") persistedBlueNodes = new Set();
  if (typeof lockedBlackEdges === "undefined") lockedBlackEdges = new Set();

  const pseudo = cur.Pseudo || "";
  const highlightEdges = (cur.Highlight?.Edges || []).map((e) =>
    e.toLowerCase()
  );
  const highlightNodes = (cur.Highlight?.Nodes || []).map((n) =>
    n.toLowerCase()
  );

  // 🗑 Reset cạnh bị loại bỏ
  if (cur.Highlight?.RemovedEdges) {
    for (const e of cur.Highlight.RemovedEdges) {
      linkGroup
        .selectAll("line")
        .filter((d) => sameEdge(d.id, e))
        .transition()
        .duration(300)
        .attr("stroke", "#999")
        .attr("stroke-width", 2);
      weightGroup
        .selectAll("text")
        .filter((d) => sameEdge(d.id, e))
        .transition()
        .duration(300)
        .attr("fill", "#999");
    }
  }

  // 🟡 Thêm vào H
  if (pseudo.includes("For e ∈ E") || pseudo.includes("thêm vào H")) {
    for (const e of highlightEdges) {
      const [a, b] = e.split("-");
      linkGroup
        .selectAll("line")
        .filter((d) => sameEdge(d.id, e))
        .attr("stroke", "#ffc107")
        .attr("stroke-width", 4);
      weightGroup
        .selectAll("text")
        .filter((d) => sameEdge(d.id, e))
        .attr("fill", "#ffc107");
      nodeGroup
        .selectAll("circle")
        .filter((d) => [a, b].includes(d.id.toLowerCase()))
        .attr("fill", "#ffc107")
        .attr("stroke", "#b28900");
    }
  }

  // 🔴 Xét cạnh hiện tại
  if (pseudo.includes("Xét cạnh (")) {
    for (const e of highlightEdges) {
      const [a, b] = e.split("-");
      linkGroup
        .selectAll("line")
        .filter((d) => sameEdge(d.id, e))
        .transition()
        .duration(200)
        .attr("stroke", "#e53935")
        .attr("stroke-width", 5);
      weightGroup
        .selectAll("text")
        .filter((d) => sameEdge(d.id, e))
        .transition()
        .duration(200)
        .attr("fill", "#e53935");
      nodeGroup
        .selectAll("circle")
        .filter((d) => d.id.toLowerCase() === b.toLowerCase())
        .transition()
        .duration(200)
        .attr("fill", "#e53935")
        .attr("stroke", "#b71c1c")
        .attr("stroke-width", 3);
    }
  }

  // 🟢 Khi cập nhật Dist[v]
  if (pseudo.includes("Dist[")) {
    for (const e of highlightEdges) {
      const [a, b] = e.split("-");
      linkGroup
        .selectAll("line")
        .filter((d) => sameEdge(d.id, e))
        .transition()
        .duration(350)
        .attr("stroke", "#00e676")
        .attr("stroke-width", 4);
      weightGroup
        .selectAll("text")
        .filter((d) => sameEdge(d.id, e))
        .transition()
        .duration(350)
        .attr("fill", "#00e676");
      nodeGroup
        .selectAll("circle")
        .filter((d) => d.id.toLowerCase() === b.toLowerCase())
        .transition()
        .duration(350)
        .attr("fill", "#00e676")
        .attr("stroke", "#00c853")
        .attr("stroke-width", 3);
    }
  }

  // ⚫ Không cập nhật Dist
  if (pseudo.includes("Không cập nhật")) {
    for (const e of highlightEdges) {
      const [a, b] = e.split("-");
      linkGroup
        .selectAll("line")
        .filter((d) => sameEdge(d.id, e))
        .transition()
        .duration(300)
        .attr("stroke", "#999")
        .attr("stroke-width", 2);
      weightGroup
        .selectAll("text")
        .filter((d) => sameEdge(d.id, e))
        .transition()
        .duration(300)
        .attr("fill", "#999");
      nodeGroup
        .selectAll("circle")
        .filter((d) => [a, b].includes(d.id.toLowerCase()))
        .transition()
        .duration(300)
        .attr("fill", "#999")
        .attr("stroke", "#777");
    }
  }

  // 💙 Append(T, …)
  if (pseudo.includes("Append(T")) {
    linkGroup.selectAll("line").each(function (d) {
      const id = d.id.toLowerCase();
      const color = d3.select(this).attr("stroke");
      if (
        !persistedBlueEdges.has(id) &&
        ["#ffc107", "#e53935", "#00e676"].includes(color)
      ) {
        d3.select(this)
          .transition()
          .duration(300)
          .attr("stroke", "#999")
          .attr("stroke-width", 2);
      }
    });
    weightGroup.selectAll("text").each(function (d) {
      const color = d3.select(this).attr("fill");
      if (["#ffc107", "#e53935", "#00e676"].includes(color)) {
        d3.select(this).transition().duration(300).attr("fill", "#999");
      }
    });
    nodeGroup.selectAll("circle").each(function (d) {
      const color = d3.select(this).attr("fill");
      if (["#ffc107", "#e53935", "#00e676"].includes(color)) {
        d3.select(this)
          .transition()
          .duration(300)
          .attr("fill", "#999")
          .attr("stroke", "#777");
      }
    });

    for (const e of highlightEdges) {
      const [a, b] = e.split("-");
      const id1 = e.toLowerCase(),
        id2 = `${b}-${a}`.toLowerCase();
      persistedBlueEdges.add(id1);
      persistedBlueEdges.add(id2);
      linkGroup
        .selectAll("line")
        .filter((d) => sameEdge(d.id, e))
        .transition()
        .duration(400)
        .attr("stroke", "#1565c0")
        .attr("stroke-width", 4);
      weightGroup
        .selectAll("text")
        .filter((d) => sameEdge(d.id, e))
        .transition()
        .duration(400)
        .attr("fill", "#1565c0");
      nodeGroup
        .selectAll("circle")
        .filter((d) => [a, b].includes(d.id.toLowerCase()))
        .each((d) => persistedBlueNodes.add(d.id.toLowerCase()))
        .transition()
        .duration(400)
        .attr("fill", "#1976d2")
        .attr("stroke", "#0d47a1")
        .attr("stroke-width", 3);
    }
  }

  // 🩶 Reset cạnh tạm
  // 🎬 KẾT THÚC DIJKSTRA → ẨN & HIỆN DẦN CÁC CẠNH/ĐỈNH ĐÃ DUYỆT
  if (pseudo.includes("Kết thúc Dijkstra")) {
    // 1️⃣ Ẩn toàn bộ
    linkGroup.selectAll("line").transition().duration(400).style("opacity", 0);
    weightGroup
      .selectAll("text")
      .transition()
      .duration(400)
      .style("opacity", 0);
    nodeGroup
      .selectAll("circle")
      .transition()
      .duration(400)
      .style("opacity", 0);

    // 2️⃣ Lấy danh sách đã chốt
    const edges = Array.from(persistedBlueEdges);
    const nodes = Array.from(persistedBlueNodes);

    // 3️⃣ Sau khi ẩn xong → hiện lại dần từng cạnh/đỉnh
    setTimeout(() => {
      edges.forEach((eid, i) => {
        const [a, b] = eid.split("-");
        setTimeout(() => {
          linkGroup
            .selectAll("line")
            .filter((d) => sameEdge(d.id, eid))
            .transition()
            .duration(200)
            .style("opacity", 1)
            .attr("stroke", "#1565c0")
            .attr("stroke-width", 4);
          weightGroup
            .selectAll("text")
            .filter((d) => sameEdge(d.id, eid))
            .transition()
            .duration(200)
            .style("opacity", 1)
            .attr("fill", "#1565c0");
          nodeGroup
            .selectAll("circle")
            .filter((d) => [a, b].includes(d.id.toLowerCase()))
            .transition()
            .duration(200)
            .style("opacity", 1)
            .attr("fill", "#1976d2")
            .attr("stroke", "#0d47a1")
            .attr("stroke-width", 3);
        }, i * 200);
      });

      // 4️⃣ tô nốt các đỉnh sau cùng
      setTimeout(() => {
        nodes.forEach((n) => {
          nodeGroup
            .selectAll("circle")
            .filter((d) => d.id.toLowerCase() === n.toLowerCase())
            .transition()
            .duration(600)
            .style("opacity", 1)
            .attr("fill", "#1976d2")
            .attr("stroke", "#0d47a1")
            .attr("stroke-width", 3);
        });
      }, edges.length * 800 + 500);
    }, 600);
  }

  // 🟦 Giữ nguyên màu xanh dương cho cạnh / node đã chốt
  linkGroup.selectAll("line").each(function (d) {
    const id = d.id.toLowerCase();
    if (
      persistedBlueEdges.has(id) ||
      persistedBlueEdges.has(id.split("-").reverse().join("-"))
    ) {
      d3.select(this).attr("stroke", "#1565c0").attr("stroke-width", 4);
    }
  });
  weightGroup.selectAll("text").each(function (d) {
    const id = d.id.toLowerCase();
    if (
      persistedBlueEdges.has(id) ||
      persistedBlueEdges.has(id.split("-").reverse().join("-"))
    ) {
      d3.select(this).attr("fill", "#1565c0");
    }
  });
  nodeGroup.selectAll("circle").each(function (d) {
    if (persistedBlueNodes.has(d.id.toLowerCase())) {
      d3.select(this)
        .attr("fill", "#1976d2")
        .attr("stroke", "#0d47a1")
        .attr("stroke-width", 3);
    }
  });
}

// Helper so sánh cạnh 2 chiều
function sameEdge(eid1, eid2) {
  const [a1, b1] = eid1.toLowerCase().split("-");
  const [a2, b2] = eid2.toLowerCase().split("-");
  return (a1 === a2 && b1 === b2) || (a1 === b2 && b1 === a2);
}

// --------------- play animation ---------------
function pause() {
  running = false;
  if (stepTimer) {
    clearTimeout(stepTimer);
    stepTimer = null;
  }
}

function prevStep() {
  pause();
  if (!serverSteps || serverSteps.length === 0) return;
  currentStepIndex = Math.max(0, currentStepIndex - 1);
  applyStepVisuals(currentStepIndex);
  renderStepsList();
}

/* ----------------- animation control ----------------- */
function stopAnimation() {
  running = false;
  if (stepTimer) {
    clearTimeout(stepTimer);
    stepTimer = null;
  }
  if (consideringAnimationTimer) {
    clearInterval(consideringAnimationTimer);
    consideringAnimationTimer = null;
  }
}

function play() {
  if (running) return;
  if (!serverSteps || serverSteps.length === 0) {
    runDijkstra().catch((err) => {
      console.error(err);
      alert("Không thể lấy steps: " + err.message);
    });
    return;
  }
  if (currentStepIndex >= serverSteps.length - 1) {
    currentStepIndex = -1;
    resetStyles();
  }
  running = true;
  stepNextLoop();
}

function getSpeechRate() {
    const speedVal = +document.getElementById("speed")?.value || 3;
    // Map slider value (1-5) sang rate (ví dụ: 0.6 chậm - 1.5 nhanh)
    return 0.4 + (speedVal - 1) * 0.225; 
}

/* ---------------- Speech Synthesis (Giọng nói) ---------------- */
function speakCurrentStep() {
    const cur = serverSteps[currentStepIndex];
    if (!cur) return;

    // SỬA: Nếu có VoiceUrl (sau khi sửa backend), dùng <audio>
    if (cur.VoiceUrl) {
        const audio = document.getElementById("audio");
        return new Promise((resolve) => {
            audio.onended = resolve;
            audio.onerror = resolve; // Đề phòng lỗi load
            audio.src = `${SERVER_BASE}${cur.VoiceUrl}`;
            audio.play().catch(e => {
                console.error("Audio playback failed:", e);
                resolve();
            });
        });
    }
    
    // Trường hợp Fallback dùng Web Speech API (Nếu file voice không tạo được)
    const textToSpeak = `Bước ${cur.Step}. ${cur.Pseudo}. ${cur.Explain}`;
    const utter = new SpeechSynthesisUtterance(textToSpeak);
    utter.lang = "vi-VN";
    utter.pitch = 1;
    utter.rate = getSpeechRate(); // SỬA LỖI: Dùng giá trị từ slider
    utter.volume = 1;

    // TRẢ VỀ PROMISE: Đợi giọng nói kết thúc
    return new Promise((resolve) => {
        utter.onend = () => {
            window.speechSynthesis.cancel();
            resolve();
        };
        utter.onerror = (e) => {
            console.error("SpeechSynthesis error:", e);
            window.speechSynthesis.cancel();
            resolve();
        };
        window.speechSynthesis.speak(utter);
    });
}

let voiceEnabled = true;
function toggleVoice() {
  voiceEnabled = !voiceEnabled;
  document.getElementById("toggleVoice").innerText = voiceEnabled
    ? "🔊 Voice: ON"
    : "🔇 Voice: OFF";
}

async function stepNextLoop() {
  if (!running) return;
  const speedVal = +document.getElementById("speed")?.value || 3;
  const duration = Math.max(500, Math.round(5000 / speedVal));
  if (stepTimer) {
    clearTimeout(stepTimer);
    stepTimer = null;
  }
  if (currentStepIndex < serverSteps.length - 1) {
    currentStepIndex++;
    await applyStepVisuals(currentStepIndex);
    renderStepsList(); 
    
    if (voiceEnabled) {
        // SỬA LỖI: Dùng 'await' để đợi speakCurrentStep() hoàn thành
        await speakCurrentStep(); 
    }

    stepTimer = setTimeout(() => {
      if (running) stepNextLoop();
    }, duration);
  } else {
    running = false;
    stepTimer = null;
  }
}

function pause() {
  running = false;
  if (stepTimer) {
    clearTimeout(stepTimer);
    stepTimer = null;
  }
  
  // SỬA LỖI: Dừng Web Speech API đang nói
  if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
  }

  // SỬA LỖI: Dừng Audio Element (nếu đã sửa backend)
  const audio = document.getElementById("audio");
  if (audio && !audio.paused) {
      audio.pause();
      audio.currentTime = 0;
  }
}


function prevStep() {
  pause();
  if (!serverSteps || serverSteps.length === 0) return;
  currentStepIndex = Math.max(0, currentStepIndex - 1);
  applyStepVisuals(currentStepIndex);
  renderStepsList();
}
function nextStep() {
  pause();
  if (!serverSteps || serverSteps.length === 0) return;
  currentStepIndex = Math.min(serverSteps.length - 1, currentStepIndex + 1);
  applyStepVisuals(currentStepIndex);
  renderStepsList();
  if (voiceEnabled) speakCurrentStep(); // ✅ thêm dòng này
}

/* ----------------- drag handlers ----------------- */
function dragstarted(event, d) {
  if (!event.active) simulation.alphaTarget(0.3).restart();
  d.fx = d.x;
  d.fy = d.y;
}

function dragged(event, d) {
  d.fx = event.x;
  d.fy = event.y;
}

function dragended(event, d) {
  if (!event.active) simulation.alphaTarget(0);
  d.fx = d.x; // Giữ node ở vị trí mới sau khi thả chuột
  d.fy = d.y;
}

/* ----------------- UI and graph functions (add/remove/reset/random) ----------------- */
function showCreate() {
  let form = document.getElementById("createForm");
  form.style.display = form.style.display === "none" ? "block" : "none";
}

function addNode() {
  let id = normId(document.getElementById("nodeName").value);
  if (!id) {
    showNotification("Vui lòng nhập tên node", "error");
    return;
  }
  if (nodes.find((n) => n.id === id)) {
    showNotification(`Node '${id}' đã tồn tại`, "error");
    return;
  }
  nodes.push({
    id: id,
    x: width / 2 + (Math.random() - 0.5) * 60,
    y: height / 2 + (Math.random() - 0.5) * 60,
  });
  restart();
  document.getElementById("nodeName").value = "";
  showNotification(`Đã thêm node '${id}'`, "success");
}
function removeNode() {
  let id = normId(document.getElementById("nodeName").value);
  if (!id) {
    showNotification("Nhập tên node để xóa", "error");
    return;
  }
  const idx = nodes.findIndex((n) => n.id === id);
  if (idx === -1) {
    showNotification("Node không tồn tại", "error");
    return;
  }
  nodes.splice(idx, 1);
  links = links.filter((l) => {
    const {s, t} = getEndpoints(l);
    return s !== id && t !== id;
  });
  restart();
  document.getElementById("nodeName").value = "";
  showNotification(`Đã xóa node '${id}'`, "success");
}

function addEdge() {
  const src = normId(document.getElementById("fromNode").value);
  const tgt = normId(document.getElementById("toNode").value);
  const wRaw = document.getElementById("edgeValue").value.trim();
  if (!src || !tgt) {
    showNotification("Nhập source và target", "error");
    return;
  }
  if (src === tgt) {
    showNotification("Không thể nối chính nó", "error");
    return;
  }
  if (!nodes.find((n) => n.id === src) || !nodes.find((n) => n.id === tgt)) {
    showNotification("Source/Target phải tồn tại", "error");
    return;
  }
  const existing = links.find((l) => {
    const {s, t} = getEndpoints(l);
    return (
      (s.toLowerCase() === src && t.toLowerCase() === tgt) ||
      (s.toLowerCase() === tgt && t.toLowerCase() === src)
    );
  });
  if (existing) {
    if (wRaw !== "") {
      const newW = Number(wRaw);
      const ok = confirm(
        `Cạnh ${existing.id} đã tồn tại. Thay trọng số ${existing.weight} → ${newW}?`
      );
      if (ok) {
        existing.weight = newW;
        restart();
      } else {
        showNotification("Cạnh giữ nguyên", "error");
      }
    } else {
      showNotification("Cạnh đã tồn tại.", "error");
    }
    return;
  }
  const weight = wRaw !== "" ? Number(wRaw) : 1;
  links.push({source: src, target: tgt, weight: weight, id: `${src}-${tgt}`});
  restart();
  showNotification(`Đã thêm cạnh ${newId}`, "success");
  document.getElementById("fromNode").value = "";
  document.getElementById("toNode").value = "";
  document.getElementById("edgeValue").value = "";
}
function removeEdge() {
  const src = normId(document.getElementById("fromNode").value);
  const tgt = normId(document.getElementById("toNode").value);
  if (!src || !tgt) {
    showNotification("Nhập source và target để xóa cạnh", "error");
    return;
  }
  const idx = links.findIndex((l) => {
    const {s, t} = getEndpoints(l);
    return (
      (s.toLowerCase() === src && t.toLowerCase() === tgt) ||
      (s.toLowerCase() === tgt && t.toLowerCase() === src)
    );
  });
  if (idx === -1) {
    showNotification("Cạnh không tồn tại", "error");
    return;
  }
  links.splice(idx, 1);
  restart();
  showNotification(`Đã xóa cạnh ${removedId}`, "success");
  document.getElementById("fromNode").value = "";
  document.getElementById("toNode").value = "";
}

/* ----------------- Reset graph về trạng thái ban đầu (6 node) ----------------- */
function resetGraph() {
  stopAnimation();
  serverSteps = [];
  currentStepIndex = -1;

  // Định nghĩa lại đúng 6 node ban đầu, có vị trí cố định
  nodes = [
    {id: "a", x: 400, y: 100, _fixed: true},
    {id: "b", x: 250, y: 200, _fixed: true},
    {id: "c", x: 550, y: 200, _fixed: true},
    {id: "e", x: 250, y: 350, _fixed: true},
    {id: "d", x: 550, y: 350, _fixed: true},
    {id: "f", x: 400, y: 450, _fixed: true},
  ];

  // Và đúng danh sách cạnh ban đầu
  links = [
    {source: "a", target: "b", weight: 42, id: "a-b"},
    {source: "a", target: "c", weight: 4, id: "a-c"},
    {source: "a", target: "d", weight: 10, id: "a-d"},
    {source: "b", target: "e", weight: 14, id: "b-e"},
    {source: "b", target: "f", weight: 3, id: "b-f"},
    {source: "c", target: "d", weight: 3, id: "c-d"},
    {source: "d", target: "e", weight: 1, id: "d-e"},
    {source: "e", target: "f", weight: 11, id: "e-f"},
    {source: "e", target: "a", weight: 9, id: "e-a"},
    {source: "d", target: "f", weight: 10, id: "d-f"},
  ];

  // Vẽ lại đồ thị như mới — có hiệu ứng xuất hiện từng node và từng cạnh
  renderStepsList();
  restart();
  resetStyles();

  // Thêm hiệu ứng xuất hiện node + cạnh từ từ
  setTimeout(() => {
    spawnNodes();
    setTimeout(showEdgesGradually, nodes.length * 250);
  }, 300);
}

/* ----------------- Random graph (5..12 nodes, at least 7 edges), positions preset ----------------- */
const PRESET_POSITIONS = [
  // 12 positions (sắp xếp vòng và 1-2 vị trí trung tâm) - tỉ lệ theo width/height
  [0.5, 0.12],
  [0.27, 0.25],
  [0.73, 0.25],
  [0.85, 0.45],
  [0.73, 0.65],
  [0.5, 0.82],
  [0.27, 0.65],
  [0.12, 0.45],
  [0.14, 0.25],
  [0.86, 0.25],
  [0.36, 0.45],
  [0.64, 0.45],
];

function randomGraph() {
  stopAnimation();
  const minN = 5,
    maxN = 12;
  const N = Math.floor(Math.random() * (maxN - minN + 1)) + minN;
  const letters = "abcdefghijklmnopqrstuvwxyz";
  nodes = [];
  links = [];

  // 🟢 1. Tạo vị trí node theo vòng tròn (1 hoặc 2 tầng)
  const centerX = width / 2;
  const centerY = height / 2;
  const radiusOuter = Math.min(width, height) * 0.38;
  const radiusInner = radiusOuter * 0.55;

  for (let i = 0; i < N; i++) {
    let r, angle;

    if (N <= 8) {
      // 1 vòng
      const angleStep = (2 * Math.PI) / N;
      r = radiusOuter;
      angle = i * angleStep - Math.PI / 2;
    } else {
      // 2 vòng: vòng ngoài 2/3, vòng trong 1/3
      const outerCount = Math.ceil(N * 0.65);
      const innerCount = N - outerCount;

      if (i < outerCount) {
        const angleStepOuter = (2 * Math.PI) / outerCount;
        r = radiusOuter;
        angle = i * angleStepOuter - Math.PI / 2;
      } else {
        const innerIndex = i - outerCount;
        const angleStepInner = (2 * Math.PI) / innerCount;
        r = radiusInner;
        angle = innerIndex * angleStepInner - Math.PI / 2 + angleStepInner / 2; // lệch pha nhẹ
      }
    }

    const x = centerX + r * Math.cos(angle);
    const y = centerY + r * Math.sin(angle);

    nodes.push({
      id: letters[i],
      x,
      y,
      _fixed: true,
    });
  }

  // 🟢 2. Tạo cây nối cơ bản để đảm bảo đồ thị liên thông
  let available = nodes.map((n) => n.id);
  let connected = [available.shift()];
  while (available.length > 0) {
    const a = connected[Math.floor(Math.random() * connected.length)];
    const idx = Math.floor(Math.random() * available.length);
    const b = available.splice(idx, 1)[0];
    const w = Math.floor(Math.random() * 20) + 1;
    links.push({source: a, target: b, weight: w, id: `${a}-${b}`});
    connected.push(b);
  }

  // 🟢 3. Đảm bảo mỗi node có ít nhất 2 cạnh
  function degreeOf(nodeId) {
    return links.filter((l) => {
      const s = typeof l.source === "object" ? l.source.id : l.source;
      const t = typeof l.target === "object" ? l.target.id : l.target;
      return s === nodeId || t === nodeId;
    }).length;
  }

  const maxAttempts = 500;
  let attempts = 0;
  while (attempts < maxAttempts) {
    attempts++;
    const nodeWithLowDegree = nodes.find((n) => degreeOf(n.id) < 2);
    if (!nodeWithLowDegree) break;

    const a = nodeWithLowDegree.id;
    const others = nodes.map((n) => n.id).filter((id) => id !== a);
    const b = others[Math.floor(Math.random() * others.length)];

    const id1 = `${a}-${b}`,
      id2 = `${b}-${a}`;
    if (!links.find((l) => l.id === id1 || l.id === id2)) {
      const w = Math.floor(Math.random() * 20) + 1;
      links.push({source: a, target: b, weight: w, id: id1});
    }
  }

  // 🟢 4. Giới hạn cạnh tối đa để không quá rối
  const maxEdges = Math.max(links.length, Math.floor(N * 2));
  while (links.length > maxEdges) links.pop();

  // 🟢 5. Làm mượt layout bằng lực đẩy nhẹ để cạnh không chồng
  simulation.force("charge").strength(-600);
  simulation.alpha(1).restart();
  setTimeout(() => simulation.stop(), 1200);

  serverSteps = [];
  currentStepIndex = -1;
  restart();
  resetStyles();
  renderStepsList();

  // 🌀 Hiệu ứng: vẽ node trước, rồi mới vẽ cạnh
  setTimeout(() => {
    // Bước 1: vẽ toàn bộ node (từng node một)
    spawnNodes();

    // Tính thời gian tổng khi node vẽ xong hết
    const totalNodeDuration = nodes.length * 250 + 600; // mỗi node ~250ms, + thêm buffer

    // Bước 2: sau khi node vẽ xong hoàn toàn -> mới vẽ cạnh
    setTimeout(() => {
      simulation.stop(); // dừng force để cạnh không bị nhảy
      showEdgesGradually();
    }, totalNodeDuration);
  }, 400);
}

/* ----------------- Steps UI ----------------- */
function renderStepsList() {
  const container = document.getElementById("steps");
  if (!container) return;

  container.innerHTML = "";
  if (!serverSteps || serverSteps.length === 0) return;

  const curStep = serverSteps[currentStepIndex] || serverSteps[0];
  const currentMain = curStep.Step.split(".")[0];

  // nhóm toàn bộ step của BƯỚC lớn hiện tại
  const groupSteps = serverSteps.filter(
    (s) => s.Step.startsWith(currentMain + ".") || s.Step === currentMain
  );

  // Tiêu đề nhóm
  const titleDiv = document.createElement("div");
  titleDiv.className = "step-title";
  titleDiv.style.fontWeight = "bold";
  titleDiv.style.color = "#FFD700";
  titleDiv.style.marginBottom = "8px";
  titleDiv.innerText =
    currentMain === "1"
      ? "BƯỚC 1: KHỞI TẠO TẬP HỢP ĐỈNH BAN ĐẦU"
      : `BƯỚC ${currentMain}: Xét các đỉnh trong tập đỉnh Q`;
  container.appendChild(titleDiv);

  // hiển thị toàn bộ step cho bước 1, còn các bước >= 2 thì hiển thị theo nhóm 4
  let displaySteps = groupSteps;
  if (parseInt(currentMain) > 1) {
    const indexInGroup = groupSteps.findIndex((s) => s === curStep);
    const groupIndex = Math.floor(indexInGroup / 4); // mỗi lô 4 step nhỏ
    const start = groupIndex * 4;
    const end = Math.min(start + 4, groupSteps.length);
    displaySteps = groupSteps.slice(start, end);
  }

  // hiển thị các step nhỏ hiện tại (tối đa 4)
  displaySteps.forEach((s) => {
    const div = document.createElement("div");
    div.className = "step-entry";
    div.style.margin = "10px";
    div.style.padding = "12px";
    div.style.background = s === curStep ? "#3e2d10" : "rgba(255,255,255,0.04)";
    div.style.borderRadius = "8px";
    div.style.cursor = "pointer";
    div.style.color = "#fff";
    div.innerText = `Step ${s.Step}: ${s.Pseudo}`;
    div.onclick = () => {
      stopAnimation();
      goToStep(serverSteps.indexOf(s));
    };
    container.appendChild(div);
  });
}

function goToStep(index) {
  if (!serverSteps || serverSteps.length === 0) return;
  currentStepIndex = Math.max(0, Math.min(index, serverSteps.length - 1));
  applyStepVisuals(currentStepIndex);
  renderStepsList();
}

/* ----------------- Backend integration ----------------- */
async function runDijkstra(startNode) {
  stopAnimation();
  serverSteps = [];
  currentStepIndex = -1;
  renderStepsList();
  const payload = {
    Nodes: nodes.map((n) => n.id),
    Edges: links.map((l) => {
      const {s, t} = getEndpoints(l);
      return {From: s, To: t, Weight: Number(l.weight)};
    }),
    Directed: false,
  };
  const createResp = await fetch(`${SERVER_BASE}/api/graphs`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(payload),
  });
  const createData = await createResp.json();
  const id = createData.id;
  const start =
    (startNode && String(startNode)) || (nodes.length ? nodes[0].id : "");
  const runResp = await fetch(
    `${SERVER_BASE}/api/graphs/${id}/teach?start=${start}`
  );
  if (!runResp.ok) throw new Error("Run graph failed: " + runResp.statusText);
  const runData = await runResp.json();
  serverSteps = runData.pages.flat();
  currentStepIndex = -1;
  renderStepsList();
  play();
}
function showNotification(message, type) {
  const notification = document.getElementById("notification");
  if (notificationTimer) {
    clearTimeout(notificationTimer);
  }
  notification.innerText = message;
  notification.className = "";
  notification.classList.add(type);
  notification.classList.add("show");
  notificationTimer = setTimeout(() => {
    notification.classList.remove("show");
    notificationTimer = null;
  }, 3000);
}

/* ----------------- expose globals ----------------- */
window.showCreate = showCreate;
window.addNode = addNode;
window.removeNode = removeNode;
window.addEdge = addEdge;
window.removeEdge = removeEdge;
window.resetGraph = resetGraph;
window.randomGraph = randomGraph;
window.play = play;
window.pause = pause;
window.prevStep = prevStep;
window.nextStep = nextStep;
window.runDijkstra = runDijkstra;

/* ----------------- kickoff ----------------- */
restart();
resetStyles();
renderStepsList();
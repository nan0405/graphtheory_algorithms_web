/**
 * ========================================
 * DIJKSTRA VISUALIZER - COMBINED VERSION
 * ========================================
 * Kết hợp:
 * - Chức năng nhận JSON từ dijkstra_sau.js
 * - Cách vẽ đồ thị D3.js từ dijkstra.js gốc
 * ========================================
 */

// ==================== GLOBAL STATE ====================
let persistedBlueEdges = new Set();
let persistedBlueNodes = new Set();
let algorithmData = null;
let serverSteps = [];
let currentStepIndex = -1;
let isPlaying = false;
let running = false;
let stepTimer = null;
let animationSpeed = 1000;

// Default graph from original dijkstra.js
let nodes = [
  { id: "a", x: 400, y: 0, _fixed: true },
  { id: "b", x: 175, y: 150, _fixed: true },
  { id: "c", x: 625, y: 150, _fixed: true },
  { id: "e", x: 175, y: 375, _fixed: true },
  { id: "d", x: 625, y: 375, _fixed: true },
  { id: "f", x: 400, y: 525, _fixed: true },
];

let links = [
  { source: "a", target: "b", weight: 42, id: "a-b" },
  { source: "a", target: "c", weight: 4, id: "a-c" },
  { source: "a", target: "d", weight: 10, id: "a-d" },
  { source: "b", target: "e", weight: 14, id: "b-e" },
  { source: "b", target: "f", weight: 3, id: "b-f" },
  { source: "c", target: "d", weight: 3, id: "c-d" },
  { source: "d", target: "e", weight: 1, id: "d-e" },
  { source: "e", target: "f", weight: 11, id: "e-f" },
  { source: "e", target: "a", weight: 9, id: "e-a" },
  { source: "d", target: "f", weight: 10, id: "d-f" },
  { source: "c", target: "f", weight: 5, id: "c-f" },
];

// ==================== D3.JS SETUP (FROM ORIGINAL) ====================
const svg = d3.select("#graph");
const viewBox = svg.attr("viewBox").split(" ");
const width = +viewBox[2];
const height = +viewBox[3];

// Arrow marker
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

// Force simulation
let simulation = d3
  .forceSimulation()
  .force(
    "link",
    d3.forceLink().id((d) => d.id).distance(110)
  )
  .force("charge", d3.forceManyBody().strength(-400))
  .force("center", d3.forceCenter(width / 2, height / 2))
  .force("collide", d3.forceCollide().radius(40))
  .force("x", d3.forceX(width / 2).strength(0.05))
  .force("y", d3.forceY(height / 2).strength(0.05));

// D3 Groups
let linkGroup = svg.append("g").attr("class", "links");
let nodeGroup = svg.append("g").attr("class", "nodes");
let labelGroup = svg.append("g").attr("class", "labels");
let weightGroup = svg.append("g").attr("class", "weights");

// ==================== JSON UPLOAD & PROCESSING ====================
function loadAlgorithmFromJSON(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const data = JSON.parse(e.target.result);
      processAlgorithmData(data);
    } catch (err) {
      console.error(err);
      showNotification("❌ Lỗi định dạng JSON!", "error");
    }
  };
  reader.readAsText(file);
}

function processAlgorithmData(data) {
  try {
    algorithmData = data;

    // Load steps for visualization
    if (data.steps && data.steps.length > 0) {
      serverSteps = data.steps;
      renderStepsList();
      currentStepIndex = -1;

      // Render pseudocode
      renderPseudocode(data.steps);

      showNotification(`✅ Tải thành công ${serverSteps.length} bước thuật toán!`, "success");

      // ========== GỬI JSON + START_NODE TỚI BACKEND ==========
      sendToBackend(data);

    } else {
      showNotification("⚠️ JSON không có steps!", "error");
    }

    // Optionally load graph from JSON
    if (data.graph && data.graph.nodes && data.graph.edges) {
      const userConfirm = confirm("JSON có chứa đồ thị. Bạn có muốn thay thế đồ thị hiện tại không?");
      if (userConfirm) {
        loadGraphFromJSON(data.graph);
      }
    }

  } catch (err) {
    console.error(err);
    showNotification("❌ Lỗi xử lý dữ liệu: " + err.message, "error");
  }
}

// ========== HÀM GỬI JSON TỚI BACKEND ==========
function sendToBackend(data) {
  // Lấy start_node từ input hoặc mặc định là 'a'
  const startNodeInput = document.getElementById("startNodeInput");
  const startNode = startNodeInput ? startNodeInput.value : "a";

  const endNodeInput = document.getElementById("endNodeInput");
  const endNode = endNodeInput ? endNodeInput.value : "";

  // Tạo request object
  const request = {
    name: data.algorithm?.name || "Custom Algorithm",
    description: data.algorithm?.description || "",
    pseudocode: data.steps?.map(step => ({
      line: step.pseudo || "",
      voice: step.voice || ""
    })) || [],
    graph: data.graph || null,
    start_node: startNode,
    end_node: endNode || null
  };

  console.log("📤 Gửi request tới backend:", request);

  // Gửi tới backend
  fetch("http://127.0.0.1:8000/api/parse-algorithm", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(request)
  })
    .then(response => response.json())
    .then(result => {
      console.log("📥 Backend response:", result);

      // Cập nhật steps từ backend (với biến đã thay thế)
      if (result.steps && result.steps.length > 0) {
        serverSteps = result.steps;
        renderStepsList();
        renderPseudocode(result.steps);
        showNotification("✅ Backend đã xử lý! Mã giả đã được cập nhật!", "success");
      }
    })
    .catch(error => {
      console.error("❌ Lỗi gửi tới backend:", error);
      showNotification("⚠️ Không thể kết nối backend (http://127.0.0.1:8000)", "error");
    });
}

function loadGraphFromJSON(graphData) {
  // Convert JSON nodes to D3 format
  nodes = graphData.nodes.map((n, idx) => ({
    id: n.toLowerCase(),
    x: (idx % 3) * 200 + 150,
    y: Math.floor(idx / 3) * 150 + 100,
    _fixed: true
  }));

  // Convert JSON edges to D3 format
  links = graphData.edges.map(e => {
    const fromNode = (e.from || e.from_node || '').toString().toLowerCase();
    const toNode = (e.to || '').toString().toLowerCase();

    if (!fromNode || !toNode) return null;

    return {
      id: `${fromNode}-${toNode}`,
      source: fromNode,
      target: toNode,
      weight: e.weight || ""
    };
  }).filter(e => e !== null);

  ensureLinkIds();
  restart();
  showNotification(`✅ Đã tải đồ thị với ${nodes.length} đỉnh và ${links.length} cạnh!`, "success");
}

function renderPseudocode(steps) {
  const pseudocodeContent = document.getElementById("pseudocode-content");
  if (!pseudocodeContent) return;

  pseudocodeContent.innerHTML = "";

  steps.forEach((step, idx) => {
    const line = document.createElement("span");
    line.className = "pseudo-line";
    line.setAttribute("data-step", idx);
    line.textContent = step.pseudo || step.step;
    pseudocodeContent.appendChild(line);
    pseudocodeContent.appendChild(document.createElement("br"));
  });
}

function renderStepsList() {
  const stepsArea = document.getElementById("dynamic-steps-area");
  if (!stepsArea) return;

  stepsArea.innerHTML = "";

  serverSteps.forEach((step, idx) => {
    const stepDiv = document.createElement("div");
    stepDiv.className = "step-card";
    stepDiv.setAttribute("data-step-index", idx);
    stepDiv.innerHTML = `
      <div class="step-number">${step.step || `Bước ${idx + 1}`}</div>
      <div class="step-explain">${step.explain || step.pseudo || ""}</div>
    `;
    stepDiv.onclick = () => jumpToStep(idx);
    stepsArea.appendChild(stepDiv);
  });
}

// ==================== GRAPH RENDERING (FROM ORIGINAL DIJKSTRA.JS) ====================
function restart() {
  linkGroup.selectAll("*").remove();
  nodeGroup.selectAll("*").remove();
  labelGroup.selectAll("*").remove();
  weightGroup.selectAll("*").remove();

  ensureLinkIds();

  // Draw links/edges
  linkGroup
    .selectAll("line")
    .data(links, (d) => d.id)
    .join("line")
    .attr("id", (d) => `edge-${d.id}`)
    .attr("stroke", "#999")
    .attr("stroke-width", 2)
    .attr("marker-end", "url(#arrow)");

  // Draw nodes
  nodeGroup
    .selectAll("circle")
    .data(nodes, (d) => d.id)
    .join("circle")
    .attr("id", (d) => `node-${d.id}`)
    .attr("r", 34)
    .attr("fill", "black")
    .attr("stroke", "#E6BE8A")
    .attr("stroke-width", 4)
    .call(
      d3
        .drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended)
    );

  // Draw weight labels
  weightGroup
    .selectAll("text")
    .data(links, (d) => d.id)
    .join("text")
    .attr("id", (d) => `weight-${d.id}`)
    .attr("class", "weight")
    .attr("fill", "#000")
    .attr("font-size", 18)
    .attr("text-anchor", "middle")
    .style("opacity", 1)
    .text((d) => d.weight);

  // Draw node labels
  labelGroup
    .selectAll("text")
    .data(nodes, (d) => d.id)
    .join("text")
    .attr("id", (d) => `label-${d.id}`)
    .attr("class", "label")
    .attr("fill", "white")
    .attr("font-size", 100)
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

  setTimeout(showEdgesGradually, 500);
  setTimeout(() => {
    spawnNodes();
    setTimeout(drawEdges, nodes.length * 200 + 400);
  }, 400);

  simulation.on("end", () => {
    simulation.stop();
  });
}

function showEdgesGradually() {
  simulation.stop();

  const lines = linkGroup.selectAll("line");
  const weights = weightGroup.selectAll("text");

  lines
    .attr("x1", (d) => d.source.x)
    .attr("y1", (d) => d.source.y)
    .attr("x2", (d) => d.source.x)
    .attr("y2", (d) => d.source.y)
    .style("opacity", 0);

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

  weights
    .style("opacity", 0)
    .transition()
    .delay((d, i) => i * 250 + 600)
    .duration(300)
    .style("opacity", 1);
}

function spawnNodes() {
  nodeGroup.selectAll("circle")
    .attr("cx", d => d.x)
    .attr("cy", d => d.y)
    .attr("r", 0)
    .transition()
    .delay((d, i) => i * 150)
    .duration(600)
    .ease(d3.easeBackOut)
    .attr("r", 34);

  labelGroup.selectAll("text")
    .attr("x", d => d.x)
    .attr("y", d => d.y)
    .style("opacity", 0)
    .transition()
    .delay((d, i) => i * 150 + 200)
    .duration(400)
    .style("opacity", 1);
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
  d.fx = d.x;
  d.fy = d.y;
}

function resetStyles() {
  linkGroup.selectAll("line").attr("stroke", "#999").attr("stroke-width", 2);
  weightGroup.selectAll("text").attr("fill", "black").style("opacity", 1);
  nodeGroup
    .selectAll("circle")
    .attr("fill", "black")
    .attr("stroke", "#E6BE8A")
    .attr("stroke-width", 6);
}

// ==================== GRAPH EDITING ====================
function showCreate() {
  const form = document.getElementById("createForm");
  form.style.display = form.style.display === "none" ? "block" : "none";
}

function addNode() {
  let id = normId(document.getElementById("nodeName").value);
  if (!id) {
    showNotification("Vui lòng nhập tên node", "error");
    return;
  }
  if (nodes.find((n) => n.id === id)) {
    showNotification("Node đã tồn tại", "error");
    return;
  }

  const centerX = width / 2;
  const centerY = height / 2;
  const x = centerX + Math.random() * 50 - 25;
  const y = centerY + Math.random() * 50 - 25;

  const newNode = { id, x, y, _fixed: true };
  nodes.push(newNode);

  nodeGroup
    .append("circle")
    .data([newNode])
    .attr("r", 0)
    .attr("fill", "black")
    .attr("stroke", "#E6BE8A")
    .attr("stroke-width", 4)
    .attr("id", "node-" + id)
    .attr("cx", centerX)
    .attr("cy", centerY)
    .call(
      d3
        .drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended)
    )
    .transition()
    .duration(800)
    .attr("r", 34)
    .attr("cx", x)
    .attr("cy", y);

  labelGroup
    .append("text")
    .data([newNode])
    .attr("class", "label")
    .attr("fill", "white")
    .attr("font-size", 100)
    .attr("font-weight", "700")
    .attr("text-anchor", "middle")
    .attr("alignment-baseline", "middle")
    .style("cursor", "grab")
    .text(id.toUpperCase())
    .attr("x", centerX)
    .attr("y", centerY)
    .call(
      d3
        .drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended)
    )
    .transition()
    .delay(300)
    .duration(500)
    .style("opacity", 1)
    .attr("x", x)
    .attr("y", y);

  simulation.nodes(nodes);
  simulation.alpha(0.3).restart();

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
    const { s, t } = getEndpoints(l);
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

  const w = parseInt(wRaw);
  if (isNaN(w) || w <= 0) {
    showNotification("Nhập trọng số hợp lệ (số nguyên dương)", "error");
    return;
  }

  if (!nodes.find((n) => n.id === src)) {
    showNotification(`Node '${src}' không tồn tại`, "error");
    return;
  }
  if (!nodes.find((n) => n.id === tgt)) {
    showNotification(`Node '${tgt}' không tồn tại`, "error");
    return;
  }

  const edgeId = `${src}-${tgt}`;
  if (links.find((l) => l.id === edgeId)) {
    showNotification("Cạnh đã tồn tại", "error");
    return;
  }

  links.push({ source: src, target: tgt, weight: w, id: edgeId });
  restart();

  document.getElementById("fromNode").value = "";
  document.getElementById("toNode").value = "";
  document.getElementById("edgeValue").value = "";
  showNotification(`Đã thêm cạnh '${src} → ${tgt}'`, "success");
}

function removeEdge() {
  const src = normId(document.getElementById("fromNode").value);
  const tgt = normId(document.getElementById("toNode").value);

  if (!src || !tgt) {
    showNotification("Nhập source và target", "error");
    return;
  }

  const edgeId = `${src}-${tgt}`;
  const idx = links.findIndex((l) => l.id === edgeId);

  if (idx === -1) {
    showNotification("Cạnh không tồn tại", "error");
    return;
  }

  links.splice(idx, 1);
  restart();

  document.getElementById("fromNode").value = "";
  document.getElementById("toNode").value = "";
  showNotification(`Đã xóa cạnh '${src} → ${tgt}'`, "success");
}

function resetGraph() {
  nodes = [
    { id: "a", x: 400, y: 0, _fixed: true },
    { id: "b", x: 175, y: 150, _fixed: true },
    { id: "c", x: 625, y: 150, _fixed: true },
    { id: "e", x: 175, y: 375, _fixed: true },
    { id: "d", x: 625, y: 375, _fixed: true },
    { id: "f", x: 400, y: 525, _fixed: true },
  ];

  links = [
    { source: "a", target: "b", weight: 42, id: "a-b" },
    { source: "a", target: "c", weight: 4, id: "a-c" },
    { source: "a", target: "d", weight: 10, id: "a-d" },
    { source: "b", target: "e", weight: 14, id: "b-e" },
    { source: "b", target: "f", weight: 3, id: "b-f" },
    { source: "c", target: "d", weight: 3, id: "c-d" },
    { source: "d", target: "e", weight: 1, id: "d-e" },
    { source: "e", target: "f", weight: 11, id: "e-f" },
    { source: "e", target: "a", weight: 9, id: "e-a" },
    { source: "d", target: "f", weight: 10, id: "d-f" },
    { source: "c", target: "f", weight: 5, id: "c-f" },
  ];

  restart();
  pause();
  showNotification("Đã reset đồ thị về mặc định", "success");
}

function renderRandomGraphFromDB() {
  const randomGraphs = [
    {
      nodes: [
        { id: "s", x: 100, y: 250, _fixed: true },
        { id: "a", x: 250, y: 100, _fixed: true },
        { id: "b", x: 250, y: 400, _fixed: true },
        { id: "c", x: 400, y: 100, _fixed: true },
        { id: "d", x: 400, y: 400, _fixed: true },
        { id: "t", x: 550, y: 250, _fixed: true },
      ],
      links: [
        { source: "s", target: "a", weight: 7, id: "s-a" },
        { source: "s", target: "b", weight: 6, id: "s-b" },
        { source: "a", target: "c", weight: 9, id: "a-c" },
        { source: "a", target: "b", weight: 8, id: "a-b" },
        { source: "b", target: "d", weight: 5, id: "b-d" },
        { source: "c", target: "t", weight: 12, id: "c-t" },
        { source: "d", target: "t", weight: 7, id: "d-t" },
        { source: "c", target: "d", weight: 3, id: "c-d" },
      ]
    },
    {
      nodes: [
        { id: "a", x: 300, y: 50, _fixed: true },
        { id: "b", x: 150, y: 200, _fixed: true },
        { id: "c", x: 450, y: 200, _fixed: true },
        { id: "d", x: 300, y: 350, _fixed: true },
      ],
      links: [
        { source: "a", target: "b", weight: 5, id: "a-b" },
        { source: "a", target: "c", weight: 3, id: "a-c" },
        { source: "b", target: "d", weight: 7, id: "b-d" },
        { source: "c", target: "d", weight: 2, id: "c-d" },
      ]
    }
  ];

  const selected = randomGraphs[Math.floor(Math.random() * randomGraphs.length)];
  nodes = [...selected.nodes];
  links = [...selected.links];
  restart();
  showNotification("Đã tạo đồ thị ngẫu nhiên!", "success");
}

// ==================== ALGORITHM EXECUTION ====================
function runAlgorithm() {
  if (serverSteps.length === 0) {
    showNotification("❌ Chưa có dữ liệu thuật toán! Vui lòng upload JSON.", "error");
    return;
  }

  document.body.classList.add("playing");
  toggleExplanation(true);

  currentStepIndex = -1;
  resetColors();
  play();
}

function togglePlayPause() {
  document.body.classList.add("playing");
  const btn = document.getElementById("playPauseBtn");

  if (!isPlaying) {
    play();
    btn.textContent = "⏸";
    isPlaying = true;
  } else {
    pause();
    btn.textContent = "▶";
    isPlaying = false;
  }
}

function play() {
  if (currentStepIndex >= serverSteps.length - 1) {
    currentStepIndex = -1;
    resetColors();
  }
  isPlaying = true;
  running = true;
  stepNextLoop();
}

function pause() {
  isPlaying = false;
  running = false;
  clearTimeout(stepTimer);
}

function stepNextLoop() {
  if (!isPlaying || currentStepIndex >= serverSteps.length - 1) {
    isPlaying = false;
    running = false;
    document.getElementById("playPauseBtn").textContent = "▶";
    return;
  }
  nextStep();
  stepTimer = setTimeout(stepNextLoop, animationSpeed);
}

function nextStep() {
  if (currentStepIndex >= serverSteps.length - 1) return;
  currentStepIndex++;
  applyStep(serverSteps[currentStepIndex]);
}

function prevStep() {
  if (currentStepIndex <= 0) return;
  currentStepIndex--;
  replayFromStart(currentStepIndex);
}

function jumpToStep(index) {
  if (index < 0 || index >= serverSteps.length) return;
  currentStepIndex = index - 1;
  replayFromStart(index);
}

function replayFromStart(targetIndex) {
  resetColors();
  for (let i = 0; i <= targetIndex; i++) {
    applyStepSilent(serverSteps[i]);
  }
  currentStepIndex = targetIndex;
  highlightCurrentStep();
}

function applyStep(step) {
  highlightCurrentStep();

  // Color map
  const colorMap = {
    'yellow': '#ffc107',
    'red': '#e53935',
    'green': '#00e676',
    'blue': '#1976d2',
    'white': '#fff'
  };

  // ========== TÔ MÀU ĐỈN H ==========
  const highlightedNodes = new Set(); // Track nodes được highlight

  if (step.colors && step.colors.length > 0) {
    step.colors.forEach((color, idx) => {
      if (step.highlight && step.highlight.nodes && step.highlight.nodes[idx]) {
        const nodeId = normId(step.highlight.nodes[idx]);
        highlightedNodes.add(nodeId);

        const nodeElement = d3.select(`#node-${nodeId}`);

        if (!nodeElement.empty()) {
          const fillColor = colorMap[color.toLowerCase()] || color;
          nodeElement.attr("fill", fillColor);

          if (color.toLowerCase() === 'blue') {
            persistedBlueNodes.add(nodeId);
          }
        }
      }
    });
  }

  // ========== TỰ ĐỘNG TÔ MÀU CẠN H GIỮA CÁC NODE ==========
  // Tô tất cả cạnh nối giữa các node được highlight
  if (highlightedNodes.size > 0) {
    const primaryColor = step.colors && step.colors.length > 0
      ? colorMap[step.colors[0].toLowerCase()] || step.colors[0]
      : '#ffc107';

    links.forEach(link => {
      const sourceId = normId(link.source.id || link.source);
      const targetId = normId(link.target.id || link.target);

      // Nếu cả source và target đều được highlight → tô cạnh
      if (highlightedNodes.has(sourceId) && highlightedNodes.has(targetId)) {
        const edgeId = `${sourceId}-${targetId}`;
        const edgeElement = d3.select(`#edge-${edgeId}`);

        if (!edgeElement.empty()) {
          edgeElement
            .transition()
            .duration(300)
            .attr("stroke", primaryColor)
            .attr("stroke-width", 4);

          // Nếu primary color là blue, persist nó
          if (step.colors[0].toLowerCase() === 'blue') {
            persistedBlueEdges.add(edgeId);
          }
        }
      }
    });
  }

  // ========== TÔ MÀU CẠN H TỪ HIGHLIGHT.EDGES (NẾU CÓ) ==========
  if (step.highlight && step.highlight.edges) {
    const primaryColor = step.colors && step.colors.length > 0
      ? colorMap[step.colors[0].toLowerCase()] || step.colors[0]
      : '#ffc107';

    step.highlight.edges.forEach(edgeId => {
      const normalizedEdgeId = normId(edgeId);
      const edgeElement = d3.select(`#edge-${normalizedEdgeId}`);

      if (!edgeElement.empty()) {
        edgeElement
          .transition()
          .duration(300)
          .attr("stroke", primaryColor)
          .attr("stroke-width", 4);
      }
    });
  }
}

function applyStepSilent(step) {
  if (step.colors && step.colors.length > 0) {
    const colorMap = {
      'yellow': '#ffc107',
      'red': '#e53935',
      'green': '#00e676',
      'blue': '#1976d2',
      'white': '#fff'
    };

    step.colors.forEach((color, idx) => {
      if (step.highlight && step.highlight.nodes && step.highlight.nodes[idx]) {
        const nodeId = normId(step.highlight.nodes[idx]);
        const nodeElement = d3.select(`#node-${nodeId}`);

        if (!nodeElement.empty()) {
          const fillColor = colorMap[color.toLowerCase()] || color;
          nodeElement.attr("fill", fillColor);

          if (color.toLowerCase() === 'blue') {
            persistedBlueNodes.add(nodeId);
          }
        }
      }
    });
  }

  if (step.highlight && step.highlight.edges) {
    step.highlight.edges.forEach(edgeId => {
      const normalizedEdgeId = normId(edgeId);
      const edgeElement = d3.select(`#edge-${normalizedEdgeId}`);

      if (!edgeElement.empty()) {
        edgeElement.attr("stroke", "#00e676").attr("stroke-width", 4);
      }
    });
  }
}

function highlightCurrentStep() {
  // Highlight in steps list
  document.querySelectorAll(".step-card").forEach((card, idx) => {
    if (idx === currentStepIndex) {
      card.classList.add("active");
      card.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } else {
      card.classList.remove("active");
    }
  });

  // Highlight in pseudocode
  document.querySelectorAll(".pseudo-line").forEach((line, idx) => {
    if (idx === currentStepIndex) {
      line.classList.add("highlight");
    } else {
      line.classList.remove("highlight");
    }
  });
}

function resetColors() {
  persistedBlueEdges.clear();
  persistedBlueNodes.clear();

  // Reset nodes
  nodeGroup.selectAll("circle")
    .attr("fill", "black")
    .attr("stroke", "#E6BE8A")
    .attr("stroke-width", 6);

  // Reset edges - tô tất cả edge về màu mặc định
  linkGroup.selectAll("line")
    .transition()
    .duration(200)
    .attr("stroke", "#999")
    .attr("stroke-width", 2);

  document.querySelectorAll(".step-card").forEach(card => card.classList.remove("active"));
  document.querySelectorAll(".pseudo-line").forEach(line => line.classList.remove("highlight"));
}

// ==================== UI CONTROLS ====================
function toggleExplanation(forceShow = null) {
  const wrapper = document.getElementById("explanation-wrapper");
  const contentWrapper = document.getElementById("content-wrapper");
  const eyeIcon = document.querySelector("#eye h1");
  const eyeText = document.querySelector("#eye h4");

  if (forceShow === true || !wrapper.classList.contains("show-steps")) {
    wrapper.classList.add("show-steps");
    contentWrapper.classList.add("explain-open");
    if (eyeIcon) eyeIcon.innerText = "🙈";
    if (eyeText) eyeText.innerText = "Ẩn thuật giải";
  } else {
    wrapper.classList.remove("show-steps");
    contentWrapper.classList.remove("explain-open");
    if (eyeIcon) eyeIcon.innerText = "👀";
    if (eyeText) eyeText.innerText = "Hiện thuật giải";
  }
}

function backToEditMode() {
  document.body.classList.remove("playing");

  const wrapper = document.getElementById("explanation-wrapper");
  const contentWrapper = document.getElementById("content-wrapper");

  if (wrapper) wrapper.classList.remove("show-steps");
  if (contentWrapper) contentWrapper.classList.remove("explain-open");

  const eyeIcon = document.querySelector("#eye h1");
  const eyeText = document.querySelector("#eye h4");
  if (eyeIcon) eyeIcon.innerText = "👀";
  if (eyeText) eyeText.innerText = "Hiện thuật giải";

  isPlaying = false;
  running = false;
  const btn = document.getElementById("playPauseBtn");
  if (btn) btn.textContent = "▶";

  const dropdown = document.getElementById("floating-menu-dropdown");
  if (dropdown) dropdown.classList.remove("show");
}

function toggleMenu() {
  const dropdown = document.getElementById("floating-menu-dropdown");
  dropdown.classList.toggle("show");
}

window.onclick = function (event) {
  if (!event.target.matches('#floating-menu-btn')) {
    const dropdown = document.getElementById("floating-menu-dropdown");
    if (dropdown && dropdown.classList.contains('show')) {
      dropdown.classList.remove('show');
    }
  }
}

function updateSpeed(value) {
  const speedMap = {
    1: 2000,
    2: 1500,
    3: 1000,
    4: 700,
    5: 400
  };
  animationSpeed = speedMap[value] || 1000;
}

// ==================== UTILITY FUNCTIONS ====================
function normId(raw) {
  return raw ? raw.toString().trim().toLowerCase() : "";
}

function getEndpoints(link) {
  const s = link.source && link.source.id ? link.source.id : link.source;
  const t = link.target && link.target.id ? link.target.id : link.target;
  return { s, t };
}

function ensureLinkIds() {
  links.forEach((l) => {
    const { s, t } = getEndpoints(l);
    if (!l.id) l.id = `${s}-${t}`;
  });
}

function showNotification(message, type) {
  const notif = document.getElementById("notification");
  if (!notif) return;

  notif.textContent = message;
  notif.className = type;
  notif.style.display = "block";

  setTimeout(() => {
    notif.style.display = "none";
  }, 3000);
}

// ==================== INITIALIZATION ====================
restart();
console.log("✅ Dijkstra Visualizer Combined - Ready!");
/**
 * Universal Algorithm Visualizer
 * Tái sử dụng logic vẽ đồ thị từ dijkstra.js
 * Nhận JSON từ backend hoặc file upload
 */

// ==================== GLOBAL STATE ====================
let algorithmData = null;
let nodes = [];
let links = [];
let serverSteps = [];
let currentStepIndex = -1;
let isPlaying = false;
let stepTimer = null;
let animationSpeed = 1000;
let persistedBlueEdges = new Set();
let persistedBlueNodes = new Set();

// ==================== D3.JS SETUP (Giống dijkstra.js) ====================
const svg = d3.select("#graph");
const viewBox = svg.attr("viewBox").split(" ");
const width = +viewBox[2];
const height = +viewBox[3];

// Add arrow marker
svg.append("defs")
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
  .attr("fill", "#999");

// D3 force simulation
let simulation = d3.forceSimulation()
  .force("link", d3.forceLink().id(d => d.id).distance(120))
  .force("charge", d3.forceManyBody().strength(-400))
  .force("center", d3.forceCenter(width / 2, height / 2))
  .force("collide", d3.forceCollide().radius(40));

// D3 groups
let linkGroup = svg.append("g").attr("class", "links");
let nodeGroup = svg.append("g").attr("class", "nodes");
let labelGroup = svg.append("g").attr("class", "labels");
let weightGroup = svg.append("g").attr("class", "weights");

// ==================== FILE UPLOAD & JSON PROCESSING ====================
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

    // Display algorithm info
    const algoInfo = data.algorithm || {};
    document.getElementById("algoTitle").innerText = algoInfo.name || 'Custom Algorithm';
    document.getElementById("algoDesc").innerText = algoInfo.description || '';
    document.getElementById("algorithmInfoBox").style.display = 'block';

    // Load graph data
    if (data.graph && data.graph.nodes && data.graph.edges) {
      // Convert to D3 format
      nodes = data.graph.nodes.map((n, idx) => ({
        id: n.toLowerCase(),
        x: (idx % 3) * 200 + 150,
        y: Math.floor(idx / 3) * 150 + 100,
        _fixed: false
      }));

      links = data.graph.edges.map(e => {
        // Hỗ trợ cả 'from' và 'from_node'
        const fromNode = (e.from || e.from_node || '').toString().toLowerCase();
        const toNode = (e.to || '').toString().toLowerCase();

        // Bỏ qua edge nếu thiếu dữ liệu
        if (!fromNode || !toNode) return null;

        return {
          id: `${fromNode}-${toNode}`,
          source: fromNode,
          target: toNode,
          weight: e.weight || ""
        };
      }).filter(e => e !== null);

      // Draw graph
      updateGraphDisplay();
      showNotification(`✅ Đã tải đồ thị với ${nodes.length} đỉnh và ${links.length} cạnh!`, "success");
    } else {
      showNotification("⚠️ JSON không có dữ liệu đồ thị!", "error");
      return;
    }

    // Load steps
    if (data.steps && data.steps.length > 0) {
      serverSteps = data.steps;
      renderStepsList();
      currentStepIndex = -1;
      showNotification(`✅ Tải thành công ${serverSteps.length} bước thuật toán!`, "success");
    } else {
      showNotification("⚠️ JSON không có steps!", "error");
    }

  } catch (err) {
    console.error(err);
    showNotification("❌ Lỗi xử lý dữ liệu: " + err.message, "error");
  }
}

// ==================== GRAPH RENDERING (Tái sử dụng từ dijkstra.js) ====================
function updateGraphDisplay() {
  // Clear old elements
  linkGroup.selectAll("*").remove();
  nodeGroup.selectAll("*").remove();
  labelGroup.selectAll("*").remove();
  weightGroup.selectAll("*").remove();

  // Draw edges
  const linkElements = linkGroup.selectAll("line")
    .data(links)
    .enter()
    .append("line")
    .attr("id", d => `edge-${d.id}`)
    .attr("stroke", "#999")
    .attr("stroke-width", 2)
    .attr("marker-end", "url(#arrow)");

  // Draw nodes
  const nodeElements = nodeGroup.selectAll("g")
    .data(nodes)
    .enter()
    .append("g")
    .attr("id", d => `node-group-${d.id}`)
    .call(d3.drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended));

  nodeElements.append("circle")
    .attr("id", d => `node-${d.id}`)
    .attr("r", 30)
    .attr("fill", "#fff")
    .attr("stroke", "#333")
    .attr("stroke-width", 2);

  nodeElements.append("text")
    .attr("dy", 5)
    .attr("text-anchor", "middle")
    .attr("font-size", "16px")
    .attr("font-weight", "600")
    .text(d => d.id.toUpperCase());

  // Draw edge weights
  weightGroup.selectAll("text")
    .data(links)
    .enter()
    .append("text")
    .attr("id", d => `weight-${d.id}`)
    .attr("text-anchor", "middle")
    .attr("font-size", "14px")
    .attr("font-weight", "600")
    .attr("fill", "#333")
    .text(d => d.weight || "");

  // Setup simulation
  simulation.nodes(nodes).on("tick", ticked);
  simulation.force("link").links(links);
  simulation.alpha(1).restart();

  function ticked() {
    linkElements
      .attr("x1", d => d.source.x)
      .attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x)
      .attr("y2", d => d.target.y);

    nodeElements
      .attr("transform", d => `translate(${d.x},${d.y})`);

    weightGroup.selectAll("text")
      .attr("x", d => (d.source.x + d.target.x) / 2)
      .attr("y", d => (d.source.y + d.target.y) / 2 - 5);
  }
}

// Drag functions
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
  if (!d._fixed) {
    d.fx = null;
    d.fy = null;
  }
}

// ==================== STEP RENDERING ====================
function renderStepsList() {
  const container = document.getElementById("stepsList");
  if (!container) return;

  container.innerHTML = '';

  serverSteps.forEach((step, idx) => {
    const div = document.createElement('div');
    div.className = 'step-item';
    if (idx === currentStepIndex) div.classList.add('active');
    div.onclick = () => jumpToStep(idx);

    const stepNum = document.createElement('span');
    stepNum.className = 'step-number';
    stepNum.textContent = step.step || `Bước ${idx + 1}`;

    const stepExplain = document.createElement('div');
    stepExplain.className = 'step-explain';
    stepExplain.textContent = step.explain || step.pseudo || '';

    div.appendChild(stepNum);
    div.appendChild(stepExplain);
    container.appendChild(div);
  });
}

// ==================== STEP EXECUTION (Tái sử dụng logic từ dijkstra.js) ====================
function applyStep(stepIndex) {
  if (stepIndex < 0 || stepIndex >= serverSteps.length) return;

  const step = serverSteps[stepIndex];
  currentStepIndex = stepIndex;

  // Update explanation panel
  const explainDiv = document.getElementById("explanation");
  if (explainDiv) {
    explainDiv.innerHTML = `
            <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin-bottom: 10px;">
                <strong style="color: #1976d2; font-size: 1.1em;">${step.step || ''}</strong>
                <p style="margin-top: 8px; color: #333;">${step.explain || ''}</p>
                <pre style="background: #f5f5f5; padding: 10px; margin-top: 10px; border-radius: 4px; font-size: 0.9em;">${step.pseudo || ''}</pre>
            </div>
        `;
  }

  // Apply visual highlighting
  applyVisualHighlight(step);

  // Update active step in list
  renderStepsList();

  // Speak if voice enabled
  if (step.voice) {
    speakText(step.voice);
  }
}

function applyVisualHighlight(step) {
  const colors = step.colors || ['yellow'];
  const mainColor = colors[0];
  const highlightNodes = step.highlight?.nodes || [];
  const highlightEdges = step.highlight?.edges || [];

  // Reset all to default first (keep blue ones)
  resetGraphColors();

  // Color mapping
  const colorMap = {
    'yellow': { node: '#ffc107', nodeStroke: '#b28900', edge: '#ffc107' },
    'red': { node: '#e53935', nodeStroke: '#b71c1c', edge: '#e53935' },
    'green': { node: '#00e676', nodeStroke: '#00c853', edge: '#00e676' },
    'blue': { node: '#1976d2', nodeStroke: '#0d47a1', edge: '#1565c0' }
  };

  const colors_obj = colorMap[mainColor] || colorMap['yellow'];

  // Highlight nodes
  highlightNodes.forEach(nodeId => {
    const nid = nodeId.toLowerCase();

    // Skip if already persisted blue
    if (persistedBlueNodes.has(nid) && mainColor !== 'blue') return;

    nodeGroup.selectAll("circle")
      .filter(d => d.id === nid)
      .transition().duration(300)
      .attr("fill", colors_obj.node)
      .attr("stroke", colors_obj.nodeStroke)
      .attr("stroke-width", 6);

    // If blue, persist it
    if (mainColor === 'blue') {
      persistedBlueNodes.add(nid);
    }
  });

  // Highlight edges
  highlightEdges.forEach(edgeId => {
    const eid = edgeId.toLowerCase();

    // Skip if already persisted blue
    if (persistedBlueEdges.has(eid) && mainColor !== 'blue') return;

    linkGroup.selectAll("line")
      .filter(d => sameEdge(d.id, eid))
      .transition().duration(300)
      .attr("stroke", colors_obj.edge)
      .attr("stroke-width", 4);

    // If blue, persist it
    if (mainColor === 'blue') {
      persistedBlueEdges.add(eid);
    }
  });
}

function resetGraphColors() {
  // Reset nodes (except persisted blue)
  nodeGroup.selectAll("circle").each(function (d) {
    if (!persistedBlueNodes.has(d.id)) {
      d3.select(this)
        .transition().duration(200)
        .attr("fill", "#fff")
        .attr("stroke", "#333")
        .attr("stroke-width", 2);
    }
  });

  // Reset edges (except persisted blue)
  linkGroup.selectAll("line").each(function (d) {
    if (!persistedBlueEdges.has(d.id)) {
      d3.select(this)
        .transition().duration(200)
        .attr("stroke", "#999")
        .attr("stroke-width", 2);
    }
  });
}

function sameEdge(id1, id2) {
  const [a1, b1] = id1.split('-');
  const [a2, b2] = id2.split('-');
  return (a1 === a2 && b1 === b2) || (a1 === b2 && b1 === a2);
}

// ==================== PLAYBACK CONTROLS ====================
function togglePlayPause() {
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
  }
  isPlaying = true;
  playLoop();
}

function pause() {
  isPlaying = false;
  if (stepTimer) {
    clearTimeout(stepTimer);
    stepTimer = null;
  }
}

function playLoop() {
  if (!isPlaying) return;
  if (currentStepIndex >= serverSteps.length - 1) {
    pause();
    document.getElementById("playPauseBtn").textContent = "▶";
    return;
  }

  nextStep();
  const duration = serverSteps[currentStepIndex]?.duration || animationSpeed;
  stepTimer = setTimeout(playLoop, duration);
}

function nextStep() {
  if (currentStepIndex < serverSteps.length - 1) {
    applyStep(currentStepIndex + 1);
  }
}

function prevStep() {
  if (currentStepIndex > 0) {
    applyStep(currentStepIndex - 1);
  }
}

function jumpToStep(index) {
  pause();
  applyStep(index);
}

function updateSpeed(value) {
  animationSpeed = parseInt(value);
}

// ==================== UI HELPERS ====================
function loadAndStart() {
  if (!algorithmData || serverSteps.length === 0) {
    showNotification("⚠️ Vui lòng tải file JSON trước!", "error");
    return;
  }

  resetVisualization();
  play();
}

function resetVisualization() {
  pause();
  currentStepIndex = -1;
  persistedBlueEdges.clear();
  persistedBlueNodes.clear();

  if (nodes.length > 0) {
    resetGraphColors();
  }

  renderStepsList();
  document.getElementById("explanation").innerHTML = '';
  showNotification("🔄 Đã reset!", "success");
}

function toggleExplanationPanel() {
  const wrapper = document.getElementById("explanationWrapper");
  wrapper.classList.toggle("open");
}

function downloadJSON() {
  const sampleData = {
    "algorithm": {
      "name": "Thuật toán BFS",
      "description": "Duyệt đồ thị theo chiều rộng"
    },
    "graph": {
      "nodes": ["a", "b", "c", "d", "e"],
      "edges": [
        { "from": "a", "to": "b", "weight": 1 },
        { "from": "a", "to": "c", "weight": 1 },
        { "from": "b", "to": "d", "weight": 1 },
        { "from": "c", "to": "e", "weight": 1 }
      ]
    },
    "steps": [
      {
        "step": "Bước 1",
        "pseudo": "Khởi tạo queue và thêm start",
        "explain": "Bắt đầu thuật toán BFS từ đỉnh a",
        "voice": "Khởi tạo queue và thêm đỉnh xuất phát",
        "duration": 1500,
        "colors": ["yellow"],
        "highlight": {
          "nodes": ["a"],
          "edges": []
        }
      }
    ]
  };

  const blob = new Blob([JSON.stringify(sampleData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sample_algorithm.json';
  a.click();
  URL.revokeObjectURL(url);

  showNotification("✅ Đã tải file JSON mẫu!", "success");
}

function showNotification(message, type = 'success') {
  const notif = document.getElementById("notification");
  notif.textContent = message;
  notif.className = `show ${type}`;
  setTimeout(() => {
    notif.classList.remove('show');
  }, 3000);
}

// ==================== TEXT-TO-SPEECH ====================
function speakText(text) {
  if (!text) return;

  // Cancel any ongoing speech
  speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'vi-VN';
  utterance.rate = 0.9;
  utterance.pitch = 1;

  speechSynthesis.speak(utterance);
}

// ==================== INIT ====================
window.addEventListener('load', () => {
  console.log('Universal Algorithm Visualizer loaded');

  // Check if there's data from admin page in localStorage
  const savedData = localStorage.getItem('generatedAlgorithm');
  if (savedData) {
    try {
      const data = JSON.parse(savedData);
      processAlgorithmData(data);
      localStorage.removeItem('generatedAlgorithm');
      showNotification("✅ Đã tải thuật toán từ Admin!", "success");
    } catch (e) {
      console.error('Failed to load from localStorage', e);
    }
  }
});
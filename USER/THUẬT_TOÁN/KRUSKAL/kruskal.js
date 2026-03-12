let persistedBlueEdges = new Set();
let persistedBlueNodes = new Set();

let notificationTimer = null;
/**
 * @param {string} message
 * @param {'success' | 'error'} type
 */

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

const svg = d3.select("#graph");
const viewBox = svg.attr("viewBox").split(" ");
const width = +viewBox[2];
const height = +viewBox[3];

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

let serverSteps = [];
let currentStepIndex = -1;
let running = false;
let stepTimer = null;
let consideringAnimationTimer = null;
const SERVER_BASE = "http://localhost:5196";
const PAGE_SIZE = 6;

let animationSpeed = 1000;


let isPlaying = false;

function togglePlayPause() {
  // Chỉ thêm class 'playing' để ẩn thanh điều khiển bên trái (nếu cần)
  document.body.classList.add("playing");

  // ĐẢM BẢO KHÔNG CÓ DÒNG: document.body.classList.add("show-explain"); ở đây

  const btn = document.getElementById("playPauseBtn");

  if (!isPlaying) {
    speechSynthesis.cancel();
    play();
    btn.textContent = "⏸";
    isPlaying = true;
  } else {
    speechSynthesis.cancel();
    pause();
    btn.textContent = "▶";
    isPlaying = false;
  }
}


function toggleExplanation() {
  const wrapper = document.getElementById("explanation-wrapper");
  const contentWrapper = document.getElementById("content-wrapper");

  // 1. Bật/Tắt class để chạy hiệu ứng trượt mượt mà từ CSS
  wrapper.classList.toggle("show-steps");
  contentWrapper.classList.toggle("explain-open");

  // 2. Lấy các phần tử Icon và Text để thay đổi
  const eyeIcon = document.querySelector("#eye h1");
  const eyeText = document.querySelector("#eye h4");

  // 3. Kiểm tra trạng thái để đổi nội dung
  if (wrapper.classList.contains("show-steps")) {
    eyeIcon.innerText = "🙈";
    eyeText.innerText = "Ẩn thuật giải"; // Đổi thành Ẩn khi đang mở
  } else {
    eyeIcon.innerText = "👀";
    eyeText.innerText = "Hiện thuật giải"; // Đổi lại Hiện khi đang đóng
  }
}

// function backToEditMode() {
//   // 1. Xóa class playing để cột control bên trái trượt vào
//   document.body.classList.remove("playing");

//   // 2. Quan trọng: Xóa class show-explain hoặc explain-open để cột phải biến mất
//   // Bạn đang dùng class nào thì xóa class đó (tốt nhất xóa cả 2 cho chắc)
//   document.body.classList.remove("show-explain");

//   const wrapper = document.getElementById("explanation-wrapper");
//   const contentWrapper = document.getElementById("content-wrapper");

//   if (wrapper) wrapper.classList.remove("show-steps");
//   if (contentWrapper) contentWrapper.classList.remove("explain-open");

//   // 3. Reset lại nút Eye về trạng thái ban đầu
//   const eyeIcon = document.querySelector("#eye h1");
//   const eyeText = document.querySelector("#eye h4");
//   if (eyeIcon) eyeIcon.innerText = "👀";
//   if (eyeText) eyeText.innerText = "Hiện thuật giải";

//   // 4. Các logic reset khác
//   isPlaying = false;
//   document.getElementById("playPauseBtn").textContent = "▶";
//   const audio = document.getElementById("audio");
//   if (audio) { audio.pause(); audio.currentTime = 0; }

//   const dropdown = document.getElementById("floating-menu-dropdown");
//   if (dropdown) dropdown.classList.remove("show");
// }


// function togglePlayPause() {
//   document.body.classList.add("playing");
//   const btn = document.getElementById("playPauseBtn");

//   if (!isPlaying) {
//     speechSynthesis.cancel();

//     play();
//     btn.textContent = "⏸";
//     isPlaying = true;
//   } else {
//     speechSynthesis.cancel();

//     pause();
//     btn.textContent = "▶";
//     isPlaying = false;
//   }
// }

function toggleMenu() {
  // 1. Thoát chế độ play
  isPlaying = false;

  // 2. Bỏ class chạy thuật toán
  document.body.classList.remove("playing");

  // const wrapper = document.getElementById("explanation-wrapper");
  // const contentWrapper = document.getElementById("content-wrapper");

  // 1. Bật/Tắt class để chạy hiệu ứng trượt mượt mà từ CSS
  // wrapper.classList.toggle("show-steps");
  // contentWrapper.classList.toggle("explain-open");
  // // 3. Ẩn STEP + PSEUDOCODE
  document.getElementById("content-wrapper")
    .classList.remove("explanation-wrapper");

  // 4. Reset nút play
  const btn = document.getElementById("playPauseBtn");
  btn.innerText = "▶";

  // 5. Pause thuật toán nếu đang chạy
  pause();
}


function backToEditMode() {
  // 1. Hiện lại thanh Control bên trái (đẩy từ trái qua phải)
  // Việc xóa class 'playing' sẽ kích hoạt transition trong CSS của #controls
  document.body.classList.remove("playing");

  // 2. Đẩy 2 cột Step/Pseudocode qua phải và biến mất
  const wrapper = document.getElementById("explanation-wrapper");
  const contentWrapper = document.getElementById("content-wrapper");

  if (wrapper) {
    wrapper.classList.remove("show-steps"); // Thu width về 0
  }
  if (contentWrapper) {
    contentWrapper.classList.remove("explain-open"); // Trả lại width cho Canvas
  }

  // 3. Reset các trạng thái nút và text của Eye
  const eyeIcon = document.querySelector("#eye h1");
  const eyeText = document.querySelector("#eye h4");
  if (eyeIcon) eyeIcon.innerText = "👀";
  if (eyeText) eyeText.innerText = "Hiện thuật giải";

  // 4. Reset nút Play về ban đầu
  isPlaying = false;
  const btn = document.getElementById("playPauseBtn");
  if (btn) btn.textContent = "▶";

  // 5. Dừng âm thanh và ẩn menu nổi
  const audio = document.getElementById("audio");
  if (audio) {
    audio.pause();
    audio.currentTime = 0;
  }
  const dropdown = document.getElementById("floating-menu-dropdown");
  if (dropdown) dropdown.classList.remove("show");
}

// Cập nhật lại logic đóng menu khi click ra ngoài
window.onclick = function (event) {
  if (!event.target.matches('#floating-menu-btn')) {
    const dropdown = document.getElementById("floating-menu-dropdown");
    if (dropdown && dropdown.classList.contains('show')) {
      dropdown.classList.remove('show');
    }
  }
}


/**
 * @param {string} newSpeed
 */
window.updateSpeed = function (newSpeed) {
  animationSpeed = Math.max(10, Number(newSpeed));

  if (running) {
    clearTimeout(stepTimer);
    stepTimer = setTimeout(stepNextLoop, animationSpeed);
  }
  console.log("Animation Speed set to:", animationSpeed, "ms");
};

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
function normId(raw) {
  return raw ? raw.toString().trim().toLowerCase() : "";
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

// function spawnNodes() {
//   const centerX = width / 2;
//   const centerY = height / 2;

//   nodeGroup
//     .selectAll("circle")
//     .attr("cx", centerX)
//     .attr("cy", centerY)
//     .attr("r", 0)
//     .transition()
//     .delay((d, i) => i * 200)
//     .duration(800)
//     .attr("r", 34)
//     .attr("cx", (d) => d.x)
//     .attr("cy", (d) => d.y);

//   labelGroup
//     .selectAll("text")
//     .attr("x", centerX)
//     .attr("y", centerY)
//     .style("opacity", 0)
//     .transition()
//     .delay((d, i) => i * 200 + 500)
//     .duration(700)
//     .style("opacity", 1)
//     .attr("x", (d) => d.x)
//     .attr("y", (d) => d.y);
// }


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

function animateArrow(eid) {
  return new Promise((res) => {
    const line = d3.select(`#edge-${eid}`);
    if (line.empty()) return res();

    const pathNode = line.node();
    const length = pathNode.getTotalLength();

    let arrow = d3.select(`#arrow-${eid}`);
    if (arrow.empty()) {
      arrow = svg
        .append("polygon")
        .attr("id", `arrow-${eid}`)
        .attr("points", "0,0 10,5 0,10")
        .attr("fill", "#ffc107");
    }

    arrow.style("opacity", 1);

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

function restart() {
  ensureLinkIds();

  linkGroup.selectAll("line").remove();
  weightGroup.selectAll("text").remove();
  linkGroup.selectAll("line").style("opacity", 1);

  const link = linkGroup.selectAll("line").data(links, (d) => d.id);

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
  linkEnter.on("click", () => { });

  const wlabel = weightGroup.selectAll("text").data(links, (d) => d.id);
  wlabel.exit().remove();
  const wEnter = wlabel
    .enter()
    .append("text")
    .attr("class", "weight")
    .attr("data-edge", (d) => d.id)
    .attr("fill", "#000")
    .style("fill", "#000 !important")
    .attr("font-size", 18)
    .attr("font-weight", "500")
    .attr("text-anchor", "middle")
    .style("opacity", 0)
    .text((d) => d.weight);
  wlabel.merge(wEnter).text((d) => d.weight);

  const node = nodeGroup.selectAll("circle").data(nodes, (d) => d.id);
  node.exit().remove();
  const nodeEnter = node
    .enter()
    .append("circle")
    .attr("r", 0)
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

  const label = labelGroup.selectAll("text").data(nodes, (d) => d.id);
  label.exit().remove();
  const labelEnter = label
    .enter()
    .append("text")
    .attr("class", "label")
    .attr("fill", "white")
    .attr("font-size", 25)
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

function resetStyles() {
  linkGroup.selectAll("line").attr("stroke", "#999").attr("stroke-width", 2);
  weightGroup.selectAll("text").attr("fill", "black").style("opacity", 1);
  nodeGroup
    .selectAll("circle")
    .attr("fill", "black")
    .attr("stroke", "#E6BE8A")
    .attr("stroke-width", 6);
}

async function applyStepVisuals(stepIndex) {
  if (!serverSteps || serverSteps.length === 0) return;
  const cur = serverSteps[stepIndex];
  if (!cur) return;

  // Hiển thị bảng trạng thái
  const stateDisplay = document.getElementById("state-display");
  if (stateDisplay) stateDisplay.style.display = "block";

  if (typeof persistedBlueEdges === "undefined") persistedBlueEdges = new Set();
  if (typeof persistedBlueNodes === "undefined") persistedBlueNodes = new Set();

  const pseudo = cur.Pseudo || "";
  const highlightEdges = (cur.Highlight?.Edges || []).map(e => e.toLowerCase());
  const highlightNodes = (cur.Highlight?.Nodes || []).map(n => n.toLowerCase());

  // ==========================================
  // 1. RESET STYLE MẶC ĐỊNH (Quan trọng)
  // ==========================================

  // Reset Cạnh
  linkGroup.selectAll("line")
    .filter(d => !persistedBlueEdges.has(d.id.toLowerCase()))
    .attr("stroke", "#999")
    .attr("stroke-width", 2)
    .style("stroke-dasharray", "none");

  // Reset Nút về trạng thái: Fill Đen, Viền #e6be8a, Độ dày 6 (giống mẫu Dijkstra của bạn)
  nodeGroup.selectAll("circle")
    .filter(d => !persistedBlueNodes.has(d.id.toLowerCase()))
    .transition().duration(200)
    .attr("fill", "black")
    .attr("stroke", "#e6be8a") // Màu be chuẩn bạn yêu cầu
    .attr("stroke-width", 6);   // Độ dày viền khớp với UI mẫu

  // ==========================================
  // 2. LOGIC TRỰC QUAN THEO TỪNG BƯỚC KRUSKAL
  // ==========================================

  // --- Bước Khởi tạo & Sắp xếp ---
  if (pseudo === "init" || pseudo === "sort") {
    nodeGroup.selectAll("circle")
      .transition().duration(300)
      .attr("fill", "black")
      .attr("stroke", "#e6be8a") // Đổi viền sang cam để báo hiệu đang xử lý
      .attr("stroke-width", 6);
  }

  // --- Bước Xét cạnh (LOOP) ---
  if (pseudo === "loop") {
    highlightEdges.forEach(e => {
      linkGroup.selectAll("line")
        .filter(d => sameEdge(d.id, e))
        .transition().duration(300)
        .attr("stroke", "#ffc107") // Vàng
        .attr("stroke-width", 6);
    });

    highlightNodes.forEach(n => {
      if (!persistedBlueNodes.has(n.toLowerCase())) {
        nodeGroup.selectAll("circle")
          .filter(d => d.id.toLowerCase() === n)
          .transition().duration(300)
          .attr("fill", "#ffc107")   // Đỉnh đang xét biến thành vàng
          .attr("stroke", "#b28900")
          .attr("stroke-width", 6);
      }
    });
  }

  // --- Bước Chấp nhận (ACCEPT) ---
  if (pseudo === "accept") {
    highlightEdges.forEach(e => {
      const edgeId = e.toLowerCase();
      const [u, v] = edgeId.split("-");
      persistedBlueEdges.add(edgeId);
      persistedBlueEdges.add(`${v}-${u}`);

      linkGroup.selectAll("line")
        .filter(d => sameEdge(d.id, edgeId))
        .transition().duration(400)
        .attr("stroke", "#1565c0") // Xanh dương
        .attr("stroke-width", 5);
    });

    highlightNodes.forEach(n => {
      persistedBlueNodes.add(n.toLowerCase());
      nodeGroup.selectAll("circle")
        .filter(d => d.id.toLowerCase() === n)
        .transition().duration(400)
        .attr("fill", "#1976d2")   // Xanh dương
        .attr("stroke", "#0d47a1")
        .attr("stroke-width", 6);
    });
  }

  // --- Bước Loại bỏ (REJECT) ---
  if (pseudo === "reject") {
    highlightEdges.forEach(e => {
      linkGroup.selectAll("line")
        .filter(d => sameEdge(d.id, e))
        .transition().duration(300)
        .attr("stroke", "#e53935") // Đỏ
        .attr("stroke-width", 6)
        .style("stroke-dasharray", "4 4");
    });
  }

  // --- Bước Kết thúc (END) ---
  if (pseudo === "end") {
    linkGroup.selectAll("line").style("opacity", 0.1);
    nodeGroup.selectAll("circle").style("opacity", 0.5);

    const targetWeightGroup = typeof weightGroup !== 'undefined' ? weightGroup : textGroup;
    targetWeightGroup.selectAll("text").style("opacity", 0);

    Array.from(persistedBlueEdges).forEach((edgeId, i) => {
      setTimeout(() => {
        linkGroup.selectAll("line")
          .filter(d => sameEdge(d.id, edgeId))
          .transition().duration(300)
          .style("opacity", 1)
          .attr("stroke", "#1565c0")
          .attr("stroke-width", 5);

        targetWeightGroup.selectAll("text")
          .filter(d => sameEdge(d.id, edgeId))
          .transition().duration(300)
          .style("opacity", 1)
          .attr("fill", "#0d47a1")
          .style("font-weight", "bold");
      }, i * 150);
    });

    Array.from(persistedBlueNodes).forEach((nodeId, i) => {
      setTimeout(() => {
        nodeGroup.selectAll("circle")
          .filter(d => d.id.toLowerCase() === nodeId)
          .transition().duration(300)
          .style("opacity", 1)
          .attr("fill", "#1976d2")
          .attr("stroke", "#0d47a1")
          .attr("stroke-width", 6);
      }, i * 100);
    });
  }

  // ==========================================
  // 3. UI & MÃ GIẢ
  // ==========================================
  updateStateDisplay(cur);
  highlightStep(cur);
  renderStepsList();

  setTimeout(() => {
    const container = document.getElementById("dynamic-steps-area");
    const activeEntry = container?.querySelector(".step-entry.active");
    if (container && activeEntry) {
      container.scrollTo({
        top: activeEntry.offsetTop - container.offsetTop - (container.clientHeight / 2),
        behavior: "smooth"
      });
    }
  }, 100);
}





function sameEdge(eid1, eid2) {
  const [a1, b1] = eid1.toLowerCase().split("-");
  const [a2, b2] = eid2.toLowerCase().split("-");
  return (a1 === a2 && b1 === b2) || (a1 === b2 && b1 === a2);
}

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
  updateStateDisplay(serverSteps[currentStepIndex]);
}

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

async function play() {
  if (running) return;

  // Nếu chưa có các bước (chưa chạy thuật toán lần nào)
  if (!serverSteps || serverSteps.length === 0) {
    await runDijkstra(); // Gọi hàm đã sửa ở trên
    return;
  }

  // Nếu đã chạy xong rồi mà bấm Play lại thì reset về đầu
  if (currentStepIndex >= serverSteps.length - 1) {
    currentStepIndex = 0;
    resetStyles();
    persistedBlueEdges.clear();
    persistedBlueNodes.clear();
  }

  running = true;
  speechSynthesis.cancel();

  await applyStepVisuals(currentStepIndex);
  renderStepsList();

  if (voiceEnabled) {
    speakCurrentStep(() => stepNextLoop());
  } else {
    stepNextLoop();
  }
}


function speakCurrentStep(onDone) {

  // 🔥 NẾU TẮT VOICE → CHẠY NGAY
  if (!voiceEnabled) {
    onDone && onDone();
    return;
  }

  const step = serverSteps[currentStepIndex];
  if (!step) {
    onDone && onDone();
    return;
  }

  speechSynthesis.cancel();

  let voices = speechSynthesis.getVoices();
  if (!voices.length) {
    setTimeout(() => speakCurrentStep(onDone), 100);
    return;
  }

  let text = step.Explain || step.Pseudo;

  const utter = new SpeechSynthesisUtterance(text);
  const viVoice = voices.find(v => v.lang.startsWith("vi"));
  utter.voice = viVoice || null;
  utter.lang = viVoice ? "vi-VN" : "en-US";
  utter.rate = 0.9;

  utter.onend = () => {
    onDone && onDone(); // ✅ QUAN TRỌNG
  };

  speechSynthesis.speak(utter);
}



let voiceEnabled = true;
function toggleVoice() {
  voiceEnabled = !voiceEnabled;

  document.getElementById("toggleVoice").innerText =
    voiceEnabled ? "🔊 Voice: ON" : "🔇 Voice: OFF";

  speechSynthesis.cancel(); // chỉ hủy voice, KHÔNG đụng auto
}




async function stepNextLoop() {
  if (!running) return;

  const speedVal = +document.getElementById("speed")?.value || 3;
  const duration = Math.max(500, Math.round(5000 / speedVal));

  if (currentStepIndex >= serverSteps.length - 1) {
    running = false;
    // Tự động gọi hiệu ứng kết thúc khi chạy hết các bước
    const finalStep = serverSteps[currentStepIndex];
    if (finalStep) applyFinalPathVisuals();
    return;
  }

  currentStepIndex++;
  await applyStepVisuals(currentStepIndex);

  // Kiểm tra nếu bước này chứa thông báo "Kết thúc" hoặc đã tìm thấy đích
  const curStep = serverSteps[currentStepIndex];
  if (curStep.Pseudo.includes("Kết thúc") || curStep.Pseudo.includes("Tìm thấy đường đi")) {
    running = false;
    applyFinalPathVisuals(); // Hàm vẽ đường xanh dương
    return;
  }

  speakCurrentStep(() => {
    if (!running) return;
    stepTimer = setTimeout(() => { stepNextLoop(); }, duration);
  });
}


function applyFinalPath(step) {

  // 1. Ẩn toàn bộ
  d3.selectAll(".node")
    .style("opacity", 0.1)
    .style("fill", "#ccc");

  d3.selectAll(".edge")
    .style("opacity", 0.1)
    .style("stroke", "#ccc");

  // 2. Vẽ lại CẠNH đường đi ngắn nhất
  step.acceptedEdges.forEach(id => {
    d3.select(`#edge-${id}`)
      .style("opacity", 1)
      .style("stroke", "#1e90ff")
      .style("stroke-width", 4);
  });

  // 3. Vẽ lại ĐỈNH đường đi ngắn nhất
  step.acceptedNodes.forEach(n => {
    d3.select(`#node-${n}`)
      .style("opacity", 1)
      .style("fill", "#1e90ff");
  });
}


function pause() {
  running = false;
  if (stepTimer) {
    clearTimeout(stepTimer);
    stepTimer = null;
  }
}

function colorizeStateText(text) {
  if (!text) return "";

  return text.replace(
    /([a-zA-Z0-9]+)\s*:\s*([^\s,}]+)/g,
    (m, node, value) => {
      return `<span class="state-node" data-node="${node.toLowerCase()}">${node}:${value}</span>`;
    }
  );
}

function updateStateDisplay(step) {
  if (!step) return;

  document.getElementById("stateT").innerHTML =
    "Close = " + colorizeStateText(step.StateT || "{}");

  document.getElementById("stateQ").innerHTML =
    "Open = " + colorizeStateText(step.StateQ || "{}");

  document.getElementById("stateH").innerHTML =
    "H = " + colorizeStateText(step.StateH || "[]");

  document.getElementById("dist-state").innerHTML =
    "Sum = " + colorizeStateText(step.StateDist || "{}");

  document.getElementById("pre-state").innerHTML =
    "MST = " + colorizeStateText(step.StatePre || "{}");

  syncStateColors();
}

function syncStateColors() {
  document.querySelectorAll(".state-node").forEach((el) => {
    const id = el.dataset.node;
    const node = d3.select(`#node-${id}`);

    // mặc định state luôn xám
    let color = "#9ca3af";

    if (!node.empty()) {
      const fill = node.attr("fill");

      // chỉ khi node đã được tô màu thuật giải
      if (fill && fill !== "#000" && fill !== "black") {
        color = fill;
      }
    }

    el.style.color = color;
    el.style.fontWeight = "bold";
  });
}


function prevStep() {
  if (!serverSteps || currentStepIndex <= 0) return;

  speechSynthesis.cancel();

  currentStepIndex--;

  applyStepVisuals(currentStepIndex);
  renderState(serverSteps[currentStepIndex]);
  renderStepsList();

  if (voiceEnabled) {
    speakCurrentStep(() => {
      if (running) stepNextLoop();
    });
  } else {
    if (running) {
      const speedVal = +document.getElementById("speed")?.value || 3;
      const duration = Math.max(500, Math.round(5000 / speedVal));

      stepTimer = setTimeout(() => {
        if (running) stepNextLoop();
      }, duration);
    }
  }

}
function nextStep() {
  if (!serverSteps || serverSteps.length === 0) return;

  speechSynthesis.cancel();

  if (stepTimer) {
    clearTimeout(stepTimer);
    stepTimer = null;
  }

  currentStepIndex = Math.min(serverSteps.length - 1, currentStepIndex + 1);

  applyStepVisuals(currentStepIndex);
  renderStepsList();
  renderState(serverSteps[currentStepIndex]);

  if (voiceEnabled) {
    speakCurrentStep(() => {
      if (running) stepNextLoop();
    });
  } else {
    if (running) {
      const speedVal = +document.getElementById("speed")?.value || 3;
      const duration = Math.max(500, Math.round(5000 / speedVal));

      stepTimer = setTimeout(() => {
        if (running) stepNextLoop();
      }, duration);
    }
  }
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

  if (src === tgt) {
    showNotification("Không thể nối chính nó", "error");
    return;
  }

  const sourceNode = nodes.find(n => n.id === src);
  const targetNode = nodes.find(n => n.id === tgt);

  if (!sourceNode || !targetNode) {
    showNotification("Node không tồn tại", "error");
    return;
  }

  // kiểm tra cạnh trùng
  const exists = links.find(l => sameEdge(l.id, `${src}-${tgt}`));
  if (exists) {
    showNotification("Cạnh đã tồn tại", "error");
    return;
  }

  const weight = wRaw !== "" ? Number(wRaw) : 1;
  const newEdge = {
    source: src,
    target: tgt,
    weight,
    id: `${src}-${tgt}`
  };

  // 1️⃣ thêm vào data
  links.push(newEdge);

  // 2️⃣ append line (vẽ từ source ra)
  const line = linkGroup
    .append("line")
    .datum(newEdge)
    .attr("id", "edge-" + newEdge.id)
    .attr("stroke", "#999")
    .attr("stroke-width", 2)
    .attr("x1", sourceNode.x)
    .attr("y1", sourceNode.y)
    .attr("x2", sourceNode.x)
    .attr("y2", sourceNode.y)
    .style("opacity", 0);

  // 3️⃣ animate kéo tới target
  line
    .transition()
    .duration(600)
    .style("opacity", 1)
    .attr("x2", targetNode.x)
    .attr("y2", targetNode.y);

  // 4️⃣ append weight
  const weightText = weightGroup
    .append("text")
    .datum(newEdge)
    .attr("class", "weight")
    .attr("text-anchor", "middle")
    .attr("font-size", 18)
    .attr("fill", "#000")
    .style("opacity", 0)
    .text(weight);

  weightText
    .transition()
    .delay(500)
    .duration(300)
    .style("opacity", 1);

  // 5️⃣ cập nhật simulation (KHÔNG restart)
  simulation.force("link").links(links);
  simulation.alpha(0.3).restart();

  // clear input
  document.getElementById("fromNode").value = "";
  document.getElementById("toNode").value = "";
  document.getElementById("edgeValue").value = "";

  showNotification(`Đã thêm cạnh ${src}-${tgt}`, "success");
}


function removeEdge() {
  const src = normId(document.getElementById("fromNode").value);
  const tgt = normId(document.getElementById("toNode").value);
  if (!src || !tgt) {
    showNotification("Nhập source và target để xóa cạnh", "error");
    return;
  }
  const idx = links.findIndex((l) => {
    const { s, t } = getEndpoints(l);
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

function resetGraph() {
  // 1. Dừng các hoạt động hiện tại
  stopAnimation();
  if (speechSynthesis) speechSynthesis.cancel();

  // 2. Reset dữ liệu bước chạy
  serverSteps = [];
  currentStepIndex = -1;
  persistedBlueEdges.clear();
  persistedBlueNodes.clear();

  // 3. CẬP NHẬT BIẾN TOÀN CỤC (Không dùng let/const ở đây)
  // Gán lại mảng gốc để các hàm vẽ (restart) nhận diện được dữ liệu mới
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
  ];

  // 4. UI Reset
  renderStepsList();
  resetStyles();

  // 5. Quan trọng: Khởi động lại simulation với dữ liệu mới
  // Hàm restart của bạn đã có logic linkGroup.selectAll("line").remove() nên nó sẽ dọn dẹp SVG cũ
  restart();

  // 6. Chạy lại hiệu ứng xuất hiện (tùy chọn)
  setTimeout(() => {
    spawnNodes();
    // Đợi node hiện xong rồi hiện cạnh
    setTimeout(showEdgesGradually, nodes.length * 150 + 200);
  }, 300);

  // 7. Đóng bảng hướng dẫn nếu đang mở
  const contentWrapper = document.getElementById('content-wrapper');
  if (contentWrapper) {
    contentWrapper.classList.remove('explain-open');
    contentWrapper.classList.remove('explain');
  }

  const explanationWrapper = document.getElementById('explanation-wrapper');
  if (explanationWrapper) {
    explanationWrapper.classList.remove('show-steps');
  }
}

const PRESET_POSITIONS = [
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



async function renderRandomGraphFromDB() {
  try {
    const response = await fetch(`http://localhost:5107/api/graphs`);
    const allGraphs = await response.json();
    if (!allGraphs || allGraphs.length === 0) return;

    const gData = allGraphs[Math.floor(Math.random() * allGraphs.length)];
    const rawNodes = JSON.parse(gData.nodes);
    const rawLinks = JSON.parse(gData.links);

    const offsetLeft = 150;

    nodes.length = 0;
    rawNodes.forEach(n => {
      nodes.push({
        ...n,
        x: n.x - offsetLeft,
        y: n.y,
        fx: n.x - offsetLeft,
        fy: n.y
      });
    });

    // ===== Links =====
    links.length = 0;
    rawLinks.forEach(l => {
      const sId = typeof l.source === 'object' ? l.source.id : l.source;
      const tId = typeof l.target === 'object' ? l.target.id : l.target;

      const sourceNode = nodes.find(n => n.id === sId);
      const targetNode = nodes.find(n => n.id === tId);

      if (sourceNode && targetNode) {
        links.push({
          source: sourceNode,
          target: targetNode,
          weight: parseInt(l.weight) || 1,
          id: l.id || `${sId}-${tId}`
        });
      }
    });

    // ===== Reset trạng thái =====
    persistedBlueEdges = new Set();
    persistedBlueNodes = new Set();

    // ===== VẼ LẠI =====
    restart();

    // 🔥🔥🔥 PHẦN QUAN TRỌNG: HIỆN TRỌNG SỐ 🔥🔥🔥
    weightGroup
      .selectAll("text")
      .data(links, d => d.id)
      .join("text")
      .attr("class", "weight")
      .attr("fill", "#000")
      .attr("font-size", 18)
      .attr("text-anchor", "middle")
      .style("opacity", 1)
      .text(d => d.weight);

    // cập nhật vị trí trọng số ngay
    weightGroup
      .selectAll("text")
      .attr("x", d => (d.source.x + d.target.x) / 2)
      .attr("y", d => (d.source.y + d.target.y) / 2);

    // ===== DỪNG SIMULATION ĐỂ GIỮ NGUYÊN =====
    simulation.alpha(0);
    simulation.stop();

    console.log("Đã render đồ thị + hiện trọng số:", gData.name);

  } catch (err) {
    console.error("Lỗi renderRandomGraphFromDB:", err);
  }
}

const STEP_WINDOW_SIZE = 6;

function renderStepsList() {
  const container = document.getElementById("dynamic-steps-area");
  if (!container || !serverSteps?.length) return;

  container.innerHTML = "";

  const WINDOW_SIZE = 6;
  const curIndex = Math.max(currentStepIndex, 0);
  const curStep = serverSteps[curIndex];

  // =========================
  // TITLE (theo pseudo)
  // =========================
  const titleDiv = document.createElement("div");
  titleDiv.className = "step-title";
  titleDiv.style.fontWeight = "bold";
  titleDiv.style.color = "#fff";
  titleDiv.style.fontFamily = "Courier New, monospace";
  titleDiv.style.marginBottom = "10px";

  switch (curStep.Pseudo) {
    case "init":
      titleDiv.innerText = "BƯỚC 1: KHỞI TẠO TẬP HỢP ĐỈNH";
      break;
    case "loop":
      titleDiv.innerText = "BƯỚC 2: DUYỆT CÁC CẠNH THEO TRỌNG SỐ";
      break;
    case "accept":
      titleDiv.innerText = "BƯỚC 3: CHẤP NHẬN CẠNH";
      break;
    case "reject":
      titleDiv.innerText = "BƯỚC 4: LOẠI BỎ CẠNH (CHU TRÌNH)";
      break;
    case "end":
      titleDiv.innerText = "KẾT THÚC THUẬT TOÁN";
      break;
    default:
      titleDiv.innerText = "CÁC BƯỚC THUẬT TOÁN";
  }

  container.appendChild(titleDiv);

  // =========================
  // STEP WINDOW (6 bước)
  // =========================
  let start = Math.max(0, curIndex - Math.floor(WINDOW_SIZE / 2));
  let end = start + WINDOW_SIZE;

  if (end > serverSteps.length) {
    end = serverSteps.length;
    start = Math.max(0, end - WINDOW_SIZE);
  }

  const displaySteps = serverSteps.slice(start, end);

  // =========================
  // RENDER
  // =========================
  displaySteps.forEach((s, i) => {
    const realIndex = start + i;

    const div = document.createElement("div");
    div.className = "step-entry";

    if (realIndex === curIndex) div.classList.add("active");
    else if (realIndex < curIndex) div.classList.add("done");

    const cleanStep = s.Step
      .replace(/^Step\s*/i, "")        // bỏ chữ "Step"
      .replace(/^\d+(\.\d+)*:\s*/, ""); // bỏ "2.3.1:"

    div.innerText = `Bước ${serverSteps.indexOf(s) + 1}: ${cleanStepText(s.Step)}`;


    div.onclick = () => {
      pause();
      goToStep(realIndex);
    };

    container.appendChild(div);
  });
}



function cleanStepText(text) {
  return text
    .replace(/^BƯỚC\s*\d+(\.\d+)*:\s*/i, "") // bỏ "BƯỚC 2.1:"
    .replace(/^Step\s*\d+(\.\d+)*:\s*/i, ""); // bỏ "Step 2.1:"
}




function goToStep(index) {
  if (!serverSteps || serverSteps.length === 0) return;

  currentStepIndex = Math.max(0, Math.min(index, serverSteps.length - 1));

  const step = serverSteps[currentStepIndex];

  applyStepVisuals(currentStepIndex);
  renderState(step);
  renderStepsList();
}

function renderStep(step) {
  if (!step) return;
  goToStep(serverSteps.indexOf(step));
}

/**
 * @param {object} stepData
 */
function renderState(stepData) {
  if (!stepData || !stepData.State) return;

  const stateString = stepData.State;
  const lines = stateString.split("\n");

  let tState = "";
  let qState = "";
  let hState = "";
  let distState = "";
  let preState = "";

  for (const line of lines) {
    if (line.startsWith("T =")) {
      tState = line.substring(line.indexOf("{"));
    } else if (line.startsWith("Q =")) {
      qState = line.substring(line.indexOf("{"));
    } else if (line.startsWith("H =")) {
      hState = line.substring(line.indexOf("{"));
    } else if (line.startsWith("Dist =")) {
      distState = line.substring(line.indexOf("{"));
    } else if (line.startsWith("Pre =")) {
      preState = line.substring(line.indexOf("{"));
    }
  }

  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.innerText = value;
  };

  setText("stateT", `T = ${tState}`);
  setText("stateQ", `Q = ${qState}`);
  setText("stateH", `H = ${hState}`);
  setText("stateDist", `Dist = ${distState}`);
  setText("statePre", `Pre = ${preState}`);

  setText("pseudo-code", stepData.Pseudo || "");
  setText("explain-text", stepData.Explain || "");
}

async function runDijkstra() {
  stopAnimation();
  serverSteps = [];
  currentStepIndex = -1;
  renderStepsList();

  const payload = {
    Nodes: nodes.map(n => n.id),
    Edges: links.map(l => {
      const { s, t } = getEndpoints(l);
      return {
        From: s,
        To: t,
        Weight: Number(l.weight)
      };
    }),
    Directed: false
  };

  try {
    // 1. Create graph
    const createResp = await fetch(`${SERVER_BASE}/api/graphs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const { id } = await createResp.json();

    // 2. Run Kruskal (KHÔNG start, KHÔNG end)
    const runResp = await fetch(`${SERVER_BASE}/api/graphs/${id}/kruskal`);
    if (!runResp.ok) throw new Error("Run Kruskal failed");

    const runData = await runResp.json();
    serverSteps = runData.pages.flat();
    currentStepIndex = -1;

    renderStepsList();
    play();

  } catch (err) {
    console.error(err);
    showNotification("Lỗi chạy thuật toán Kruskal", "error");
  }
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



const STEP_TO_PSEUDO = [
  { match: "init", key: "init" },   // Khớp với AddStep(..., "init", ...)
  { match: "sort", key: "sort" },   // Khớp với AddStep(..., "sort", ...)
  { match: "loop", key: "loop" },   // Khớp với AddStep(..., "loop", ...)
  { match: "accept", key: "accept" }, // Khớp với AddStep(..., "accept", ...)
  { match: "reject", key: "reject" }, // Khớp với AddStep(..., "reject", ...)
  { match: "end", key: "end" }     // Khớp với AddStep(..., "end", ...)
];


function highlightPseudocode(step) {
  document.querySelectorAll("#pseudocode-panel span")
    .forEach(s => s.classList.remove("active"));

  if (!step || !step.Pseudo) return;

  // 2. Tìm rule khớp chính xác (dùng === thay vì includes để tránh lệch)
  const rule = STEP_TO_PSEUDO.find(r => r.match === step.Pseudo);

  if (rule) {
    const line = document.querySelector(
      `#pseudocode-panel span[data-pc="${rule.key}"]`
    );
    if (line) line.classList.add("active");
  }
}

function highlightStep(step) {
  document
    .querySelectorAll("#pseudocode-panel span")
    .forEach(s => s.classList.remove("active"));

  if (!step || !step.Pseudo) return;

  const rule = STEP_TO_PSEUDO.find(r =>
    step.Pseudo.includes(r.match)
  );

  if (!rule) return;

  const line = document.querySelector(
    `#pseudocode-panel span[data-pc="${rule.key}"]`
  );

  if (line) line.classList.add("active");
}

window.addEventListener('load', () => {
  restart();
  resetStyles();
  d3.selectAll("circle").attr("r", 34);
  d3.selectAll("line").style("opacity", 1);
  d3.selectAll("text").style("opacity", 1);
});



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

restart();
resetStyles();
renderStepsList();
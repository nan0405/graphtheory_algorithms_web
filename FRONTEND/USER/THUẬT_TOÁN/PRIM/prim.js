
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
    document.body.classList.add("playing");
    const btn = document.getElementById("playPauseBtn");

    if (!isPlaying) {
        speechSynthesis.cancel();

        play();
        btn.textContent = "⏸";
        document.body.classList.remove("controls-hidden");
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


function togglePlayPause() {
    document.body.classList.add("playing");
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
        .attr("r", 34)
        .attr("cx", (d) => d.x)
        .attr("cy", (d) => d.y);

    labelGroup
        .selectAll("text")
        .attr("x", centerX)
        .attr("y", centerY)
        .style("opacity", 0)
        .transition()
        .delay((d, i) => i * 200 + 500)
        .duration(700)
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

    const stateDisplay = document.getElementById("state-display");
    if (stateDisplay) {
        stateDisplay.style.display = "block";
    }

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
                .attr("fill", "#000000ff");
        }
    }


    if (pseudo.includes("Append(T,")) {
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

            nodeGroup
                .selectAll("circle")
                .filter((d) => [a, b].includes(d.id.toLowerCase()))
                .each((d) => persistedBlueNodes.add(d.id.toLowerCase()))
                .transition()
                .duration(400)
                .attr("fill", "#1976d2")
                .attr("stroke", "#0d47a1")
                .attr("stroke-width", 6);
        }
    }

    if (pseudo.includes("Xét cạnh")) {
        for (const e of highlightEdges) {
            const [a, b] = e.split("-");
            linkGroup
                .selectAll("line")
                .filter((d) => sameEdge(d.id, e))
                .transition()
                .duration(200)
                .attr("stroke", "#e53935")
                .attr("stroke-width", 5);

            nodeGroup
                .selectAll("circle")
                .filter((d) => d.id.toLowerCase() === b.toLowerCase())
                .transition()
                .duration(200)
                .attr("fill", "#e53935")
                .attr("stroke", "#b71c1c")
                .attr("stroke-width", 6);
        }
    }

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

            nodeGroup
                .selectAll("circle")
                .filter((d) => d.id.toLowerCase() === b.toLowerCase())
                .transition()
                .duration(350)
                .attr("fill", "#00e676")
                .attr("stroke", "#00c853")
                .attr("stroke-width", 6);
        }
    }

    if (pseudo.includes("≤")) {
        for (const e of highlightEdges) {
            const [a, b] = e.split("-");
            linkGroup
                .selectAll("line")
                .filter((d) => sameEdge(d.id, e))
                .transition()
                .duration(300)
                .attr("stroke", "#999")
                .attr("stroke-width", 2);

            nodeGroup
                .selectAll("circle")
                .filter((d) => [a, b].includes(d.id.toLowerCase()))
                .transition()
                .duration(300)
                .attr("fill", "#999")
                .attr("stroke", "#777");
        }
    }



    if (pseudo.includes("Kết quả: ")) {
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

        // 2️ Lấy danh sách đã chốt
        const edges = Array.from(persistedBlueEdges);
        const nodes = Array.from(persistedBlueNodes);

        // 3️ Sau khi ẩn xong → hiện lại dần từng cạnh/đỉnh
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

    linkGroup.selectAll("line").each(function (d) {
        const id = d.id.toLowerCase();
        if (
            persistedBlueEdges.has(id) ||
            persistedBlueEdges.has(id.split("-").reverse().join("-"))
        ) {
            d3.select(this).attr("stroke", "#1565c0").attr("stroke-width", 4);
        }
    });

    nodeGroup.selectAll("circle").each(function (d) {
        if (persistedBlueNodes.has(d.id.toLowerCase())) {
            d3.select(this)
                .attr("fill", "#1976d2")
                .attr("stroke", "#0d47a1")
                .attr("stroke-width", 6);
        }
    });
    updateStateDisplay(cur);
    highlightPseudocode(cur);
    highlightStep(cur);

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

function getStartNodeFromInput() {
    const input = document.getElementById("startNodeInput");
    if (!input) return null;

    const value = input.value.trim().toLowerCase();
    return value || null;
}

async function play() {
    // Đang chạy thì khỏi play lại
    if (running) return;

    document.getElementById('content-wrapper').classList.add('explain');
    // Nếu chưa load steps thì load
    if (!serverSteps || serverSteps.length === 0) {
        try {
            const startNode = getStartNodeFromInput();

            if (!startNode) {
                showNotification("Vui lòng nhập đỉnh bắt đầu", "error");
                return;
            }

            const exists = nodes.some(n => n.id === startNode);
            if (!exists) {
                showNotification(`Đỉnh '${startNode}' không tồn tại`, "error");
                return;
            }

            try {
                await runDijkstra(startNode);
            } catch (err) {
                showNotification(err.message, "error");
                return;
            }
        } catch (err) {
            console.error(err);
            alert("Không thể lấy steps: " + err.message);
            return;
        }
    }

    // Nếu đã chạy hết → chạy lại từ đầu
    if (currentStepIndex >= serverSteps.length - 1 || currentStepIndex < 0) {
        currentStepIndex = 0;
        resetStyles();
    }

    running = true;
    speechSynthesis.cancel(); // Ngắt mọi voice cũ

    // Render bước hiện tại (có thể là 1.1 hoặc giữa chừng)
    await applyStepVisuals(currentStepIndex);
    renderState(serverSteps[currentStepIndex]);
    renderStepsList();

    // Bật voice cho bước đang đứng
    if (voiceEnabled) {
        speakCurrentStep(() => stepNextLoop());
    } else {
        stepNextLoop();
    }
}
function speakCurrentStep(onDone) {
    const step = serverSteps[currentStepIndex];
    if (!step) {
        if (onDone) onDone();
        return;
    }

    let voices = speechSynthesis.getVoices();

    if (!voices.length) {
        setTimeout(() => speakCurrentStep(onDone), 100);
        return;
    }

    if (voiceEnabled)
        speakCurrentStep(() => {
            if (running) {
                setTimeout(stepNextLoop, duration);
            }
        });

    let text = `Bước ${step.Step.replace(".", " phẩy ")}. ${step.Pseudo}`;
    if (step.Explain) text += `. ${step.Explain}`;

    const utter = new SpeechSynthesisUtterance(text);

    const viVoice = voices.find((v) => v.lang && v.lang.startsWith("vi"));
    utter.voice = viVoice || null;
    utter.lang = viVoice ? "vi-VN" : "en-US";

    utter.rate = 0.85;
    utter.pitch = 1;
    utter.volume = 1;

    utter.onend = () => {
        if (onDone) onDone();
    };

    speechSynthesis.speak(utter);
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
        if (serverSteps[currentStepIndex]) {
            renderState(serverSteps[currentStepIndex]);
        }

        renderStepsList();

        if (voiceEnabled) {
            speakCurrentStep(() => {
                if (running) stepNextLoop();
            });
        } else {
            stepTimer = setTimeout(() => {
                if (running) stepNextLoop();
            }, duration);
        }
    } else {
        running = false;
        stepTimer = null;
    }
}

function speakCurrentStep(onDone) {
    const step = serverSteps[currentStepIndex];
    if (!step) {
        if (onDone) onDone();
        return;
    }

    speechSynthesis.cancel(); // luôn ngắt voice cũ

    let voices = speechSynthesis.getVoices();
    if (!voices.length) {
        setTimeout(() => speakCurrentStep(onDone), 120);
        return;
    }

    const speedVal = +document.getElementById("speed")?.value || 3;
    const voiceRate = Math.min(2, Math.max(0.5, speedVal / 3));

    let text = `Bước ${step.Step.replace(".", " chấm ")}. ${step.Explain}`;
    const utter = new SpeechSynthesisUtterance(text);

    const viVoice = voices.find((v) => v.lang.startsWith("vi"));
    utter.voice = viVoice || null;
    utter.lang = viVoice ? "vi-VN" : "en-US";
    utter.rate = voiceRate;
    utter.pitch = 1;
    utter.volume = 1;

    utter.onend = () => onDone && onDone();

    speechSynthesis.speak(utter);
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
        "Dist = " + colorizeStateText(step.StateDist || "{}");

    document.getElementById("pre-state").innerHTML =
        "Pre = " + colorizeStateText(step.StatePre || "{}");

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

function randomGraph() {
    stopAnimation();
    const minN = 5,
        maxN = 12;
    const N = Math.floor(Math.random() * (maxN - minN + 1)) + minN;
    const letters = "abcdefghijklmnopqrstuvwxyz";
    nodes = [];
    links = [];

    const centerX = width / 2;
    const centerY = height / 2;
    const radiusOuter = Math.min(width, height) * 0.38;
    const radiusInner = radiusOuter * 0.55;

    for (let i = 0; i < N; i++) {
        let r, angle;

        if (N <= 8) {
            const angleStep = (2 * Math.PI) / N;
            r = radiusOuter;
            angle = i * angleStep - Math.PI / 2;
        } else {
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
                angle = innerIndex * angleStepInner - Math.PI / 2 + angleStepInner / 2;
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

    let available = nodes.map((n) => n.id);
    let connected = [available.shift()];
    while (available.length > 0) {
        const a = connected[Math.floor(Math.random() * connected.length)];
        const idx = Math.floor(Math.random() * available.length);
        const b = available.splice(idx, 1)[0];
        const w = Math.floor(Math.random() * 20) + 1;
        links.push({ source: a, target: b, weight: w, id: `${a}-${b}` });
        connected.push(b);
    }

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
            links.push({ source: a, target: b, weight: w, id: id1 });
        }
    }

    const maxEdges = Math.max(links.length, Math.floor(N * 2));
    while (links.length > maxEdges) links.pop();

    simulation.force("charge").strength(-600);
    simulation.alpha(1).restart();
    setTimeout(() => simulation.stop(), 1200);

    serverSteps = [];
    currentStepIndex = -1;
    restart();
    resetStyles();
    renderStepsList();

    setTimeout(() => {
        spawnNodes();

        const totalNodeDuration = nodes.length * 250 + 600;

        setTimeout(() => {
            simulation.stop();
            showEdgesGradually();
        }, totalNodeDuration);
    }, 400);
}


function renderStepsList() {
    const container = document.getElementById("dynamic-steps-area");
    if (!container) return;

    container.innerHTML = "";
    if (!serverSteps || serverSteps.length === 0) return;

    const curStep = serverSteps[currentStepIndex] || serverSteps[0];
    const currentMain = curStep.Step.split(".")[0];

    const groupSteps = serverSteps.filter(
        (s) => s.Step.startsWith(currentMain + ".") || s.Step === currentMain
    );

    const titleDiv = document.createElement("div");
    titleDiv.className = "step-title";
    titleDiv.style.fontWeight = "bold";
    titleDiv.style.color = "#fff";
    titleDiv.style.fontfamily = 'Courier New, monospace';
    titleDiv.style.marginBottom = "8px";
    titleDiv.innerText =
        currentMain === "1"
            ? "BƯỚC 1: KHỞI TẠO TẬP HỢP ĐỈNH BAN ĐẦU"
            : `BƯỚC ${currentMain}: Xét các đỉnh trong tập đỉnh Q`;

    container.appendChild(titleDiv);

    let displaySteps = groupSteps;

    if (parseInt(currentMain) > 1) {
        const indexInGroup = groupSteps.findIndex((s) => s === curStep);
        const groupIndex = Math.floor(indexInGroup / 5);

        const start = groupIndex * 5;
        const end = Math.min(start + 5, groupSteps.length);

        displaySteps = groupSteps.slice(start, end);
    }

    displaySteps.forEach((s) => {
        const div = document.createElement("div");
        div.className = "step-entry";

        if (s === curStep) div.classList.add("active");

        div.innerText = `Step ${s.Step}: ${s.Pseudo}`;

        div.onclick = () => {
            pause();
            goToStep(serverSteps.indexOf(s));
        };

        container.appendChild(div);
    });

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

async function runDijkstra(startNode) {
    stopAnimation();
    serverSteps = [];
    currentStepIndex = -1;
    renderStepsList();

    const payload = {
        Nodes: nodes.map(n => n.id),
        Edges: links.map(l => {
            const { s, t } = getEndpoints(l);
            return { From: s, To: t, Weight: Number(l.weight) };
        }),
        Directed: false,
    };

    const createResp = await fetch(`${SERVER_BASE}/api/graphs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    const createData = await createResp.json();
    const id = createData.id;

    const start = startNode || nodes[0]?.id;

    const runResp = await fetch(
        `${SERVER_BASE}/api/graphs/${id}/prim?start=${start}`
    );

    if (!runResp.ok) {
        const err = await runResp.json();
        throw new Error(err.message || "Run Prim failed");
    }

    const runData = await runResp.json();
    serverSteps = runData.pages.flat();
    currentStepIndex = -1;
    renderStepsList();
    play();
}



function startPrimFromUI() {
    const input = document.getElementById("startNodeInput");
    const startNode = input.value.trim().toLowerCase();

    if (!startNode) {
        showNotification("Vui lòng nhập đỉnh bắt đầu", "error");
        return;
    }

    // kiểm tra node có tồn tại không
    const exists = nodes.some(n => n.id === startNode);
    if (!exists) {
        showNotification(`Đỉnh '${startNode}' không tồn tại`, "error");
        return;
    }

    runPrim(startNode);
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
    { match: "Dist[v] := ∞", key: "init-dist" },
    { match: "Dist[", key: "init-start" }, // Khớp với Dist[start] = 0
    { match: "t := get(min", key: "pick-min" },
    { match: "Append(T", key: "add-tree" },
    { match: "Xét cạnh", key: "for" },
    { match: "Dist[v] = w", key: "update-dist" }, // Cần sửa trong PrimService.cs nếu cần
    { match: "Pre[", key: "update-pre" }
];

function highlightPseudocode(step) {
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



// Cấu hình API
const API_EXTRACT_URL = "http://127.0.0.1:8000/api/v1/public/extract";
const API_KEY = "test_key_123";

const imageInput = document.getElementById('image-input');
const extractBtn = document.getElementById('extract-btn');
const loadingStatus = document.getElementById('loading-status');

extractBtn.addEventListener('click', async () => {
    const file = imageInput.files[0];
    if (!file) {
        alert("Vui lòng chọn một tấm ảnh đồ thị trước!");
        return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
        loadingStatus.style.display = 'block';
        extractBtn.disabled = true;

        const response = await fetch(API_EXTRACT_URL, {
            method: 'POST',
            headers: { 'X-API-Key': API_KEY },
            body: formData
        });

        const result = await response.json();

        if (result.status === "success") {
            // GỌI HÀM CHUYỂN ĐỔI DỮ LIỆU
            updateGraphFromJSON(result.data);
            alert("Nhận diện thành công!");
        } else {
            alert("Lỗi: " + result.message);
        }
    } catch (error) {
        console.error("Error:", error);
        alert("Không thể kết nối đến Server AI. Hãy chắc chắn Backend đang chạy.");
    } finally {
        loadingStatus.style.display = 'none';
        extractBtn.disabled = false;
    }
});

/**
 * Hàm quan trọng: Chuyển JSON từ AI sang cấu hình của Dijkstra.js
 */
function updateGraphFromJSON(data) {
    // 1. Chuyển đổi Nodes (Đỉnh)
    // AI trả về: {id: 0, label: "A"} -> Dijkstra cần: {id: "a", x:..., y:...}
    nodes = data.nodes.map((node, index) => ({
        id: node.label.toLowerCase(),
        // Sắp xếp các đỉnh theo hình tròn để dễ nhìn ban đầu
        x: 400 + 200 * Math.cos(2 * Math.PI * index / data.nodes.length),
        y: 250 + 200 * Math.sin(2 * Math.PI * index / data.nodes.length),
        _fixed: false // Cho phép D3 tự dàn hàng
    }));

    // 2. Chuyển đổi Edges (Cạnh)
    // AI trả về: {from: "A", to: "B", weight: 5} -> Dijkstra cần: {source: "a", target: "b", weight: 5, id: "a-b"}
    links = data.edges.map(edge => ({
        source: edge.from.toLowerCase(),
        target: edge.to.toLowerCase(),
        weight: parseFloat(edge.weight) || 1,
        id: `${edge.from.toLowerCase()}-${edge.to.toLowerCase()}`
    }));

    // 3. Làm mới trạng thái thuật toán
    if (typeof resetStyles === 'function') resetStyles();

    // 4. Gọi hàm restart() của Dijkstra.js để vẽ lại đồ thị lên SVG
    if (typeof restart === 'function') {
        restart();
    }
}

// Cấu hình URL backend (thường là cổng 5000 hoặc 5196 tùy cấu hình dotnet)
const API_URL = "http://localhost:5000/api/extract-graph";

async function handleExtractText() {
    const textInput = document.getElementById("text-input").value;
    if (!textInput.trim()) {
        alert("Vui lòng nhập đề bài!");
        return;
    }

    const btn = document.getElementById("extract-text-btn");
    btn.disabled = true;
    btn.innerHTML = "Đang phân tích...";

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: textInput })
        });

        if (!response.ok) throw new Error("Lỗi khi gọi API phân tích.");

        const data = await response.json();
        console.log("Dữ liệu trích xuất:", data);

        // Gọi hàm có sẵn trong dijkstra.js để vẽ lại đồ thị
        updateGraphFromExtraction(data);

        // Cập nhật đỉnh bắt đầu nếu có
        if (data.start) {
            const startSelect = document.getElementById("startNode");
            if (startSelect) startSelect.value = data.start.toLowerCase();
        }

        alert("Phân tích đề bài thành công!");
    } catch (error) {
        console.error(error);
        alert("Có lỗi xảy ra: " + error.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-microchip"></i> Phân tích và Vẽ đồ thị';
    }
}

/**
 * Hàm hỗ trợ cập nhật dữ liệu vào biến nodes và links của dijkstra.js
 */
function updateGraphFromExtraction(data) {
    // 1. Chuyển đổi Nodes (phân bổ vị trí hình tròn)
    nodes = data.vertices.map((v, index) => ({
        id: v.toLowerCase(),
        x: 400 + 200 * Math.cos(2 * Math.PI * index / data.vertices.length),
        y: 300 + 200 * Math.sin(2 * Math.PI * index / data.vertices.length),
        _fixed: false
    }));

    // 2. Chuyển đổi Edges
    links = data.edges.map(edge => ({
        source: edge.from.toLowerCase(),
        target: edge.to.toLowerCase(),
        weight: parseFloat(edge.weight) || 1,
        id: `${edge.from.toLowerCase()}-${edge.to.toLowerCase()}`
    }));

    // 3. Vẽ lại đồ thị
    if (typeof restart === 'function') {
        restart(); // Hàm có sẵn trong mã của bạn để cập nhật SVG
    }
}


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


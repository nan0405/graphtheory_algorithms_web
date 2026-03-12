/**
 * visualizer.js
 * =============
 * Graph Algorithm AST Runtime & Visualization Platform – Frontend
 *
 * Replaces the hard-coded DijkstraService with a generic API call
 * to POST /api/algorithm/run, which drives any DSL-defined algorithm.
 *
 * Compatible with the existing D3.js graph UI from dijkstra.js.
 */

"use strict";

// ──────────────────────────────────────────────────────────────────────────────
// Shared state
// ──────────────────────────────────────────────────────────────────────────────

const API_BASE = "";          // same-origin (served by FastAPI)
let selectedAlgorithm = "Dijkstra";

let persistedBlueEdges = new Set();
let persistedBlueNodes = new Set();

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

svg.append("defs").append("marker")
    .attr("id", "arrow")
    .attr("viewBox", "0 -5 10 10")
    .attr("refX", 25).attr("refY", 0)
    .attr("markerWidth", 6).attr("markerHeight", 6)
    .attr("orient", "auto")
    .append("path").attr("d", "M0,-5L10,0L0,5").attr("fill", "#ffc107");

let simulation = d3.forceSimulation()
    .force("link", d3.forceLink().id(d => d.id).distance(110))
    .force("charge", d3.forceManyBody().strength(-400))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("collide", d3.forceCollide().radius(40))
    .force("x", d3.forceX(width / 2).strength(0.05))
    .force("y", d3.forceY(height / 2).strength(0.05));

let linkGroup = svg.append("g").attr("class", "links");
let nodeGroup = svg.append("g").attr("class", "nodes");
let labelGroup = svg.append("g").attr("class", "labels");
let weightGroup = svg.append("g").attr("class", "weights");

// Timeline state
let serverSteps = [];
let currentStepIndex = -1;
let running = false;
let stepTimer = null;
let isPlaying = false;
let voiceEnabled = true;

let notificationTimer = null;


// ──────────────────────────────────────────────────────────────────────────────
// Algorithm selector (populated from API)
// ──────────────────────────────────────────────────────────────────────────────

async function loadAlgorithmList() {
    try {
        const r = await fetch(`${API_BASE}/api/algorithm/list`);
        const data = await r.json();
        const sel = document.getElementById("algorithmSelect");
        if (!sel) return;
        sel.innerHTML = "";
        (data.algorithms || []).forEach(name => {
            const opt = document.createElement("option");
            opt.value = name;
            opt.text = name;
            sel.appendChild(opt);
        });
        if (data.algorithms.length > 0) {
            selectedAlgorithm = data.algorithms[0];
            sel.value = selectedAlgorithm;
        }

        // Update pseudocode panel title
        const h3 = document.querySelector("#pseudocode-panel h3");
        if (h3) h3.textContent = `PSEUDOCODE – ${selectedAlgorithm}`;

        sel.addEventListener("change", e => {
            selectedAlgorithm = e.target.value;
            const h3 = document.querySelector("#pseudocode-panel h3");
            if (h3) h3.textContent = `PSEUDOCODE – ${selectedAlgorithm}`;
            const stepTitle = document.querySelector("#steps h3");
            if (stepTitle) stepTitle.textContent = `STEP – ${selectedAlgorithm}`;
        });
    } catch (err) {
        console.warn("Could not load algorithm list:", err);
    }
}


// ──────────────────────────────────────────────────────────────────────────────
// 🔥 Core API call: replaces runDijkstra()
// ──────────────────────────────────────────────────────────────────────────────

async function runAlgorithm() {
    stopAnimation();
    serverSteps = [];
    currentStepIndex = -1;
    renderStepsList();

    const startInput = document.getElementById("startNodeInput")?.value.trim().toLowerCase();
    const endInput = document.getElementById("endNodeInput")?.value.trim().toLowerCase();

    if (!startInput || !nodes.find(n => n.id === startInput)) {
        showNotification("Vui lòng nhập đỉnh bắt đầu hợp lệ", "error");
        return;
    }

    // Build graph payload
    const nodeIds = nodes.map(n => n.id);
    const edgeList = links.map(l => {
        const { s, t } = getEndpoints(l);
        return { source: s, target: t, weight: Number(l.weight), id: l.id || `${s}-${t}` };
    });

    const payload = {
        algorithmName: selectedAlgorithm,
        graph: {
            nodes: nodeIds,
            edges: edgeList,
            directed: false,
        },
        startNode: startInput,
        endNode: endInput || null,
    };

    try {
        const resp = await fetch(`${API_BASE}/api/algorithm/run`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        if (!resp.ok) {
            const err = await resp.json().catch(() => ({}));
            throw new Error(err.detail || resp.statusText);
        }

        const data = await resp.json();
        // Normalize step format from new API
        serverSteps = (data.steps || []).map((s, i) => normalizeStep(s, i));
        currentStepIndex = -1;

        renderStepsList();
        play();

    } catch (err) {
        console.error(err);
        showNotification("Lỗi kết nối Server: " + err.message, "error");
    }
}


/**
 * normalizeStep: maps new API response format → internal step format
 * New format:
 *   { pseudo, voice, highlight: {nodes:[], edges:[]},
 *     dist, prev, openSet, closedSet, visited, currentNode,
 *     finalPath, isFinal }
 */
function normalizeStep(raw, idx) {
    return {
        // Internal compat keys
        Step: String(idx + 1),
        Pseudo: raw.pseudo || "",
        Explain: raw.voice || raw.pseudo || "",
        Voice: raw.voice || "",

        // Highlight
        Highlight: {
            Nodes: (raw.highlight?.nodes || []),
            Edges: (raw.highlight?.edges || []),
        },

        // State data
        dist: raw.dist || {},
        prev: raw.prev || {},
        openSet: raw.openSet || [],
        closedSet: raw.closedSet || [],
        visited: raw.visited || [],
        currentNode: raw.currentNode || null,
        finalPath: raw.finalPath || [],
        isFinal: raw.isFinal || false,

        // Legacy state strings for existing updateStateDisplay
        StateT: formatSet(raw.closedSet || []),
        StateQ: formatSet(raw.openSet || []),
        StateH: "[]",
        StateDist: formatDict(raw.dist || {}),
        StatePre: formatDict(raw.prev || {}),
        State: buildStateString(raw),
    };
}

function formatSet(arr) {
    if (!arr || arr.length === 0) return "{}";
    return "{ " + [...arr].join(", ") + " }";
}

function formatDict(obj) {
    if (!obj || Object.keys(obj).length === 0) return "{}";
    const parts = Object.entries(obj).map(([k, v]) => `${k}: ${v === null ? "null" : v}`);
    return "{ " + parts.join(", ") + " }";
}

function buildStateString(raw) {
    return [
        `T = ${formatSet(raw.closedSet || [])}`,
        `Q = ${formatSet(raw.openSet || [])}`,
        `H = []`,
        `Dist = ${formatDict(raw.dist || {})}`,
        `Pre = ${formatDict(raw.prev || {})}`,
    ].join("\n");
}


// ──────────────────────────────────────────────────────────────────────────────
// Visual application
// ──────────────────────────────────────────────────────────────────────────────

async function applyStepVisuals(stepIndex, silent = false) {
    if (!serverSteps || serverSteps.length === 0) return;
    const cur = serverSteps[stepIndex];
    if (!cur) return;

    if (typeof persistedBlueEdges === "undefined") persistedBlueEdges = new Set();
    if (typeof persistedBlueNodes === "undefined") persistedBlueNodes = new Set();

    document.getElementById("state-display").style.display = "block";

    const pseudo = cur.Pseudo || "";
    const highlightEdges = (cur.Highlight?.Edges || []).map(e => e.toLowerCase());
    const highlightNodes = (cur.Highlight?.Nodes || []).map(n => n.toLowerCase());

    // ── Final path animation ───────────────────────────────────────
    if (cur.isFinal && cur.finalPath && cur.finalPath.length > 0) {
        applyFinalPath(cur);
        updateStateDisplay(cur);
        highlightPseudocodeByVoice(pseudo);
        renderStepsList();
        return;
    }

    // ── Node highlighting based on context ────────────────────────
    if (!silent) {
        // Current node being extracted = RED
        if (cur.currentNode && !persistedBlueNodes.has(cur.currentNode.toLowerCase())) {
            nodeGroup.selectAll("circle")
                .filter(d => d.id.toLowerCase() === cur.currentNode.toLowerCase())
                .transition().duration(300)
                .attr("fill", "#e53935").attr("stroke", "#b71c1c").attr("stroke-width", 6);
        }

        // Neighbor highlight = YELLOW (if updating dist)
        highlightNodes.forEach(n => {
            if (!persistedBlueNodes.has(n)) {
                nodeGroup.selectAll("circle")
                    .filter(d => d.id.toLowerCase() === n)
                    .transition().duration(300)
                    .attr("fill", "#ffc107").attr("stroke", "#b28900").attr("stroke-width", 6);
            }
        });

        // Dist update → GREEN
        if (pseudo.includes("Dist[") || pseudo.includes("Cập nhật")) {
            highlightNodes.forEach(n => {
                if (!persistedBlueNodes.has(n)) {
                    nodeGroup.selectAll("circle")
                        .filter(d => d.id.toLowerCase() === n)
                        .transition().duration(300)
                        .attr("fill", "#00e676").attr("stroke", "#00c853").attr("stroke-width", 6);
                }
            });
        }

        // Edges being considered
        highlightEdges.forEach(e => {
            if (!persistedBlueEdges.has(e)) {
                linkGroup.selectAll("line")
                    .filter(d => sameEdge(d.id, e))
                    .transition().duration(300)
                    .attr("stroke", "#ffc107").attr("stroke-width", 4);
            }
        });
    }

    // ── ClosedSet/Visited → BLUE (permanent) ─────────────────────
    const closedSet = cur.closedSet || [];
    closedSet.forEach(n => {
        const nodeId = n.toLowerCase();
        if (!persistedBlueNodes.has(nodeId)) {
            persistedBlueNodes.add(nodeId);
            nodeGroup.selectAll("circle")
                .filter(d => d.id.toLowerCase() === nodeId)
                .transition().duration(400)
                .attr("fill", "#1976d2").attr("stroke", "#0d47a1").attr("stroke-width", 6).style("opacity", 1);
        }
    });

    updateStateDisplay(cur);
    highlightPseudocodeByVoice(pseudo);
    renderStepsList();

    // Auto-scroll step list
    setTimeout(() => {
        const container = document.getElementById("dynamic-steps-area");
        const activeEntry = container?.querySelector(".step-entry.active");
        if (container && activeEntry) {
            const pr = container.getBoundingClientRect();
            const cr = activeEntry.getBoundingClientRect();
            if (cr.top < pr.top || cr.bottom > pr.bottom) {
                container.scrollTo({
                    top: activeEntry.offsetTop - container.offsetTop - container.clientHeight / 2,
                    behavior: "smooth",
                });
            }
        }
    }, 100);
}


function highlightPseudocodeByVoice(pseudo) {
    document.querySelectorAll("#pseudocode-panel span").forEach(el => {
        el.classList.remove("active");
    });
    // Match pseudocode lines that start with the same prefix
    document.querySelectorAll("#pseudocode-panel span").forEach(el => {
        if (pseudo && el.textContent.trim().length > 3) {
            const elText = el.textContent.trim().toLowerCase();
            const pseudoLower = pseudo.toLowerCase();
            if (pseudoLower.includes(elText.substring(0, 8)) ||
                elText.includes(pseudo.substring(0, 8))) {
                el.classList.add("active");
            }
        }
    });
}


function applyFinalPath(step) {
    const path = step.finalPath || [];
    if (!path.length) return;

    // Build path edge ids
    const pathEdges = [];
    for (let i = 0; i < path.length - 1; i++) {
        pathEdges.push(`${path[i]}-${path[i + 1]}`);
        pathEdges.push(`${path[i + 1]}-${path[i]}`);
    }

    // Fade everything
    linkGroup.selectAll("line").transition().duration(300).style("opacity", 0.15);
    nodeGroup.selectAll("circle").transition().duration(300).style("opacity", 0.2);
    weightGroup.selectAll("text").transition().duration(300).style("opacity", 0.15);

    // Highlight path edges
    pathEdges.forEach((eid, i) => {
        setTimeout(() => {
            linkGroup.selectAll("line")
                .filter(d => sameEdge(d.id, eid))
                .transition().duration(300).style("opacity", 1)
                .attr("stroke", "#f9c74f").attr("stroke-width", 5);
            weightGroup.selectAll("text")
                .filter(d => sameEdge(d.id, eid))
                .transition().duration(300).style("opacity", 1).attr("fill", "#f9c74f");
        }, i * 120);
    });

    // Highlight path nodes
    path.forEach((nodeId, i) => {
        setTimeout(() => {
            nodeGroup.selectAll("circle")
                .filter(d => d.id.toLowerCase() === nodeId.toLowerCase())
                .transition().duration(300).style("opacity", 1)
                .attr("fill", "#f9c74f").attr("stroke", "#e07b00").attr("stroke-width", 6);
        }, i * 120);
    });
}


// ──────────────────────────────────────────────────────────────────────────────
// State display
// ──────────────────────────────────────────────────────────────────────────────

function colorizeStateText(text) {
    return text.replace(/\b([a-zA-Z_]\w*)\b/g, match => {
        const node = document.getElementById(`node-${match}`);
        if (node) {
            const fill = node.getAttribute("fill");
            if (fill && fill !== "#000" && fill !== "black") {
                return `<span class="state-node" data-node="${match}" style="color:${fill};font-weight:bold">${match}</span>`;
            }
        }
        return `<span class="state-node" data-node="${match}">${match}</span>`;
    });
}

function updateStateDisplay(step) {
    if (!step) return;
    document.getElementById("stateT").innerHTML = "Close = " + colorizeStateText(step.StateT || "{}");
    document.getElementById("stateQ").innerHTML = "Open = " + colorizeStateText(step.StateQ || "{}");
    document.getElementById("stateH").innerHTML = "H = " + colorizeStateText(step.StateH || "[]");
    document.getElementById("dist-state").innerHTML = "Dist = " + colorizeStateText(step.StateDist || "{}");
    document.getElementById("pre-state").innerHTML = "Pre = " + colorizeStateText(step.StatePre || "{}");
    syncStateColors();
}

function syncStateColors() {
    document.querySelectorAll(".state-node").forEach(el => {
        const id = el.dataset.node;
        const node = d3.select(`#node-${id}`);
        let color = "#9ca3af";
        if (!node.empty()) {
            const fill = node.attr("fill");
            if (fill && fill !== "#000" && fill !== "black") color = fill;
        }
        el.style.color = color;
        el.style.fontWeight = "bold";
    });
}


// ──────────────────────────────────────────────────────────────────────────────
// Step list rendering
// ──────────────────────────────────────────────────────────────────────────────

function renderStepsList() {
    const container = document.getElementById("dynamic-steps-area");
    if (!container) return;
    container.innerHTML = "";
    if (!serverSteps || serverSteps.length === 0) return;

    serverSteps.forEach((s, i) => {
        const div = document.createElement("div");
        div.className = "step-entry";
        if (i === currentStepIndex) div.classList.add("active");

        const label = s.Pseudo || `Step ${i + 1}`;
        div.textContent = `${i + 1}. ${label}`;
        div.onclick = () => { pause(); goToStep(i); };
        container.appendChild(div);
    });
}

function goToStep(index) {
    if (!serverSteps || serverSteps.length === 0) return;
    // Reset visuals and replay up to index
    resetStyles();
    persistedBlueEdges.clear();
    persistedBlueNodes.clear();
    currentStepIndex = Math.max(0, Math.min(index, serverSteps.length - 1));
    applyStepVisuals(currentStepIndex);
    renderStepsList();
}


// ──────────────────────────────────────────────────────────────────────────────
// Playback
// ──────────────────────────────────────────────────────────────────────────────

function togglePlayPause() {
    document.body.classList.add("playing");
    const btn = document.getElementById("playPauseBtn");

    if (!isPlaying) {
        speechSynthesis.cancel();
        play();
        if (btn) btn.textContent = "⏸";
        isPlaying = true;
    } else {
        speechSynthesis.cancel();
        pause();
        if (btn) btn.textContent = "▶";
        isPlaying = false;
    }
}

async function play() {
    if (running) return;

    if (!serverSteps || serverSteps.length === 0) {
        await runAlgorithm();
        return;
    }

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

function pause() {
    running = false;
    if (stepTimer) { clearTimeout(stepTimer); stepTimer = null; }
}

function stopAnimation() {
    running = false;
    if (stepTimer) { clearTimeout(stepTimer); stepTimer = null; }
}

function stepNextLoop() {
    if (!running) return;

    if (currentStepIndex >= serverSteps.length - 1) {
        running = false;
        isPlaying = false;
        const btn = document.getElementById("playPauseBtn");
        if (btn) btn.textContent = "▶";
        return;
    }

    const speedVal = +document.getElementById("speed")?.value || 3;
    const duration = Math.max(500, Math.round(5000 / speedVal));

    if (voiceEnabled) {
        speakCurrentStep(() => {
            if (running) {
                currentStepIndex++;
                applyStepVisuals(currentStepIndex);
                stepNextLoop();
            }
        });
    } else {
        stepTimer = setTimeout(async () => {
            if (!running) return;
            currentStepIndex++;
            await applyStepVisuals(currentStepIndex);
            stepNextLoop();
        }, duration);
    }
}

function nextStep() {
    if (!serverSteps || serverSteps.length === 0) return;
    speechSynthesis.cancel();
    if (stepTimer) { clearTimeout(stepTimer); stepTimer = null; }

    currentStepIndex = Math.min(serverSteps.length - 1, currentStepIndex + 1);
    applyStepVisuals(currentStepIndex);
    updateStateDisplay(serverSteps[currentStepIndex]);
    renderStepsList();

    if (voiceEnabled) speakCurrentStep(() => { if (running) stepNextLoop(); });
    else if (running) {
        const speedVal = +document.getElementById("speed")?.value || 3;
        const dur = Math.max(500, Math.round(5000 / speedVal));
        stepTimer = setTimeout(() => { if (running) stepNextLoop(); }, dur);
    }
}

async function prevStep() {
    if (!serverSteps || currentStepIndex <= 0) return;
    speechSynthesis.cancel();
    running = false;
    currentStepIndex--;

    nodeGroup.selectAll("circle").interrupt();
    linkGroup.selectAll("line").interrupt();

    resetStyles();
    persistedBlueEdges.clear();
    persistedBlueNodes.clear();

    for (let i = 0; i <= currentStepIndex; i++) {
        await applyStepVisuals(i, i < currentStepIndex);
    }
    renderStepsList();
}


// ──────────────────────────────────────────────────────────────────────────────
// Voice synthesis
// ──────────────────────────────────────────────────────────────────────────────

function speakCurrentStep(onDone) {
    if (!voiceEnabled) { onDone && onDone(); return; }
    const step = serverSteps[currentStepIndex];
    if (!step) { onDone && onDone(); return; }

    speechSynthesis.cancel();
    let voices = speechSynthesis.getVoices();
    if (!voices.length) { setTimeout(() => speakCurrentStep(onDone), 100); return; }

    const text = step.Voice || step.Explain || step.Pseudo || "";
    const utter = new SpeechSynthesisUtterance(text);
    const viVoice = voices.find(v => v.lang.startsWith("vi"));
    utter.voice = viVoice || null;
    utter.lang = viVoice ? "vi-VN" : "en-US";
    utter.rate = 0.9;
    utter.onend = () => { onDone && onDone(); };
    speechSynthesis.speak(utter);
}

function toggleVoice() {
    voiceEnabled = !voiceEnabled;
    const btn = document.getElementById("toggleVoice");
    if (btn) btn.textContent = `🔊 Voice: ${voiceEnabled ? "ON" : "OFF"}`;
    if (!voiceEnabled) speechSynthesis.cancel();
}


// ──────────────────────────────────────────────────────────────────────────────
// Graph rendering (D3)
// ──────────────────────────────────────────────────────────────────────────────

function restart() {
    const nodeData = linkGroup.selectAll("line")
        .data(links, d => d.id);
    nodeData.exit().remove();
    nodeData.enter().append("line")
        .attr("id", d => "edge-" + d.id)
        .attr("stroke", "#999")
        .attr("stroke-width", 2)
        .style("opacity", 0)
        .transition().duration(500).style("opacity", 1);

    const labelData = nodeGroup.selectAll("circle")
        .data(nodes, d => d.id);
    labelData.exit().remove();
    const enterCircle = labelData.enter().append("circle")
        .attr("r", 0)
        .attr("fill", "#000")
        .attr("stroke", "#E6BE8A")
        .attr("stroke-width", 4)
        .attr("id", d => "node-" + d.id)
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended)
        );
    enterCircle.transition().duration(500).attr("r", 28);

    const labelText = labelGroup.selectAll("text")
        .data(nodes, d => d.id);
    labelText.exit().remove();
    labelText.enter().append("text")
        .attr("class", "label")
        .attr("fill", "white")
        .attr("font-size", 18)
        .attr("font-weight", "700")
        .attr("text-anchor", "middle")
        .attr("alignment-baseline", "middle")
        .style("cursor", "grab")
        .text(d => d.id.toUpperCase())
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended)
        );

    const weightText = weightGroup.selectAll("text")
        .data(links, d => d.id);
    weightText.exit().remove();
    weightText.enter().append("text")
        .attr("class", "weight")
        .attr("font-size", 14)
        .attr("fill", "#888")
        .attr("text-anchor", "middle")
        .text(d => d.weight);

    simulation.nodes(nodes).on("tick", ticked);
    simulation.force("link").links(links);
    simulation.alpha(0.3).restart();
}

function ticked() {
    linkGroup.selectAll("line")
        .attr("x1", d => getEndpoints(d).sx)
        .attr("y1", d => getEndpoints(d).sy)
        .attr("x2", d => getEndpoints(d).tx)
        .attr("y2", d => getEndpoints(d).ty);

    nodeGroup.selectAll("circle")
        .attr("cx", d => d.x).attr("cy", d => d.y);

    labelGroup.selectAll("text")
        .attr("x", d => d.x).attr("y", d => d.y);

    weightGroup.selectAll("text")
        .attr("x", d => (resolveNode(d.source).x + resolveNode(d.target).x) / 2)
        .attr("y", d => (resolveNode(d.source).y + resolveNode(d.target).y) / 2 - 6);
}

function resolveNode(n) {
    if (typeof n === "object" && n !== null) return n;
    return nodes.find(x => x.id === n) || { x: 0, y: 0 };
}

function getEndpoints(link) {
    const s = resolveNode(link.source);
    const t = resolveNode(link.target);
    return { s: s.id || link.source, t: t.id || link.target, sx: s.x, sy: s.y, tx: t.x, ty: t.y };
}

function resetStyles() {
    nodeGroup.selectAll("circle").interrupt()
        .attr("fill", "#000").attr("stroke", "#E6BE8A")
        .attr("stroke-width", 4).style("opacity", 1);

    linkGroup.selectAll("line").interrupt()
        .attr("stroke", "#999").attr("stroke-width", 2).style("opacity", 1);

    weightGroup.selectAll("text").style("opacity", 1).attr("fill", "#888");
}

function sameEdge(eid1, eid2) {
    const [a1, b1] = (eid1 || "").toLowerCase().split("-");
    const [a2, b2] = (eid2 || "").toLowerCase().split("-");
    return (a1 === a2 && b1 === b2) || (a1 === b2 && b1 === a2);
}

function dragstarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x; d.fy = d.y;
}
function dragged(event, d) { d.fx = event.x; d.fy = event.y; }
function dragended(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = d.x; d.fy = d.y;
}


// ──────────────────────────────────────────────────────────────────────────────
// Graph editing
// ──────────────────────────────────────────────────────────────────────────────

function normId(raw) {
    return (raw || "").trim().toLowerCase();
}

function showCreate() {
    const form = document.getElementById("createForm");
    if (form) form.style.display = form.style.display === "none" ? "block" : "none";
}

function addNode() {
    const id = normId(document.getElementById("nodeName").value);
    if (!id) { showNotification("Vui lòng nhập tên node", "error"); return; }
    if (nodes.find(n => n.id === id)) { showNotification("Node đã tồn tại", "error"); return; }

    const x = width / 2 + Math.random() * 80 - 40;
    const y = height / 2 + Math.random() * 80 - 40;
    nodes.push({ id, x, y, _fixed: true });
    restart();
    document.getElementById("nodeName").value = "";
    showNotification(`Đã thêm node '${id}'`, "success");
}

function removeNode() {
    const id = normId(document.getElementById("nodeName").value);
    if (!id) { showNotification("Nhập tên node để xóa", "error"); return; }
    const idx = nodes.findIndex(n => n.id === id);
    if (idx === -1) { showNotification("Node không tồn tại", "error"); return; }
    nodes.splice(idx, 1);
    links = links.filter(l => { const { s, t } = getEndpoints(l); return s !== id && t !== id; });
    restart();
    document.getElementById("nodeName").value = "";
    showNotification(`Đã xóa node '${id}'`, "success");
}

function addEdge() {
    const src = normId(document.getElementById("fromNode").value);
    const tgt = normId(document.getElementById("toNode").value);
    const wRaw = document.getElementById("edgeValue").value.trim();

    if (!src || !tgt) { showNotification("Nhập source và target", "error"); return; }
    if (src === tgt) { showNotification("Không thể nối chính nó", "error"); return; }
    if (!nodes.find(n => n.id === src) || !nodes.find(n => n.id === tgt)) {
        showNotification("Node không tồn tại", "error"); return;
    }
    if (links.find(l => sameEdge(l.id, `${src}-${tgt}`))) {
        showNotification("Cạnh đã tồn tại", "error"); return;
    }

    const weight = wRaw !== "" ? Number(wRaw) : 1;
    links.push({ source: src, target: tgt, weight, id: `${src}-${tgt}` });
    restart();
    document.getElementById("fromNode").value = "";
    document.getElementById("toNode").value = "";
    document.getElementById("edgeValue").value = "";
    showNotification(`Đã thêm cạnh ${src}-${tgt}`, "success");
}

function removeEdge() {
    const src = normId(document.getElementById("fromNode").value);
    const tgt = normId(document.getElementById("toNode").value);
    if (!src || !tgt) { showNotification("Nhập source và target để xóa cạnh", "error"); return; }
    const idx = links.findIndex(l => {
        const { s, t } = getEndpoints(l);
        return (s === src && t === tgt) || (s === tgt && t === src);
    });
    if (idx === -1) { showNotification("Cạnh không tồn tại", "error"); return; }
    const removedId = links[idx].id;
    links.splice(idx, 1);
    restart();
    showNotification(`Đã xóa cạnh ${removedId}`, "success");
    document.getElementById("fromNode").value = "";
    document.getElementById("toNode").value = "";
}

function resetGraph() {
    stopAnimation();
    serverSteps = [];
    currentStepIndex = -1;
    isPlaying = false;
    const btn = document.getElementById("playPauseBtn");
    if (btn) btn.textContent = "▶";
    document.body.classList.remove("playing");
    document.getElementById("explanation-wrapper")?.classList.remove("show-steps");

    nodes.length = 0;
    nodes.push(
        { id: "a", x: 400, y: 0, _fixed: true },
        { id: "b", x: 175, y: 150, _fixed: true },
        { id: "c", x: 625, y: 150, _fixed: true },
        { id: "e", x: 175, y: 375, _fixed: true },
        { id: "d", x: 625, y: 375, _fixed: true },
        { id: "f", x: 400, y: 525, _fixed: true },
    );
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

    renderStepsList();
    persistedBlueEdges.clear();
    persistedBlueNodes.clear();
    restart();
    resetStyles();
    document.getElementById("content-wrapper")?.classList.remove("explain");
}

function randomGraph() {
    stopAnimation();
    serverSteps = [];
    currentStepIndex = -1;
    isPlaying = false;
    const btn = document.getElementById("playPauseBtn");
    if (btn) btn.textContent = "▶";

    const letters = "abcdefghijklmnop".split("");
    const count = 5 + Math.floor(Math.random() * 4); // 5-8 nodes
    const chosen = letters.slice(0, count);

    nodes.length = 0;
    chosen.forEach((id, i) => {
        const angle = (i / count) * 2 * Math.PI;
        const r = 190;
        nodes.push({ id, x: width / 2 + r * Math.cos(angle), y: height / 2 + r * Math.sin(angle), _fixed: true });
    });

    links = [];
    // Random spanning tree first
    for (let i = 1; i < chosen.length; i++) {
        const src = chosen[Math.floor(Math.random() * i)];
        const tgt = chosen[i];
        const w = 1 + Math.floor(Math.random() * 20);
        links.push({ source: src, target: tgt, weight: w, id: `${src}-${tgt}` });
    }
    // Add random extra edges
    const extra = Math.floor(count * 0.8);
    for (let k = 0; k < extra; k++) {
        const si = Math.floor(Math.random() * count);
        const ti = Math.floor(Math.random() * count);
        if (si !== ti) {
            const src = chosen[si]; const tgt = chosen[ti];
            if (!links.find(l => sameEdge(l.id, `${src}-${tgt}`))) {
                const w = 1 + Math.floor(Math.random() * 20);
                links.push({ source: src, target: tgt, weight: w, id: `${src}-${tgt}` });
            }
        }
    }

    persistedBlueEdges.clear();
    persistedBlueNodes.clear();
    renderStepsList();
    restart();
    resetStyles();
}


// ──────────────────────────────────────────────────────────────────────────────
// UI toggle helpers
// ──────────────────────────────────────────────────────────────────────────────

function toggleMenu() {
    const dd = document.getElementById("floating-menu-dropdown");
    if (dd) dd.classList.toggle("show");
}

function toggleExplanation() {
    const wrapper = document.getElementById("explanation-wrapper");
    const content = document.getElementById("content-wrapper");
    if (wrapper) wrapper.classList.toggle("show-steps");
    if (content) content.classList.toggle("explain-open");
}

function backToEditMode() {
    stopAnimation();
    isPlaying = false;
    running = false;
    const btn = document.getElementById("playPauseBtn");
    if (btn) btn.textContent = "▶";
    document.body.classList.remove("playing");
    document.getElementById("explanation-wrapper")?.classList.remove("show-steps");
    document.getElementById("content-wrapper")?.classList.remove("explain-open");
    const dd = document.getElementById("floating-menu-dropdown");
    if (dd) dd.classList.remove("show");
}

window.onclick = function (event) {
    if (!event.target.matches("#floating-menu-btn")) {
        const dd = document.getElementById("floating-menu-dropdown");
        if (dd && dd.classList.contains("show")) dd.classList.remove("show");
    }
};


// ──────────────────────────────────────────────────────────────────────────────
// Notifications
// ──────────────────────────────────────────────────────────────────────────────

function showNotification(message, type = "success") {
    const el = document.getElementById("notification");
    if (!el) return;
    el.textContent = message;
    el.className = `show ${type}`;
    if (notificationTimer) clearTimeout(notificationTimer);
    notificationTimer = setTimeout(() => { el.className = ""; }, 3000);
}

function showEdgesGradually() {
    const lines = linkGroup.selectAll("line");
    lines.each(function (d, i) {
        d3.select(this).transition().delay(i * 100).duration(400).style("opacity", 1);
    });
}

function spawnNodes() {
    nodeGroup.selectAll("circle")
        .data(nodes, d => d.id)
        .transition().duration(600)
        .attr("r", 28)
        .attr("cx", d => d.x)
        .attr("cy", d => d.y);
}


// ──────────────────────────────────────────────────────────────────────────────
// Init
// ──────────────────────────────────────────────────────────────────────────────

window.addEventListener("DOMContentLoaded", async () => {
    await loadAlgorithmList();
    restart();
    setTimeout(spawnNodes, 200);
    setTimeout(showEdgesGradually, nodes.length * 200 + 200);
});

// Expose to HTML onclick handlers
window.runAlgorithm = runAlgorithm;
window.togglePlayPause = togglePlayPause;
window.nextStep = nextStep;
window.prevStep = prevStep;
window.toggleVoice = toggleVoice;
window.toggleExplanation = toggleExplanation;
window.toggleMenu = toggleMenu;
window.backToEditMode = backToEditMode;
window.showCreate = showCreate;
window.addNode = addNode;
window.removeNode = removeNode;
window.addEdge = addEdge;
window.removeEdge = removeEdge;
window.resetGraph = resetGraph;
window.randomGraph = randomGraph;
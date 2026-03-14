/**
 * App.js  –  Root component.
 *
 * Responsibilities:
 *   • holds the graph data (nodes / links)
 *   • lets the user pick an algorithm + start/end nodes
 *   • calls the backend (or Claude API directly) to get steps
 *   • wires GraphVisualizer ↔ StepController ↔ PseudocodePanel
 */
import React, { useState, useRef } from "react";
import GraphVisualizer from "./graphVisualizer";
import StepController from "./stepController";
import PseudocodePanel from "./pseudocodePanel";
import { analyzePseudocode } from "./api";
// Thêm state mới
const [customPseudo, setCustomPseudo] = useState("");
const [mode, setMode] = useState("preset"); // 'preset' hoặc 'custom'

// Trong phần UI Panel bên trái:
{mode === "custom" && (
    <textarea 
        value={customPseudo}
        onChange={(e) => setCustomPseudo(e.target.value)}
        placeholder="Dán mã giả của bạn vào đây..."
        style={{ height: "200px", background: "#1a1a1a", color: "#fff", borderRadius: 6, padding: 10 }}
    />
)}

// ── default graph ────────────────────────────────────────────────────────────
const DEFAULT_NODES = [
    { id: "a", x: 300, y: 40 },
    { id: "b", x: 100, y: 160 },
    { id: "c", x: 500, y: 160 },
    { id: "d", x: 500, y: 340 },
    { id: "e", x: 100, y: 340 },
    { id: "f", x: 300, y: 460 },
];
const DEFAULT_LINKS = [
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

// ── pseudocode templates (same as standalone HTML version) ─────────────────
const PSEUDOCODES = {
    dijkstra: [
        { key: "init-close", text: "1.1 Close = ∅" },
        { key: "init-dist", text: "1.2 Prev(v) = null, Dist(v) = ∞" },
        { key: "init-start", text: "1.3 Dist[bắt đầu] = 0" },
        { key: "init-open", text: "1.4 Open = {bắt đầu}" },
        { key: "loop", text: "Bước 2: Lặp cho đến khi Open rỗng:" },
        { key: "pick-min", text: "  2.1 Lấy x ∈ Open sao cho Dist(x) nhỏ nhất" },
        { key: "add-close", text: "  2.2 Thêm x vào Close" },
        { key: "for", text: "  2.3 Xét các đỉnh y kề với x & không thuộc Close:" },
        { key: "if1", text: "    2.3.1 y là đỉnh mới" },
        { key: "if11", text: "       • Thêm y vào Open" },
        { key: "if12", text: "       • Cập nhật trọng số: w(y)=w(x)+w(x,y)" },
        { key: "if13", text: "       • Cập nhật node cha" },
        { key: "if2", text: "    2.3.2 y đã thuộc Open:" },
        { key: "if21", text: "       • Nếu w(y) > w(x)+w(x,y)" },
        { key: "if22", text: "       • Cập nhật trọng số" },
        { key: "if23", text: "       • Cập nhật node cha" },
        { key: "end-loop", text: "Bước 3: Kết luận đường đi ngắn nhất." },
    ],
    bfs: [
        { key: "init", text: "1. Queue Q = {start}" },
        { key: "init-visit", text: "2. Visited = {start}" },
        { key: "loop", text: "3. Lặp khi Q không rỗng:" },
        { key: "dequeue", text: "   3.1 u = dequeue(Q)" },
        { key: "for", text: "   3.2 Xét các đỉnh v kề của u:" },
        { key: "if-visit", text: "      3.2.1 Nếu v chưa được thăm:" },
        { key: "mark", text: "         • Đánh dấu v đã thăm" },
        { key: "enqueue", text: "         • enqueue(Q, v)" },
        { key: "end", text: "4. Kết thúc BFS" },
    ],
    dfs: [
        { key: "init", text: "1. Stack S = {start}" },
        { key: "init-visit", text: "2. Visited = ∅" },
        { key: "loop", text: "3. Lặp khi S không rỗng:" },
        { key: "pop", text: "   3.1 u = pop(S)" },
        { key: "if-visit", text: "   3.2 Nếu u chưa thăm:" },
        { key: "mark", text: "      • Đánh dấu u đã thăm" },
        { key: "for", text: "      • Xét các đỉnh v kề của u:" },
        { key: "push", text: "         – Nếu v chưa thăm → push(S,v)" },
        { key: "end", text: "4. Kết thúc DFS" },
    ],
    prim: [
        { key: "init", text: "1. MST = {start}" },
        { key: "init-edge", text: "2. EdgeSet = các cạnh kề của start" },
        { key: "loop", text: "3. Lặp |V|−1 lần:" },
        { key: "pick-min", text: "   3.1 Lấy cạnh nhỏ nhất" },
        { key: "if-not", text: "   3.2 Nếu v chưa thuộc MST:" },
        { key: "add-node", text: "      • Thêm v vào MST" },
        { key: "add-edge", text: "      • Thêm cạnh vào MST" },
        { key: "update", text: "      • Cập nhật EdgeSet" },
        { key: "end", text: "4. MST hoàn thành" },
    ],
    kruskal: [
        { key: "init", text: "1. Sắp xếp các cạnh theo trọng số" },
        { key: "init-uf", text: "2. Union-Find: mỗi đỉnh là một tập" },
        { key: "loop", text: "3. Lặp qua các cạnh:" },
        { key: "pick", text: "   3.1 Lấy cạnh nhỏ nhất chưa xét" },
        { key: "if-cycle", text: "   3.2 Nếu u,v thuộc tập khác nhau:" },
        { key: "union", text: "      • Union(u,v)" },
        { key: "add-edge", text: "      • Thêm cạnh vào MST" },
        { key: "end", text: "4. MST hoàn thành" },
    ],
};

export default function App() {
    const [algo, setAlgo] = useState("dijkstra");
    const [startNode, setStart] = useState("a");
    const [endNode, setEnd] = useState("f");
    const [steps, setSteps] = useState([]);
    const [loading, setLoading] = useState(false);
    const graphRef = useRef(null);

    const pseudoLines = PSEUDOCODES[algo] || [];

    // ── run algorithm via backend ──────────────────────────────────────────────
    const handleRun = async () => {
        setLoading(true);
        try {
            const pseudoText = pseudoLines.map(l => l.text).join("\n");
            const result = await analyzePseudocode(pseudoText, algo);
            setSteps(result);
        } catch (err) {
            alert("Lỗi gọi AI: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    // ── active pseudocode key (from current step) ───────────────────────────
    const activeKey = steps.length > 0 ? (steps[0].highlightLine || "") : "";

    return (
        <div style={{ display: "flex", height: "100vh", fontFamily: "Arial, sans-serif" }}>
            {/* ── left panel ── */}
            <div style={{ width: 250, background: "#000", color: "#fff", padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
                <label style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: 1 }}>Algorithm</label>
                <select value={algo} onChange={e => setAlgo(e.target.value)}
                    style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 6, color: "#fff", padding: 10, fontSize: 14 }}>
                    <option value="dijkstra">Dijkstra</option>
                    <option value="bfs">BFS</option>
                    <option value="dfs">DFS</option>
                    <option value="prim">Prim (MST)</option>
                    <option value="kruskal">Kruskal (MST)</option>
                </select>

                <label style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: 1, marginTop: 8 }}>Start Node</label>
                <input value={startNode} onChange={e => setStart(e.target.value)}
                    style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 6, color: "#fff", padding: 10, fontSize: 14 }} />

                <label style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: 1 }}>End Node</label>
                <input value={endNode} onChange={e => setEnd(e.target.value)}
                    style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 6, color: "#fff", padding: 10, fontSize: 14 }} />

                <button onClick={handleRun} disabled={loading}
                    style={{ background: "#f9c74f", border: "none", borderRadius: 10, padding: "12px 0", color: "#000", fontWeight: 600, fontSize: 15, cursor: "pointer", marginTop: 8 }}>
                    {loading ? "AI đang phân tích…" : "▶  Run Algorithm"}
                </button>
            </div>

            {/* ── centre: graph canvas ── */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                <div style={{ flex: 1, border: "2px dashed #ccc", borderRadius: 8, margin: 10 }}>
                    <GraphVisualizer ref={graphRef} nodes={DEFAULT_NODES} links={DEFAULT_LINKS} />
                </div>
            </div>

            {/* ── right panel ── */}
            <div style={{ width: 850, display: "flex", background: "#000" }}>
                <StepController steps={steps} graphRef={graphRef} />
                <PseudocodePanel lines={pseudoLines} activeKey={activeKey} />
            </div>
        </div>
    );
}
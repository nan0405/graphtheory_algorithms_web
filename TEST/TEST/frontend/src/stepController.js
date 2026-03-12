/**
 * StepController.js
 *
 * Controls the animation loop:
 *   • play / pause / prev / next
 *   • reads serverSteps[] and calls graphRef methods to colour nodes/edges
 *   • renders the dynamic step-list in the right panel
 *
 * Colour conventions (must match backend prompt + frontend CSS):
 *   considering  → #ffc107  (yellow)
 *   examining    → #e53935  (red)
 *   updated      → #00e676  (green)
 *   finalised    → #1976d2  (blue)
 */
import React, { useState, useRef, useCallback } from "react";

const COLOURS = {
    considering: "#ffc107",
    examining: "#e53935",
    updated: "#00e676",
    finalised: "#1976d2",
};

/**
 * @param {{
 *   steps: Array<object>,        – the Instruction Set from Claude / GPT
 *   graphRef: React.MutableRefObject,  – imperative handle to GraphVisualizer
 * }} props
 */
export default function StepController({ steps = [], graphRef }) {
    const [currentIndex, setCurrentIndex] = useState(-1);
    const [playing, setPlaying] = useState(false);
    const timerRef = useRef(null);
    const persistedNodes = useRef(new Set());
    const persistedEdges = useRef(new Set());

    // ── apply one step's visuals ─────────────────────────────────────────────
    const applyStep = useCallback((idx) => {
        if (!steps[idx] || !graphRef.current) return;
        const step = steps[idx];
        const action = (step.action || "").toUpperCase();
        const nodes = (step.Highlight?.Nodes || []).map(n => n.toLowerCase());
        const edges = (step.Highlight?.Edges || []).map(e => e.toLowerCase());
        const colour = step.color || COLOURS.considering;

        switch (action) {
            case "COLOR_NODE":
                nodes.forEach(n => graphRef.current.colourNode(n, colour));
                break;
            case "COLOR_EDGE":
                edges.forEach(e => graphRef.current.colourEdge(e, colour));
                break;
            case "PERSIST_NODE":
                nodes.forEach(n => {
                    persistedNodes.current.add(n);
                    graphRef.current.colourNode(n, COLOURS.finalised, "#0d47a1");
                });
                break;
            case "PERSIST_EDGE":
                edges.forEach(e => {
                    persistedEdges.current.add(e);
                    graphRef.current.colourEdge(e, COLOURS.finalised);
                });
                break;
            case "RELAX_EDGE":
                edges.forEach(e => graphRef.current.colourEdge(e, COLOURS.updated));
                nodes.forEach(n => graphRef.current.colourNode(n, COLOURS.updated));
                break;
            case "RESET_TEMP":
                graphRef.current.resetStyles();
                // re-apply persisted
                persistedNodes.current.forEach(n => graphRef.current.colourNode(n, COLOURS.finalised, "#0d47a1"));
                persistedEdges.current.forEach(e => graphRef.current.colourEdge(e, COLOURS.finalised));
                break;
            case "FINAL_PATH":
                graphRef.current.hideAll();
                persistedEdges.current.forEach((e, i) =>
                    setTimeout(() => { graphRef.current.showEdge(e); graphRef.current.showWeight(e); }, i * 150)
                );
                persistedNodes.current.forEach((n, i) =>
                    setTimeout(() => graphRef.current.showNode(n), i * 150)
                );
                break;
            default:
                break;
        }
    }, [steps, graphRef]);

    // ── play loop ────────────────────────────────────────────────────────────
    const tickNext = useCallback(() => {
        setCurrentIndex(prev => {
            const next = prev + 1;
            if (next >= steps.length) { setPlaying(false); return prev; }
            applyStep(next);
            timerRef.current = setTimeout(tickNext, 1500);
            return next;
        });
    }, [steps.length, applyStep]);

    const handlePlay = () => {
        if (playing) { clearTimeout(timerRef.current); setPlaying(false); return; }
        setPlaying(true);
        tickNext();
    };

    const handlePrev = () => {
        clearTimeout(timerRef.current);
        setPlaying(false);
        setCurrentIndex(prev => {
            const next = Math.max(0, prev - 1);
            // replay silently from 0 … next
            graphRef.current?.resetStyles();
            persistedNodes.current.clear();
            persistedEdges.current.clear();
            for (let i = 0; i <= next; i++) applyStep(i);
            return next;
        });
    };

    const handleNext = () => {
        clearTimeout(timerRef.current);
        setCurrentIndex(prev => {
            const next = Math.min(steps.length - 1, prev + 1);
            applyStep(next);
            return next;
        });
    };

    // ── render ───────────────────────────────────────────────────────────────
    return (
        <div id="steps">
            <h3>STEPS</h3>

            {/* step list */}
            <div id="dynamic-steps-area">
                {steps.map((s, i) => (
                    <div
                        key={i}
                        className={"step-entry" + (i === currentIndex ? " active" : "")}
                        onClick={() => {
                            clearTimeout(timerRef.current);
                            setPlaying(false);
                            graphRef.current?.resetStyles();
                            persistedNodes.current.clear();
                            persistedEdges.current.clear();
                            for (let j = 0; j <= i; j++) applyStep(j);
                            setCurrentIndex(i);
                        }}
                    >
                        Step {s.Step || i + 1}: {s.Pseudo || s.voice || "…"}
                    </div>
                ))}
            </div>

            {/* playback controls */}
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button onClick={handlePrev}>⏮</button>
                <button onClick={handlePlay}>{playing ? "⏸" : "▶"}</button>
                <button onClick={handleNext}>⏭</button>
            </div>
        </div>
    );
}
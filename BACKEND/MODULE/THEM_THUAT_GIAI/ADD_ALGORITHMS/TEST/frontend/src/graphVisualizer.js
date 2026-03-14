/**
 * GraphVisualizer.js
 *
 * React component that owns the D3 <svg> canvas.
 * It exposes imperative methods via a ref so that StepController
 * can call colourNode(), colourEdge(), resetStyles(), etc.
 *
 * All D3 mutation is done through refs — React never re-renders the SVG.
 */
import React, { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import * as d3 from "d3";

const GraphVisualizer = forwardRef(({ nodes, links }, ref) => {
    const svgRef = useRef(null);
    const simRef = useRef(null);
    const groupsRef = useRef({}); // { linkGroup, nodeGroup, labelGroup, weightGroup }

    // ── expose imperative API to parent ──────────────────────────────────────
    useImperativeHandle(ref, () => ({
        colourNode: (id, colour, strokeColour) => {
            d3.select(`#node-${id}`)
                .transition().duration(300)
                .attr("fill", colour)
                .attr("stroke", strokeColour || d3.color(colour).darker(0.8) + "")
                .attr("stroke-width", 6);
        },
        colourEdge: (id, colour, width = 4) => {
            d3.select(`#edge-${id}`)
                .transition().duration(300)
                .attr("stroke", colour)
                .attr("stroke-width", width);
        },
        resetStyles: () => {
            const { linkGroup, nodeGroup } = groupsRef.current;
            if (!linkGroup || !nodeGroup) return;
            linkGroup.selectAll("line").attr("stroke", "#999").attr("stroke-width", 2).style("opacity", 1);
            nodeGroup.selectAll("circle").attr("fill", "black").attr("stroke", "#E6BE8A").attr("stroke-width", 6);
        },
        hideAll: () => {
            const { linkGroup, nodeGroup, weightGroup } = groupsRef.current;
            linkGroup?.selectAll("line").style("opacity", 0);
            nodeGroup?.selectAll("circle").style("opacity", 0);
            weightGroup?.selectAll("text").style("opacity", 0);
        },
        showEdge: (id, colour = "#1565c0") => {
            d3.select(`#edge-${id}`).transition().duration(300).style("opacity", 1).attr("stroke", colour).attr("stroke-width", 4);
        },
        showNode: (id, colour = "#1976d2") => {
            d3.select(`#node-${id}`).transition().duration(300).style("opacity", 1).attr("fill", colour).attr("stroke", "#0d47a1").attr("stroke-width", 4);
        },
        showWeight: (id) => {
            const { weightGroup } = groupsRef.current;
            weightGroup?.selectAll("text").filter(d => d.id === id).transition().duration(300).style("opacity", 1).attr("fill", "#0d47a1");
        },
    }));

    // ── mount D3 graph once ──────────────────────────────────────────────────
    useEffect(() => {
        const svg = d3.select(svgRef.current);
        const width = 600, height = 500;

        const linkGroup = svg.append("g").attr("class", "links");
        const nodeGroup = svg.append("g").attr("class", "nodes");
        const labelGroup = svg.append("g").attr("class", "labels");
        const weightGroup = svg.append("g").attr("class", "weights");
        groupsRef.current = { linkGroup, nodeGroup, labelGroup, weightGroup };

        // ── simulation ──
        const sim = d3.forceSimulation(nodes)
            .force("link", d3.forceLink(links).id(d => d.id).distance(110))
            .force("charge", d3.forceManyBody().strength(-400))
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("collide", d3.forceCollide().radius(40));
        simRef.current = sim;

        // ── edges ──
        linkGroup.selectAll("line").data(links, d => d.id).join("line")
            .attr("id", d => "edge-" + d.id)
            .attr("stroke", "#999").attr("stroke-width", 2);

        // ── weights ──
        weightGroup.selectAll("text").data(links, d => d.id).join("text")
            .attr("class", "weight").attr("text-anchor", "middle")
            .attr("fill", "#000").attr("font-size", 18)
            .text(d => d.weight);

        // ── nodes ──
        const drag = d3.drag()
            .on("start", (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
            .on("drag", (e, d) => { d.fx = e.x; d.fy = e.y; })
            .on("end", (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = d.x; d.fy = d.y; });

        nodeGroup.selectAll("circle").data(nodes, d => d.id).join("circle")
            .attr("r", 34).attr("fill", "black").attr("stroke", "#E6BE8A").attr("stroke-width", 4)
            .attr("id", d => "node-" + d.id)
            .call(drag);

        labelGroup.selectAll("text").data(nodes, d => d.id).join("text")
            .attr("class", "label").attr("fill", "white").attr("font-size", 25).attr("font-weight", "700")
            .attr("text-anchor", "middle").attr("alignment-baseline", "middle")
            .text(d => d.id.toUpperCase())
            .call(drag);

        // ── tick ──
        sim.on("tick", () => {
            linkGroup.selectAll("line")
                .attr("x1", d => d.source.x).attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x).attr("y2", d => d.target.y);
            nodeGroup.selectAll("circle").attr("cx", d => d.x).attr("cy", d => d.y);
            labelGroup.selectAll("text").attr("x", d => d.x).attr("y", d => d.y);
            weightGroup.selectAll("text")
                .attr("x", d => (d.source.x + d.target.x) / 2)
                .attr("y", d => (d.source.y + d.target.y) / 2);
        });

        return () => sim.stop();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <svg ref={svgRef} viewBox="0 0 600 500" preserveAspectRatio="xMidYMid meet" style={{ width: "100%", height: "100%" }} />
    );
});

export default GraphVisualizer;
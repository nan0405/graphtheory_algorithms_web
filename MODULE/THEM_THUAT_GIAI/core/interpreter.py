"""
Interpreter
===========
Loads a DSL JSON file, parses it into an AST, initializes
RuntimeContext, executes the AST, and returns a timeline.

Usage:
    interpreter = Interpreter(algorithms_dir="algorithms")
    timeline = interpreter.run("Dijkstra", graph_dict, start="a", end="f")
"""
from __future__ import annotations
import json
import math
import os
from pathlib import Path

from app.core.parser import parse_program, ParseError
from app.models.runtime_context import RuntimeContext, GraphModel


class AlgorithmNotFound(Exception):
    pass


class Interpreter:
    def __init__(self, algorithms_dir: str = "algorithms"):
        self.algorithms_dir = Path(algorithms_dir)

    # ── DSL loading ────────────────────────────────────────────

    def load_dsl(self, algorithm_name: str) -> dict:
        path = self.algorithms_dir / f"{algorithm_name}.json"
        if not path.exists():
            raise AlgorithmNotFound(f"Algorithm '{algorithm_name}' not found at {path}")
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)

    def list_algorithms(self) -> list[str]:
        return [p.stem for p in self.algorithms_dir.glob("*.json")]

    # ── Execution entry point ──────────────────────────────────

    def run(self, algorithm_name: str, graph_data: dict,
            start: str = None, end: str = None) -> list[dict]:
        """
        Run `algorithm_name` on `graph_data`.
        Returns a flat list of timeline step dicts.
        """
        dsl = self.load_dsl(algorithm_name)
        _, root_ast = parse_program(dsl)

        graph = GraphModel.from_dict(graph_data)
        ctx   = RuntimeContext(graph)

        # ── Seed initial variables from DSL "init" section (optional)
        init_vars = dsl.get("init", {})
        self._initialize_context(ctx, graph, init_vars, start, end)

        # ── Execute AST
        root_ast.execute(ctx)

        # ── Append a final step that marks the shortest path
        self._append_final_step(ctx, start, end)

        return [step.to_dict() for step in ctx.timeline]

    # ── Context initialization ─────────────────────────────────

    def _initialize_context(
        self, ctx: RuntimeContext, graph: GraphModel,
        init_vars: dict, start: str, end: str
    ):
        """
        Set default runtime variables.
        - All dist values → ∞
        - All prev values → None
        - openSet, closedSet, visited → empty set/set/set
        - startNode, endNode → from request
        """
        nodes = graph.nodes

        ctx.set_var("startNode", start)
        ctx.set_var("endNode",   end)

        ctx.set_var("dist",      {n: float("inf") for n in nodes})
        ctx.set_var("prev",      {n: None          for n in nodes})
        ctx.set_var("openSet",   set())
        ctx.set_var("closedSet", set())
        ctx.set_var("visited",   set())

        # Apply any custom initializations from DSL
        for var_name, raw_val in init_vars.items():
            if raw_val == "startNode":
                ctx.set_var(var_name, start)
            elif raw_val == "endNode":
                ctx.set_var(var_name, end)
            elif raw_val == "Infinity":
                ctx.set_var(var_name, float("inf"))
            elif raw_val == "emptySet":
                ctx.set_var(var_name, set())
            elif raw_val == "emptyDict":
                ctx.set_var(var_name, {})
            elif raw_val == "allNodes":
                ctx.set_var(var_name, set(nodes))
            else:
                ctx.set_var(var_name, raw_val)

    def _append_final_step(self, ctx: RuntimeContext, start: str, end: str):
        """Add a concluding step with the final path highlighted."""
        path = ctx.build_path(start, end) if (start and end) else []
        if path:
            ctx.record_step(
                pseudo    = "Đường đi ngắn nhất đã được tìm thấy",
                voice     = f"Hoàn thành. Đường đi ngắn nhất từ {start} đến {end} là: " +
                            " → ".join(path),
                is_final  = True,
                final_path= path,
            )
        else:
            ctx.record_step(
                pseudo   = "Thuật toán hoàn tất",
                voice    = "Thuật toán đã hoàn tất",
                is_final = True,
            )
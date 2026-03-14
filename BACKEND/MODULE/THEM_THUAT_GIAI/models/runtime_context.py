"""
Runtime Models
==============
GraphModel   – lightweight in-memory graph
RuntimeContext – interpreter state (variables, timeline recording)
TimelineStep – one recorded visualization frame
"""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import Any, Optional
import math


# ──────────────────────────────────────────────────────────────
# Graph Model
# ──────────────────────────────────────────────────────────────

@dataclass
class Edge:
    source: str
    target: str
    weight: float
    id: str = ""

    def __post_init__(self):
        if not self.id:
            self.id = f"{self.source}-{self.target}"


class GraphModel:
    """
    Undirected weighted graph backed by an adjacency list.
    Supports directed graphs too (flag `directed=True`).
    """
    def __init__(self, directed: bool = False):
        self.directed = directed
        self._adj: dict[str, list[tuple[str, float, str]]] = {}  # node → [(neighbor, weight, edge_id)]
        self._nodes: list[str] = []
        self._edges: list[Edge] = []

    @classmethod
    def from_dict(cls, data: dict) -> "GraphModel":
        """
        Build from the JSON body:
        {
          "nodes": ["a", "b", ...],
          "edges": [{"source": "a", "target": "b", "weight": 5, "id": "a-b"}, ...]
          "directed": false
        }
        """
        g = cls(directed=data.get("directed", False))
        for n in data.get("nodes", []):
            g.add_node(n if isinstance(n, str) else n["id"])
        for e in data.get("edges", []):
            g.add_edge(
                source=e.get("source") or e.get("from", ""),
                target=e.get("target") or e.get("to", ""),
                weight=float(e.get("weight", 1)),
                edge_id=e.get("id", ""),
            )
        return g

    def add_node(self, node_id: str):
        if node_id not in self._adj:
            self._adj[node_id] = []
            self._nodes.append(node_id)

    def add_edge(self, source: str, target: str, weight: float = 1, edge_id: str = ""):
        self.add_node(source)
        self.add_node(target)
        eid = edge_id or f"{source}-{target}"
        self._adj[source].append((target, weight, eid))
        self._edges.append(Edge(source, target, weight, eid))
        if not self.directed:
            rev_id = edge_id or f"{target}-{source}"
            self._adj[target].append((source, weight, rev_id))

    def neighbors(self, node_id: str) -> list[tuple[str, float]]:
        """Returns list of (neighbor_id, weight)."""
        return [(n, w) for n, w, _ in self._adj.get(node_id, [])]

    def edge_id(self, source: str, target: str) -> str:
        """Return the edge id for the given node pair."""
        for n, _, eid in self._adj.get(source, []):
            if n == target:
                return eid
        return f"{source}-{target}"

    @property
    def nodes(self) -> list[str]:
        return list(self._nodes)


# ──────────────────────────────────────────────────────────────
# Timeline Step
# ──────────────────────────────────────────────────────────────

@dataclass
class TimelineStep:
    """One recorded animation frame."""
    pseudo:           str         = ""
    voice:            str         = ""
    highlight_nodes:  list[str]   = field(default_factory=list)
    highlight_edges:  list[str]   = field(default_factory=list)
    # Snapshot of key state at this moment
    dist:             dict        = field(default_factory=dict)
    prev:             dict        = field(default_factory=dict)
    open_set:         list[str]   = field(default_factory=list)
    closed_set:       list[str]   = field(default_factory=list)
    visited:          list[str]   = field(default_factory=list)
    current_node:     Optional[str] = None
    final_path:       list[str]   = field(default_factory=list)
    is_final:         bool        = False
    extra:            dict        = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "pseudo":          self.pseudo,
            "voice":           self.voice,
            "highlight":       {
                "nodes": self.highlight_nodes,
                "edges": self.highlight_edges,
            },
            "dist":            {k: (v if not math.isinf(v) else "∞") for k, v in self.dist.items()},
            "prev":            self.prev,
            "openSet":         self.open_set,
            "closedSet":       self.closed_set,
            "visited":         self.visited,
            "currentNode":     self.current_node,
            "finalPath":       self.final_path,
            "isFinal":         self.is_final,
            **self.extra,
        }


# ──────────────────────────────────────────────────────────────
# Runtime Context
# ──────────────────────────────────────────────────────────────

class RuntimeContext:
    """
    Interpreter state passed through the entire AST execution.
    Holds:
      - graph           GraphModel
      - variables       flat dict of all runtime variables
      - timeline        list of recorded TimelineStep
    """
    def __init__(self, graph: GraphModel):
        self.graph = graph
        self.variables: dict[str, Any] = {}
        self.timeline: list[TimelineStep] = []

    # ── Variable access ────────────────────────────────────────

    def get_var(self, name: str) -> Any:
        return self.variables.get(name)

    def set_var(self, name: str, value: Any):
        self.variables[name] = value

    # ── Timeline recording ─────────────────────────────────────

    def record_step(
        self,
        pseudo: str = "",
        voice:  str = "",
        highlight_nodes: list[str] = None,
        highlight_edges: list[str] = None,
        is_final: bool = False,
        final_path: list[str] = None,
        extra: dict = None,
    ):
        """
        Snapshot the current interpreter state into a TimelineStep.
        Called after each significant statement execution.
        """
        # Take a snapshot of mutable structures
        dist_raw  = self.variables.get("dist",    {})
        prev_raw  = self.variables.get("prev",    {})
        open_raw  = self.variables.get("openSet", set())
        closed_raw= self.variables.get("closedSet", set())
        visited   = self.variables.get("visited", set())

        step = TimelineStep(
            pseudo          = pseudo,
            voice           = voice,
            highlight_nodes = list(highlight_nodes or []),
            highlight_edges = list(highlight_edges or []),
            dist            = dict(dist_raw)  if isinstance(dist_raw, dict) else {},
            prev            = dict(prev_raw)  if isinstance(prev_raw, dict) else {},
            open_set        = list(open_raw)  if isinstance(open_raw,  (set, list)) else [],
            closed_set      = list(closed_raw)if isinstance(closed_raw,(set, list)) else [],
            visited         = list(visited)   if isinstance(visited,   (set, list)) else [],
            current_node    = self.variables.get("currentNode"),
            final_path      = list(final_path or []),
            is_final        = is_final,
            extra           = extra or {},
        )
        self.timeline.append(step)

    def build_path(self, start: str, end: str) -> list[str]:
        """
        Reconstruct shortest path using 'prev' dict.
        Returns empty list if no path found.
        """
        prev = self.variables.get("prev", {})
        path = []
        cur = end
        while cur is not None:
            path.append(cur)
            if cur == start:
                break
            cur = prev.get(cur)
        path.reverse()
        if path and path[0] == start:
            return path
        return []
"""
Parser: JSON DSL → AST
======================
Reads a dict (parsed from JSON) and constructs the corresponding
tree of AstNode objects.

Supported node types in JSON:
  Block, Assign, While, If, ForEachNeighbor,
  ExtractMin, BinaryExpression, NotEmpty, NotInSet, InSet,
  FunctionCall, Return, Literal, VarRef
"""
from __future__ import annotations
from typing import Any
from app.core.ast_nodes import (
    AstNode, BlockNode, AssignNode, WhileNode, IfNode,
    ForEachNeighborNode, ReturnNode, ExtractMinNode,
    BinaryExpressionNode, NotEmptyNode, NotInSetNode, InSetNode,
    FunctionCallNode, LiteralNode, VarRefNode
)


class ParseError(Exception):
    pass


def parse(node: Any) -> AstNode:
    """
    Recursively parse a JSON-dict into an AstNode tree.
    `node` can be:
      - dict with a "type" key
      - int / float / bool  → LiteralNode
      - str                 → VarRefNode (if not a known keyword)
    """
    if isinstance(node, (int, float, bool)):
        return LiteralNode(node)

    if isinstance(node, str):
        # Special sentinel for infinity
        if node in ("Infinity", "∞", "inf"):
            return LiteralNode(float("inf"))
        return VarRefNode(node)

    if not isinstance(node, dict):
        raise ParseError(f"Expected dict, got {type(node)}: {node!r}")

    t = node.get("type")
    if t is None:
        raise ParseError(f"Missing 'type' key in node: {node}")

    pseudo = node.get("pseudo", "")
    voice  = node.get("voice",  "")

    # ── Block ──────────────────────────────────────────────────────────
    if t == "Block":
        stmts = [parse(s) for s in node.get("statements", [])]
        return BlockNode(stmts)

    # ── Assign ─────────────────────────────────────────────────────────
    if t == "Assign":
        right_raw = node["right"]
        right = parse(right_raw) if isinstance(right_raw, dict) else right_raw
        return AssignNode(node["left"], right, pseudo, voice)

    # ── While ──────────────────────────────────────────────────────────
    if t == "While":
        cond = parse(node["condition"])
        body = parse(node["body"])
        return WhileNode(cond, body, pseudo, voice)

    # ── If ─────────────────────────────────────────────────────────────
    if t == "If":
        cond = parse(node["condition"])
        then = parse(node["consequent"])
        alt  = parse(node["alternate"]) if "alternate" in node else None
        return IfNode(cond, then, alt, pseudo, voice)

    # ── ForEachNeighbor ────────────────────────────────────────────────
    if t == "ForEachNeighbor":
        return ForEachNeighborNode(
            node_var        = node["nodeVar"],
            neighbor_var    = node["neighborVar"],
            edge_weight_var = node.get("edgeWeightVar", "edgeWeight"),
            body            = parse(node["body"]),
            pseudo          = pseudo,
            voice           = voice,
        )

    # ── ExtractMin ─────────────────────────────────────────────────────
    if t == "ExtractMin":
        return ExtractMinNode(
            queue_var = node["queueVar"],
            dist_var  = node.get("distVar", "dist"),
            pseudo    = pseudo,
            voice     = voice,
        )

    # ── BinaryExpression ───────────────────────────────────────────────
    if t == "BinaryExpression":
        l = parse(node["left"])  if isinstance(node["left"],  dict) else node["left"]
        r = parse(node["right"]) if isinstance(node["right"], dict) else node["right"]
        return BinaryExpressionNode(node["operator"], l, r)

    # ── NotEmpty ───────────────────────────────────────────────────────
    if t == "NotEmpty":
        return NotEmptyNode(node["target"])

    # ── NotInSet ───────────────────────────────────────────────────────
    if t == "NotInSet":
        return NotInSetNode(node["itemVar"], node["setVar"])

    # ── InSet ──────────────────────────────────────────────────────────
    if t == "InSet":
        return InSetNode(node["itemVar"], node["setVar"])

    # ── FunctionCall ───────────────────────────────────────────────────
    if t == "FunctionCall":
        raw_args = node.get("args", [])
        # Keep raw args for built-in dispatch (we need both raw names & resolved values)
        return FunctionCallNode(node["func"], raw_args, pseudo, voice)

    # ── Return ─────────────────────────────────────────────────────────
    if t == "Return":
        val = node.get("value")
        return ReturnNode(val, pseudo, voice)

    # ── Literal (explicit) ─────────────────────────────────────────────
    if t == "Literal":
        return LiteralNode(node["value"])

    # ── VarRef (explicit) ──────────────────────────────────────────────
    if t == "VarRef":
        return VarRefNode(node["name"])

    raise ParseError(f"Unknown AST node type: {t!r}")


def parse_program(dsl: dict) -> tuple[str, AstNode]:
    """
    Entry point: parse the top-level DSL object.
    Returns (algorithm_name, root_AstNode).
    """
    name = dsl.get("name", "Unknown")
    program = dsl.get("program")
    if program is None:
        raise ParseError("DSL must have a 'program' key")
    return name, parse(program)
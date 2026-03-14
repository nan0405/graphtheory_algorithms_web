"""
AST Node System for Graph Algorithm DSL Runtime
================================================
Each node represents a construct in the DSL JSON:
  Block, Assign, While, If, ForEachNeighbor,
  ExtractMin, BinaryExpression, FunctionCall, Return
"""
from __future__ import annotations
from typing import Any, Optional


class AstNode:
    """Base class for all AST nodes."""
    pseudo: str = ""
    voice: str = ""

    def execute(self, ctx: "RuntimeContext") -> Any:
        raise NotImplementedError(f"{self.__class__.__name__}.execute() not implemented")

    def evaluate(self, ctx: "RuntimeContext") -> Any:
        """Used for expression nodes that return a value."""
        raise NotImplementedError(f"{self.__class__.__name__}.evaluate() not implemented")


# ─────────────────────────────────────────────
# Structural Nodes
# ─────────────────────────────────────────────

class BlockNode(AstNode):
    """A sequence of statements executed one after another."""
    def __init__(self, statements: list[AstNode]):
        self.statements = statements

    def execute(self, ctx: "RuntimeContext"):
        for stmt in self.statements:
            result = stmt.execute(ctx)
            if result == "RETURN":
                return "RETURN"


class AssignNode(AstNode):
    """
    Assignment statement.
    Supports: dist[x] = val, prev[x] = val, simple var = val.
    After execution, records a timeline step.
    """
    def __init__(self, left: str, right: Any, pseudo: str = "", voice: str = ""):
        self.left = left
        self.right = right
        self.pseudo = pseudo
        self.voice = voice

    def execute(self, ctx: "RuntimeContext"):
        value = _resolve(self.right, ctx)
        _set_var(self.left, value, ctx)
        ctx.record_step(
            pseudo=self.pseudo,
            voice=self.voice,
            highlight_nodes=_highlight_from_assign(self.left, ctx),
        )


class WhileNode(AstNode):
    """While loop: executes body as long as condition is truthy."""
    def __init__(self, condition: AstNode, body: AstNode, pseudo: str = "", voice: str = ""):
        self.condition = condition
        self.body = body
        self.pseudo = pseudo
        self.voice = voice

    def execute(self, ctx: "RuntimeContext"):
        while self.condition.evaluate(ctx):
            result = self.body.execute(ctx)
            if result == "RETURN":
                return "RETURN"


class IfNode(AstNode):
    """If/else construct."""
    def __init__(self, condition: AstNode, consequent: AstNode,
                 alternate: Optional[AstNode] = None, pseudo: str = "", voice: str = ""):
        self.condition = condition
        self.consequent = consequent
        self.alternate = alternate
        self.pseudo = pseudo
        self.voice = voice

    def execute(self, ctx: "RuntimeContext"):
        if self.condition.evaluate(ctx):
            ctx.record_step(pseudo=self.pseudo, voice=self.voice)
            return self.consequent.execute(ctx)
        elif self.alternate:
            return self.alternate.execute(ctx)


class ForEachNeighborNode(AstNode):
    """
    Iterates over all neighbors of `nodeVar` in the graph.
    Sets `neighborVar` to each neighbor node id, and `edgeWeightVar` to the edge weight.
    """
    def __init__(self, node_var: str, neighbor_var: str, edge_weight_var: str,
                 body: AstNode, pseudo: str = "", voice: str = ""):
        self.node_var = node_var
        self.neighbor_var = neighbor_var
        self.edge_weight_var = edge_weight_var
        self.body = body
        self.pseudo = pseudo
        self.voice = voice

    def execute(self, ctx: "RuntimeContext"):
        node_id = ctx.get_var(self.node_var)
        for neighbor_id, weight in ctx.graph.neighbors(node_id):
            ctx.set_var(self.neighbor_var, neighbor_id)
            ctx.set_var(self.edge_weight_var, weight)
            ctx.record_step(
                pseudo=self.pseudo,
                voice=self.voice,
                highlight_nodes=[node_id, neighbor_id],
                highlight_edges=[ctx.graph.edge_id(node_id, neighbor_id)],
            )
            result = self.body.execute(ctx)
            if result == "RETURN":
                return "RETURN"


class ReturnNode(AstNode):
    """Return statement — signals the interpreter to stop execution."""
    def __init__(self, value: Any = None, pseudo: str = "", voice: str = ""):
        self.value = value
        self.pseudo = pseudo
        self.voice = voice

    def execute(self, ctx: "RuntimeContext"):
        ctx.record_step(pseudo=self.pseudo, voice=self.voice)
        return "RETURN"


# ─────────────────────────────────────────────
# Expression Nodes
# ─────────────────────────────────────────────

class ExtractMinNode(AstNode):
    """
    Pops the node with the minimum distance from the priority queue.
    Returns the node id.
    """
    def __init__(self, queue_var: str, dist_var: str, pseudo: str = "", voice: str = ""):
        self.queue_var = queue_var
        self.dist_var = dist_var
        self.pseudo = pseudo
        self.voice = voice

    def execute(self, ctx: "RuntimeContext"):
        """Execute and store result into target variable if called as statement."""
        return self.evaluate(ctx)

    def evaluate(self, ctx: "RuntimeContext") -> Any:
        open_set: set = ctx.get_var(self.queue_var)
        dist: dict = ctx.get_var(self.dist_var)
        if not open_set:
            return None
        node = min(open_set, key=lambda n: dist.get(n, float("inf")))
        open_set.discard(node)
        ctx.record_step(
            pseudo=self.pseudo,
            voice=self.voice,
            highlight_nodes=[node],
        )
        return node


class BinaryExpressionNode(AstNode):
    """
    Evaluates binary expressions: +, -, *, /, <, >, <=, >=, ==, !=, &&, ||
    Operands can be literals, variable references, or nested expression nodes.
    """
    def __init__(self, operator: str, left: Any, right: Any):
        self.operator = operator
        self.left = left
        self.right = right

    def evaluate(self, ctx: "RuntimeContext") -> Any:
        l = _resolve(self.left, ctx)
        r = _resolve(self.right, ctx)
        ops = {
            "+": lambda a, b: a + b,
            "-": lambda a, b: a - b,
            "*": lambda a, b: a * b,
            "/": lambda a, b: a / b,
            "<":  lambda a, b: a < b,
            ">":  lambda a, b: a > b,
            "<=": lambda a, b: a <= b,
            ">=": lambda a, b: a >= b,
            "==": lambda a, b: a == b,
            "!=": lambda a, b: a != b,
            "&&": lambda a, b: bool(a) and bool(b),
            "||": lambda a, b: bool(a) or bool(b),
        }
        fn = ops.get(self.operator)
        if fn is None:
            raise ValueError(f"Unknown operator: {self.operator}")
        return fn(l, r)

    def execute(self, ctx: "RuntimeContext"):
        return self.evaluate(ctx)


class NotEmptyNode(AstNode):
    """Checks if a set/collection variable is non-empty."""
    def __init__(self, target: str):
        self.target = target

    def evaluate(self, ctx: "RuntimeContext") -> bool:
        val = ctx.get_var(self.target)
        return bool(val)


class NotInSetNode(AstNode):
    """Checks if a variable is NOT in a given set variable."""
    def __init__(self, item_var: str, set_var: str):
        self.item_var = item_var
        self.set_var = set_var

    def evaluate(self, ctx: "RuntimeContext") -> bool:
        item = ctx.get_var(self.item_var)
        s: set = ctx.get_var(self.set_var)
        return item not in s


class InSetNode(AstNode):
    """Checks if a variable IS in a given set variable."""
    def __init__(self, item_var: str, set_var: str):
        self.item_var = item_var
        self.set_var = set_var

    def evaluate(self, ctx: "RuntimeContext") -> bool:
        item = ctx.get_var(self.item_var)
        s: set = ctx.get_var(self.set_var)
        return item in s


class FunctionCallNode(AstNode):
    """
    Calls a built-in runtime function.
    Supported:
      set.add(setVar, itemVar)
      set.remove(setVar, itemVar)
      dist.update(distVar, nodeVar, valueExpr)
      prev.update(prevVar, nodeVar, valueExpr)
      queue.add(queueVar, itemVar)
    """
    def __init__(self, func: str, args: list[Any], pseudo: str = "", voice: str = ""):
        self.func = func
        self.args = args
        self.pseudo = pseudo
        self.voice = voice

    def execute(self, ctx: "RuntimeContext"):
        resolved = [_resolve(a, ctx) for a in self.args]
        _call_builtin(self.func, resolved, self.args, ctx)
        ctx.record_step(pseudo=self.pseudo, voice=self.voice)


class LiteralNode(AstNode):
    """A literal value (number, string, bool)."""
    def __init__(self, value: Any):
        self.value = value

    def evaluate(self, ctx: "RuntimeContext") -> Any:
        return self.value


class VarRefNode(AstNode):
    """Reference to a variable by name (supports dist[x], prev[x] syntax)."""
    def __init__(self, name: str):
        self.name = name

    def evaluate(self, ctx: "RuntimeContext") -> Any:
        return _resolve(self.name, ctx)


# ─────────────────────────────────────────────
# Helper utilities (used by nodes internally)
# ─────────────────────────────────────────────

def _resolve(expr: Any, ctx: "RuntimeContext") -> Any:
    """
    Resolve an expression to a concrete value.
    - AstNode: call evaluate()
    - str: check if it's a variable reference (e.g. "dist[currentNode]", "currentNode")
    - literal int/float/bool: return as-is
    """
    if isinstance(expr, AstNode):
        return expr.evaluate(ctx)
    if isinstance(expr, str):
        return _get_var(expr, ctx)
    return expr


def _get_var(name: str, ctx: "RuntimeContext") -> Any:
    """
    Support indexed access: dist[currentNode], prev[neighborNode].
    Falls back to direct variable lookup.
    """
    if "[" in name and name.endswith("]"):
        var_name, key_expr = name[:-1].split("[", 1)
        key = _get_var(key_expr, ctx)
        container = ctx.get_var(var_name)
        if container is None:
            return float("inf")
        return container.get(key, float("inf"))
    return ctx.get_var(name)


def _set_var(name: str, value: Any, ctx: "RuntimeContext"):
    """
    Support indexed assignment: dist[currentNode] = 5.
    Falls back to direct variable set.
    """
    if "[" in name and name.endswith("]"):
        var_name, key_expr = name[:-1].split("[", 1)
        key = _get_var(key_expr, ctx)
        container = ctx.get_var(var_name)
        if container is None:
            container = {}
            ctx.set_var(var_name, container)
        container[key] = value
    else:
        ctx.set_var(name, value)


def _highlight_from_assign(left: str, ctx: "RuntimeContext") -> list:
    """Infer which nodes to highlight based on assignment target."""
    if "[" in left and left.endswith("]"):
        _, key_expr = left[:-1].split("[", 1)
        try:
            key = _get_var(key_expr, ctx)
            if isinstance(key, str):
                return [key]
        except Exception:
            pass
    return []


def _call_builtin(func: str, resolved_args: list, raw_args: list, ctx: "RuntimeContext"):
    """Dispatch built-in function calls."""
    if func == "set.add":
        set_var, item = raw_args[0], resolved_args[1]
        s: set = ctx.get_var(set_var)
        if s is None:
            s = set()
            ctx.set_var(set_var, s)
        s.add(item)
    elif func == "set.remove":
        set_var, item = raw_args[0], resolved_args[1]
        s: set = ctx.get_var(set_var)
        if s:
            s.discard(item)
    elif func == "queue.add":
        queue_var, item = raw_args[0], resolved_args[1]
        s: set = ctx.get_var(queue_var)
        if s is None:
            s = set()
            ctx.set_var(queue_var, s)
        s.add(item)
    elif func == "dist.update":
        dist_var, node, value = raw_args[0], resolved_args[1], resolved_args[2]
        d: dict = ctx.get_var(dist_var)
        if d is None:
            d = {}
            ctx.set_var(dist_var, d)
        d[node] = value
    elif func == "prev.update":
        prev_var, node, value = raw_args[0], resolved_args[1], resolved_args[2]
        p: dict = ctx.get_var(prev_var)
        if p is None:
            p = {}
            ctx.set_var(prev_var, p)
        p[node] = value
    else:
        raise ValueError(f"Unknown built-in function: {func}")
using GraphApi.Models;
using System;
using System.Collections.Generic;
using System.Linq;

namespace GraphApi.Services;

// ============================================================
//  DfsService — Depth-First Search with step-by-step recording
//
//  Architecture (3 clear layers):
//    1. Algorithm Logic  — Run(), ProcessNode(), ExpandNeighbors()
//    2. Step Recording   — RecordXxx() helpers
//    3. State Formatting — FormatXxx() helpers
// ============================================================
public class DfsService
{
    // ──────────────────────────────────────────────
    // Graph store
    // ──────────────────────────────────────────────
    private readonly Dictionary<Guid, GraphRequest> _graphs = new();

    public void CreateGraphWithId(Guid id, GraphRequest request) => _graphs[id] = request;

    public Guid CreateGraph(GraphRequest request)
    {
        var id = Guid.NewGuid();
        _graphs[id] = request;
        return id;
    }

    // ──────────────────────────────────────────────
    // Runtime state shared across helper methods
    // ──────────────────────────────────────────────
    private List<StepDto> _steps = new();
    private HashSet<string> _visited = new();
    private Stack<string> _stack = new();
    private Dictionary<string, string> _parent = new();
    private List<Edge> _activeEdges = new(); // H: edges currently under inspection
    private List<string> _traversalOrder = new();
    private List<Edge> _allEdges = new();
    private string _startNode = "";
    private int _step = 0;

    // ============================================================
    //  ENTRY POINT
    // ============================================================
    public List<StepDto> Run(Guid id, string start)
    {
        if (!_graphs.TryGetValue(id, out var graph))
            throw new InvalidOperationException("Graph not found");

        InitializeState(graph, start);
        RecordInitialization(start);

        while (_stack.Count > 0)
        {
            _step++;
            ProcessNode(_stack.Pop());
        }

        RecordFinalStep();
        return _steps;
    }

    // ============================================================
    //  LAYER 1 — ALGORITHM LOGIC
    // ============================================================

    /// <summary>Reset and populate all runtime state before the main loop.</summary>
    private void InitializeState(GraphRequest graph, string start)
    {
        _steps = new();
        _visited = new();
        _stack = new();
        _parent = new();
        _activeEdges = new();
        _traversalOrder = new();
        _allEdges = graph.Edges.ToList();
        _startNode = start;
        _step = 1;

        foreach (var node in graph.Nodes) _parent[node] = "None";

        _stack.Push(start);
    }

    /// <summary>
    /// Build an undirected adjacency list from _allEdges.
    /// Called per-node (stateless, safe for typical graph sizes).
    /// </summary>
    private Dictionary<string, List<string>> BuildAdjacencyList()
    {
        var adj = _parent.Keys.ToDictionary(n => n, _ => new List<string>());

        foreach (var edge in _allEdges)
        {
            adj.TryAdd(edge.From, new());
            adj.TryAdd(edge.To, new());

            if (!adj[edge.From].Contains(edge.To)) adj[edge.From].Add(edge.To);
            if (!adj[edge.To].Contains(edge.From)) adj[edge.To].Add(edge.From);
        }

        return adj;
    }

    /// <summary>Core DFS step: pop → skip-if-visited → mark → expand.</summary>
    private void ProcessNode(string node)
    {
        int subStep = 1;

        RecordPop(node, ref subStep);

        if (_visited.Contains(node))
        {
            RecordSkipAlreadyVisited(node, ref subStep);
            return;
        }

        _visited.Add(node);
        _traversalOrder.Add(node);
        RecordVisit(node, ref subStep);

        ExpandNeighbors(node, ref subStep);
    }

    /// <summary>
    /// Refresh active edges (H), announce the neighbor list,
    /// then push eligible neighbors in reverse order.
    /// Reverse ensures the first neighbor ends on top of the stack.
    /// </summary>
    private void ExpandNeighbors(string node, ref int subStep)
    {
        var adj = BuildAdjacencyList();
        var neighbors = adj.ContainsKey(node) ? adj[node] : new List<string>();

        // ❌ Loại bỏ đỉnh cha
        if (_parent[node] != "None")
        {
            neighbors = neighbors
                .Where(n => n != _parent[node])
                .ToList();
        }

        // Refresh H: edges from `node` to unvisited neighbors only
        _activeEdges = neighbors
            .Where(nb => !_visited.Contains(nb))
            .Select(nb => _allEdges.FirstOrDefault(e =>
                (e.From == node && e.To == nb) || (e.From == nb && e.To == node)))
            .Where(e => e != null)
            .Select(e => new Edge
            {
                From = node,
                To = e!.From == node ? e.To : e.From,
                Weight = e!.Weight
            })
            .ToList();

        // ✅ ===== THÊM ĐOẠN NÀY =====
        if (_activeEdges.Count == 0)
        {
            RecordStep($"{_step}.{subStep++}",
                pseudo: $"'{node}' là đường cụt → Quay lui",
                explain: $"Đỉnh '{node}' không còn đỉnh kề nào chưa thăm. " +
                         $"DFS sẽ quay lui về đỉnh trước đó trong Open để tiếp tục tìm nhánh khác.");

            return; // ⬅ không xét kề nữa
        }
        // ============================

        RecordNeighborList(node, neighbors, ref subStep);

        foreach (var neighbor in neighbors.AsEnumerable().Reverse())
        {
            RecordConsiderNeighbor(node, neighbor, ref subStep);

            if (_visited.Contains(neighbor))
                RecordSkipVisitedNeighbor(neighbor, ref subStep);
            else if (_stack.Contains(neighbor))
                RecordSkipAlreadyInStack(neighbor, ref subStep);
            else
                PushNeighbor(node, neighbor, ref subStep);
        }
    }

    /// <summary>Record parent, then push neighbor onto the stack.</summary>
    private void PushNeighbor(string from, string neighbor, ref int subStep)
    {
        _parent[neighbor] = from;
        RecordSetParent(from, neighbor, ref subStep);

        _stack.Push(neighbor);
        RecordPush(neighbor, ref subStep);
    }

    // ============================================================
    //  LAYER 2 — STEP RECORDING
    //  Each RecordXxx() = one pedagogical moment in the animation.
    //  Pseudo  → short action label shown on screen
    //  Explain → longer teaching narration for voice / tooltip
    // ============================================================

    private void RecordInitialization(string start)
    {
        RecordStep($"{_step}.1",
            pseudo: $"Close := {{}}  |  Parent[*] := None  |  Push(Open, {start})",
            explain: $"Bắt đầu khởi tạo thuật toán DFS. " +
                     $"Tập Close được tạo rỗng để theo dõi những đỉnh đã thăm. " +
                     $"Mảng Parent của mọi đỉnh được đặt về None vì chưa biết đỉnh nào dẫn đến đỉnh nào. " +
                     $"Đỉnh bắt đầu '{start}' được đẩy vào Open — đây sẽ là đỉnh đầu tiên được xử lý.",
            highlight: new HighlightDto { Nodes = new List<string> { start } });

        RecordStep($"{_step}.2",
            pseudo: "H := ∅",
            explain: "Danh sách cạnh đang xét H được khởi tạo rỗng. " +
                     "H sẽ được cập nhật mỗi khi ta mở rộng một đỉnh, giúp hiển thị trực quan các cạnh đang được kiểm tra.");
    }

    private void RecordPop(string node, ref int subStep) =>
        RecordStep($"{_step}.{subStep++}",
            pseudo: $"Pop '{node}' khỏi Open",
            explain: $"Ta lấy đỉnh '{node}' ra khỏi đỉnh ngăn xếp Open. " +
                     $"Open hoạt động theo nguyên tắc LIFO (vào sau — ra trước), " +
                     $"nên đỉnh được thêm gần nhất luôn được xử lý trước. " +
                     $"'{node}' là ứng viên tiếp theo cần kiểm tra.",
            highlight: new HighlightDto { Nodes = new List<string> { node } });

    private void RecordSkipAlreadyVisited(string node, ref int subStep) =>
        RecordStep($"{_step}.{subStep++}",
            pseudo: $"'{node}' ∈ Close → Bỏ qua",
            explain: $"Đỉnh '{node}' đã được đánh dấu thăm từ trước. " +
                     $"Trong DFS, mỗi đỉnh chỉ được xử lý đúng một lần — " +
                     $"điều này ngăn vòng lặp vô hạn và đảm bảo độ phức tạp O(V + E). " +
                     $"Bỏ qua và tiếp tục với phần tử tiếp theo trong Open.",
            highlight: new HighlightDto { Nodes = new List<string> { node } });

    private void RecordVisit(string node, ref int subStep)
    {
        var parentEdge = _parent.TryGetValue(node, out var p) && p != "None"
            ? new List<string> { $"{p}-{node}" }
            : new List<string>();

        RecordStep($"{_step}.{subStep++}",
            pseudo: $"Close.Add('{node}')",
            explain: $"Đỉnh '{node}' chưa được thăm, vì vậy ta đánh dấu nó là đã thăm " +
                     $"và thêm vào danh sách thứ tự duyệt. " +
                     $"Thứ tự duyệt hiện tại: {string.Join(" → ", _traversalOrder)}. " +
                     $"Từ bây giờ nếu gặp lại '{node}' trong Open, ta sẽ bỏ qua nó.",
            highlight: new HighlightDto { Nodes = new List<string> { node }, Edges = parentEdge });
    }

    private void RecordNeighborList(string node, List<string> neighbors, ref int subStep) =>
        RecordStep($"{_step}.{subStep++}",
            pseudo: $"neighbors('{node}') := {{ {string.Join(", ", neighbors)} }}",
            explain: $"Liệt kê tất cả đỉnh kề của '{node}'. " +
                     $"Ta sẽ xét từng đỉnh theo thứ tự ngược để khi đẩy vào Open, " +
                     $"đỉnh đầu tiên trong danh sách sẽ nằm trên cùng và được xử lý trước — " +
                     $"đảm bảo thứ tự duyệt đúng với DFS truyền thống.",
            highlight: new HighlightDto
            {
                Nodes = neighbors,
                Edges = _activeEdges.Select(e => $"{e.From}-{e.To}").ToList()
            });

    private void RecordConsiderNeighbor(string from, string neighbor, ref int subStep) =>
        RecordStep($"{_step}.{subStep++}",
            pseudo: $"Xét đỉnh kề '{neighbor}' của '{from}'",
            explain: $"Đang kiểm tra đỉnh kề '{neighbor}'. " +
                     $"Ta cần xác định '{neighbor}' thuộc trường hợp nào: " +
                     $"đã thăm, đã có trong Open, hay chưa xét — để quyết định bước tiếp theo.",
            highlight: new HighlightDto
            {
                Nodes = new List<string> { neighbor },
                Edges = new List<string> { $"{from}-{neighbor}" }
            });

    private void RecordSkipVisitedNeighbor(string neighbor, ref int subStep) =>
        RecordStep($"{_step}.{subStep++}",
            pseudo: $"'{neighbor}' ∈ Close → Bỏ qua",
            explain: $"Đỉnh '{neighbor}' đã được thăm hoàn toàn. " +
                     $"Không cần đẩy vào Open vì ta sẽ không xử lý nó thêm nữa.",
            highlight: new HighlightDto { Nodes = new List<string> { neighbor } });

    private void RecordSkipAlreadyInStack(string neighbor, ref int subStep) =>
        RecordStep($"{_step}.{subStep++}",
            pseudo: $"'{neighbor}' đã có trong Open → Bỏ qua",
            explain: $"Đỉnh '{neighbor}' đã được lên lịch để xử lý (đang nằm trong Open). " +
                     $"Đẩy thêm một lần nữa sẽ gây duyệt trùng lặp — " +
                     $"vì vậy ta bỏ qua để giữ Open gọn gàng.",
            highlight: new HighlightDto { Nodes = new List<string> { neighbor } });

    private void RecordSetParent(string from, string neighbor, ref int subStep) =>
        RecordStep($"{_step}.{subStep++}",
            pseudo: $"Parent['{neighbor}'] := '{from}'",
            explain: $"Ghi nhận '{from}' là đỉnh cha của '{neighbor}'. " +
                     $"Mảng Parent lưu lại cạnh cây DFS — " +
                     $"sau khi thuật toán kết thúc, ta có thể dùng nó để truy vết đường đi từ bất kỳ đỉnh nào về đỉnh gốc.",
            highlight: new HighlightDto
            {
                Nodes = new List<string> { neighbor },
                Edges = new List<string> { $"{from}-{neighbor}" }
            });

    private void RecordPush(string neighbor, ref int subStep) =>
        RecordStep($"{_step}.{subStep++}",
            pseudo: $"Push '{neighbor}' vào Open",
            explain: $"Đẩy '{neighbor}' lên đỉnh Open. " +
                     $"Do tính chất LIFO, '{neighbor}' sẽ được lấy ra và xử lý " +
                     $"trước tất cả các đỉnh đã có trong Open — " +
                     $"đây chính là cơ chế giúp DFS đi sâu vào một nhánh trước khi quay lui.",
            highlight: new HighlightDto { Nodes = new List<string> { neighbor } });

    private void RecordFinalStep() =>
        RecordStep($"{_step + 1}",
            pseudo: $"Thứ tự duyệt DFS: {string.Join(" → ", _traversalOrder)}",
            explain: "Thuật toán DFS đã hoàn tất. " +
                     "Tất cả các đỉnh có thể tiếp cận từ đỉnh bắt đầu đã được duyệt. " +
                     "Thứ tự hiển thị chính là thứ tự mà thuật toán đi sâu trước, " +
                     "sau đó quay lui theo cơ chế của Open — " +
                     "đây là đặc trưng cốt lõi phân biệt DFS với BFS.",
            highlight: new HighlightDto
            {
                Nodes = _visited.ToList(),
                Edges = BuildAcceptedEdges(_parent)
            },
            acceptedNodes: _visited.ToList(),
            acceptedEdges: BuildAcceptedEdges(_parent));

    // ──────────────────────────────────────────────
    // Core step assembler — single point of StepDto creation
    // ──────────────────────────────────────────────
    private void RecordStep(
        string stepId,
        string pseudo,
        string explain,
        HighlightDto? highlight = null,
        List<string>? acceptedNodes = null,
        List<string>? acceptedEdges = null)
    {
        _steps.Add(new StepDto
        {
            Step = stepId,
            Pseudo = pseudo,
            Explain = explain,
            Color = "",
            VoiceUrl = null,
            Highlight = highlight ?? new HighlightDto(),
            AcceptedNodes = acceptedNodes ?? BuildAcceptedNodes(_parent, _startNode),
            AcceptedEdges = acceptedEdges ?? BuildAcceptedEdges(_parent),
            StateT = FormatVisited(_visited),
            StateQ = FormatStack(_stack),
            StateH = FormatEdgeList(_activeEdges),
            StateDist = "",
            StatePre = FormatParent(_parent)
        });
    }

    // ============================================================
    //  LAYER 3 — STATE FORMATTING
    // ============================================================

    private List<string> BuildAcceptedEdges(Dictionary<string, string> parent) =>
        parent
            .Where(kv => !string.IsNullOrEmpty(kv.Value) && kv.Value != "None")
            .Select(kv => $"{kv.Value}-{kv.Key}")
            .ToList();

    private List<string> BuildAcceptedNodes(Dictionary<string, string> parent, string start)
    {
        var nodes = new HashSet<string> { start };
        foreach (var kv in parent.Where(kv => kv.Value != "None"))
        {
            nodes.Add(kv.Key);
            nodes.Add(kv.Value);
        }
        return nodes.ToList();
    }

    private string FormatVisited(HashSet<string> visited)
        => "{" + string.Join(" → ", visited) + "}";

    private string FormatStack(Stack<string> stack)
        => "[" + string.Join(", ", stack) + "]";

    private string FormatEdgeList(List<Edge> edges)
        => "[" + string.Join(", ", edges.Select(e => $"{e.From}-{e.To}")) + "]";

    private string FormatParent(Dictionary<string, string> parent)
        => string.Join(", ", parent.Select(kv => $"{kv.Key}:{kv.Value}"));
}


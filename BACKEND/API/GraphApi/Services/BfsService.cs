using GraphApi.Models;
using System;
using System.Collections.Generic;
using System.Linq;

namespace GraphApi.Services;

// ============================================================
//  BfsService — Breadth-First Search with step-by-step recording
//
//  Khác biệt cốt lõi so với DFS:
//    DFS  →  Open là Stack  (LIFO) → đi sâu vào một nhánh trước
//    BFS  →  Open là Queue  (FIFO) → duyệt hết một lớp trước khi sang lớp kế
//
//  Quy tắc vàng của BFS:
//    Đánh dấu visited ngay khi ENQUEUE — không phải khi dequeue.
//    → Đảm bảo mỗi đỉnh chỉ được enqueue đúng một lần.
//
//  Architecture (3 clear layers):
//    1. Algorithm Logic  — Run(), ProcessNode(), ExpandNeighbors()
//    2. Step Recording   — RecordXxx() helpers
//    3. State Formatting — FormatXxx() helpers
// ============================================================
public class BfsService
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
    private HashSet<string> _visited = new(); // Close: đánh dấu ngay khi enqueue
    private Queue<string> _queue = new(); // Open: BFS dùng Queue (FIFO)
    private Dictionary<string, string> _parent = new();
    private List<Edge> _activeEdges = new(); // H: cạnh đang được kiểm tra
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

        while (_queue.Count > 0)
        {
            _step++;
            ProcessNode(_queue.Dequeue());
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
        _queue = new();
        _parent = new();
        _activeEdges = new();
        _traversalOrder = new();
        _allEdges = graph.Edges.ToList();
        _startNode = start;
        _step = 1;

        foreach (var node in graph.Nodes) _parent[node] = "None";

        // Quy tắc vàng BFS: visited + enqueue đồng thời, ngay từ đầu
        // _visited.Add(start);
        _queue.Enqueue(start);
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

    /// <summary>
    /// Core BFS step: dequeue → ghi nhận thứ tự → mở rộng neighbor.
    /// Khác DFS: không cần kiểm tra visited khi dequeue
    /// vì đã đảm bảo lúc enqueue.
    /// </summary>
    private void ProcessNode(string node)
    {
        if (_visited.Contains(node))
            return; // tránh xử lý trùng nếu có enqueue trùng

        int subStep = 1;

        RecordDequeue(node, ref subStep);

        // ✅ Close.Add tại đây (kể cả đỉnh bắt đầu)
        _visited.Add(node);
        RecordMarkVisited(node, ref subStep);

        // Ghi nhận thứ tự duyệt
        _traversalOrder.Add(node);

        ExpandNeighbors(node, ref subStep);
    }

    /// <summary>
    /// Refresh active edges (H), announce neighbor list,
    /// then enqueue eligible (unvisited) neighbors.
    /// BFS: duyệt theo thứ tự tự nhiên — Queue FIFO tự đảm bảo thứ tự lớp,
    /// không cần reverse như DFS.
    /// </summary>
    private void ExpandNeighbors(string node, ref int subStep)
    {
        var adj = BuildAdjacencyList();
        var neighbors = adj.ContainsKey(node) ? adj[node] : new List<string>();

        // ❌ Loại bỏ đỉnh cha khỏi danh sách xét (như DFS)
        if (_parent[node] != "None")
            neighbors = neighbors.Where(n => n != _parent[node]).ToList();

        // Refresh H: chỉ các cạnh đến đỉnh chưa thăm
        _activeEdges = neighbors
            .Where(nb => !_visited.Contains(nb))
            .Select(nb => _allEdges.FirstOrDefault(e =>
                (e.From == node && e.To == nb) || (e.From == nb && e.To == node)))
            .Where(e => e != null)
            .Select(e => new Edge { From = node, To = e!.From == node ? e.To : e.From, Weight = e!.Weight })
            .ToList();

        // Không còn đỉnh kề nào chưa thăm → dead end (theo lớp)
        if (_activeEdges.Count == 0)
        {
            RecordStep($"{_step}.{subStep++}",
                pseudo: $"'{node}' không còn đỉnh kề chưa thăm → Tiếp tục lấy đỉnh tiếp theo trong Open",
                explain: $"Đỉnh '{node}' đã được mở rộng hoàn toàn — " +
                         $"tất cả các đỉnh kề hoặc đã được thăm hoặc đã ở trong Open. " +
                         $"BFS sẽ lấy đỉnh tiếp theo ra khỏi đầu hàng đợi để tiếp tục duyệt theo lớp.");
            return;
        }

        RecordNeighborList(node, neighbors, ref subStep);

        // BFS: không reverse — Queue FIFO tự đảm bảo thứ tự đúng
        foreach (var neighbor in neighbors)
        {
            RecordConsiderNeighbor(node, neighbor, ref subStep);

            if (_visited.Contains(neighbor) || _queue.Contains(neighbor))
                RecordSkipAlreadyVisited(neighbor, ref subStep);
            else
                EnqueueNeighbor(node, neighbor, ref subStep);
        }
    }

    /// <summary>
    /// Set parent → đánh dấu visited → enqueue.
    /// Ba bước này phải thực hiện theo đúng thứ tự này.
    /// Visited set TRƯỚC enqueue để chặn các đỉnh kề khác enqueue lại cùng đỉnh.
    /// </summary>
    private void EnqueueNeighbor(string from, string neighbor, ref int subStep)
    {
        _parent[neighbor] = from;
        RecordSetParent(from, neighbor, ref subStep);

        _queue.Enqueue(neighbor);
        RecordEnqueue(neighbor, ref subStep);
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
            pseudo: $"Close := {{}}  |  Parent[*] := None  |  Enqueue(Open, {start})",
            explain: $"Bắt đầu khởi tạo thuật toán BFS. " +
                     $"Tập Close được tạo rỗng để theo dõi những đỉnh đã được lên lịch duyệt. " +
                     $"Mảng Parent của mọi đỉnh được đặt về None vì chưa biết đỉnh nào dẫn đến đỉnh nào. " +
                     $"Đỉnh bắt đầu '{start}' được đánh dấu Close và đưa vào Open ngay lập tức — " +
                     $"đây là quy tắc vàng của BFS: đánh dấu khi ENQUEUE để đảm bảo mỗi đỉnh chỉ vào Open một lần.",
            highlight: new HighlightDto { Nodes = new List<string> { start } });

        RecordStep($"{_step}.2",
            pseudo: "H := ∅",
            explain: "Danh sách cạnh đang xét H được khởi tạo rỗng. " +
                     "H sẽ được cập nhật mỗi khi ta mở rộng một đỉnh, giúp hiển thị trực quan các cạnh đang được kiểm tra.");
    }

    private void RecordDequeue(string node, ref int subStep) =>
        RecordStep($"{_step}.{subStep++}",
            pseudo: $"Pop '{node}' khỏi Open",
            explain: $"Ta lấy đỉnh '{node}' ra khỏi đầu hàng đợi Open. " +
                     $"Open trong BFS hoạt động theo nguyên tắc FIFO (vào trước — ra trước), " +
                     $"nên đỉnh chờ lâu nhất luôn được xử lý trước. " +
                     $"Đây là cơ chế khiến BFS duyệt hoàn toàn một lớp trước khi chuyển sang lớp kế tiếp.",
            highlight: new HighlightDto { Nodes = new List<string> { node } });

    // private void RecordProcess(string node, ref int subStep)
    // {
    //     var parentEdge = _parent.TryGetValue(node, out var p) && p != "None"
    //         ? new List<string> { $"{p}-{node}" }
    //         : new List<string>();

    //     _traversalOrder.Add(node);

    //     RecordStep($"{_step}.{subStep++}",
    //         pseudo: $"Xử lý '{node}'  →  Thứ tự duyệt: {string.Join(" → ", _traversalOrder)}",
    //         explain: $"Đỉnh '{node}' được đưa ra để xử lý. " +
    //                  $"Vì BFS đánh dấu Close lúc enqueue, ta chắc chắn '{node}' chưa từng bị xử lý trước đây. " +
    //                  $"Ghi nhận '{node}' vào thứ tự duyệt. " +
    //                  $"Thứ tự hiện tại: {string.Join(" → ", _traversalOrder)}.",
    //         highlight: new HighlightDto { Nodes = new List<string> { node }, Edges = parentEdge });
    // }

    private void RecordNeighborList(string node, List<string> neighbors, ref int subStep) =>
        RecordStep($"{_step}.{subStep++}",
            pseudo: $"neighbors('{node}') := {{ {string.Join(", ", neighbors)} }}",
            explain: $"Liệt kê tất cả đỉnh kề của '{node}'. " +
                     $"Khác với DFS, BFS không cần duyệt theo thứ tự ngược — " +
                     $"ta xét từng đỉnh theo thứ tự tự nhiên vì Queue FIFO đã đảm bảo " +
                     $"thứ tự duyệt đúng theo lớp mà không cần bất kỳ thao tác đảo ngược nào.",
            highlight: new HighlightDto
            {
                Nodes = neighbors,
                Edges = _activeEdges.Select(e => $"{e.From}-{e.To}").ToList()
            });

    private void RecordConsiderNeighbor(string from, string neighbor, ref int subStep) =>
        RecordStep($"{_step}.{subStep++}",
            pseudo: $"Xét đỉnh kề '{neighbor}' của '{from}'",
            explain: $"Đang kiểm tra đỉnh kề '{neighbor}'. " +
                     $"Ta cần xác định '{neighbor}' đã có trong Close chưa — " +
                     $"nếu chưa, ta sẽ lập tức đánh dấu Close và đưa vào Open để duyệt ở lớp tiếp theo.",
            highlight: new HighlightDto
            {
                Nodes = new List<string> { neighbor },
                Edges = new List<string> { $"{from}-{neighbor}" }
            });

    private void RecordSkipAlreadyVisited(string neighbor, ref int subStep) =>
        RecordStep($"{_step}.{subStep++}",
            pseudo: $"'{neighbor}' ∈ Close → Bỏ qua",
            explain: $"Đỉnh '{neighbor}' đã được đánh dấu Close — " +
                     $"nghĩa là nó đã được enqueue trước đó (đang chờ trong Open hoặc đã xử lý xong). " +
                     $"Nhờ quy tắc đánh dấu khi enqueue, BFS đảm bảo không đỉnh nào bị enqueue hai lần. " +
                     $"Bỏ qua '{neighbor}' và chuyển sang đỉnh kề tiếp theo.",
            highlight: new HighlightDto { Nodes = new List<string> { neighbor } });

    private void RecordSetParent(string from, string neighbor, ref int subStep) =>
        RecordStep($"{_step}.{subStep++}",
            pseudo: $"Parent['{neighbor}'] := '{from}'",
            explain: $"Ghi nhận '{from}' là đỉnh cha của '{neighbor}'. " +
                     $"Mảng Parent trong BFS không chỉ lưu cây duyệt — " +
                     $"nó còn lưu cây đường đi ngắn nhất tính theo số cạnh, " +
                     $"vì BFS luôn tiếp cận một đỉnh lần đầu tiên qua con đường có ít bước nhất.",
            highlight: new HighlightDto
            {
                Nodes = new List<string> { neighbor },
                Edges = new List<string> { $"{from}-{neighbor}" }
            });

    // private void RecordMarkVisited(string neighbor, ref int subStep)
    // {
    //     var parentEdge = _parent.TryGetValue(neighbor, out var p) && p != "None"
    //         ? new List<string> { $"{p}-{neighbor}" }
    //         : new List<string>();

    //     RecordStep($"{_step}.{subStep++}",
    //         pseudo: $"Close.Add('{neighbor}')",
    //         explain: $"Đánh dấu '{neighbor}' vào Close NGAY BÂY GIỜ — trước khi enqueue. " +
    //                  $"Đây là quy tắc vàng của BFS: nếu chỉ đánh dấu khi dequeue, " +
    //                  $"một đỉnh có thể bị enqueue nhiều lần bởi các đỉnh kề khác nhau trong cùng lớp, " +
    //                  $"dẫn đến xử lý trùng lặp và kết quả sai. " +
    //                  $"Đánh dấu sớm khi enqueue là cách duy nhất đảm bảo mỗi đỉnh chỉ được xử lý đúng một lần.",
    //         highlight: new HighlightDto
    //         {
    //             Nodes = new List<string> { neighbor },
    //             Edges = parentEdge
    //         });
    // }

    private void RecordMarkVisited(string node, ref int subStep)
    {
        var parentEdge = _parent.TryGetValue(node, out var p) && p != "None"
            ? new List<string> { $"{p}-{node}" }
            : new List<string>();

        RecordStep($"{_step}.{subStep++}",
            pseudo: $"Close.Add('{node}')",
            explain: $"Đỉnh '{node}' vừa được lấy ra khỏi Open và chính thức được đưa vào Close. " +
                     $"Từ thời điểm này, '{node}' được xem là đã xử lý xong và sẽ không bao giờ được xử lý lại. " +
                     $"Đây là cách đánh dấu visited theo kiểu 'mark when dequeue'.",
            highlight: new HighlightDto
            {
                Nodes = new List<string> { node },
                Edges = parentEdge
            });
    }


    private void RecordEnqueue(string neighbor, ref int subStep)
    {
        var parentEdge = _parent.TryGetValue(neighbor, out var p) && p != "None"
            ? new List<string> { $"{p}-{neighbor}" }
            : new List<string>();

        RecordStep($"{_step}.{subStep++}",
            pseudo: $"Enqueue '{neighbor}' vào Open",
            explain: $"Đẩy '{neighbor}' vào cuối hàng đợi Open.",
            highlight: new HighlightDto
            {
                Nodes = new List<string> { neighbor },
                Edges = parentEdge
            });
    }
    private void RecordFinalStep() =>
        RecordStep($"{_step + 1}",
            pseudo: $"Thứ tự duyệt BFS: {string.Join(" → ", _traversalOrder)}",
            explain: "Thuật toán BFS đã hoàn tất. " +
                     "Tất cả các đỉnh có thể tiếp cận từ đỉnh bắt đầu đã được duyệt theo từng lớp. " +
                     "Thứ tự hiển thị phản ánh đúng cấu trúc lớp của đồ thị: " +
                     "đỉnh nguồn ở lớp 0, các đỉnh kề trực tiếp ở lớp 1, các đỉnh cách 2 bước ở lớp 2, và tiếp tục. " +
                     "Đây là đặc trưng cốt lõi phân biệt BFS với DFS: " +
                     "BFS khám phá theo chiều rộng từng lớp một, còn DFS lao thẳng vào chiều sâu.",
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
            StateQ = FormatQueue(_queue),
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

    // Trái = đầu Queue (sắp dequeue), phải = cuối Queue (mới enqueue)
    private string FormatQueue(Queue<string> queue)
        => "[" + string.Join(", ", queue) + "]";

    private string FormatEdgeList(List<Edge> edges)
        => "[" + string.Join(", ", edges.Select(e => $"{e.From}-{e.To}")) + "]";

    private string FormatParent(Dictionary<string, string> parent)
        => string.Join(", ", parent.Select(kv => $"{kv.Key}:{kv.Value}"));
}
using GraphApi.Models;
using System;
using System.Collections.Generic;
using System.Linq;

namespace GraphApi.Services;

// ============================================================
//  EulerService — Euler Circuit / Path using Hierholzers Algorithm
//
//  Lý thuyết:
//    Chu trình Euler  : đi qua tất cả các CẠNH đúng một lần và quay về đỉnh xuất phát.
//                       Điều kiện: đồ thị liên thông + mọi đỉnh có bậc CHẴN.
//    Đường đi Euler   : đi qua tất cả các CẠNH đúng một lần, không cần quay về.
//                       Điều kiện: đồ thị liên thông + đúng 2 đỉnh có bậc LẺ.
//
//  Thuật toán Hierholzer (Stack-based, không đệ quy):
//    1. Bắt đầu từ đỉnh start, đẩy vào Stack.
//    2. Lấy đỉnh hiện tại từ đỉnh Stack.
//       - Nếu còn cạnh chưa đi → lấy một cạnh, xóa cạnh đó, đẩy đỉnh kia vào Stack.
//       - Nếu không còn cạnh   → pop ra, thêm vào đầu Circuit (quay lui).
//    3. Lặp đến khi Stack rỗng.
//
//  Khác BFS/DFS:
//    BFS/DFS theo dõi ĐỈNH đã thăm.
//    Euler theo dõi CẠNH đã đi — mỗi cạnh chỉ được dùng đúng một lần.
//
//  Architecture (3 clear layers):
//    1. Algorithm Logic  — Run(), CheckEulerian(), ProcessCurrentNode()
//    2. Step Recording   — RecordXxx() helpers
//    3. State Formatting — FormatXxx() helpers
// ============================================================
public class EulerService
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
    private Stack<string> _stack = new(); // Stack duyệt Hierholzer
    private List<string> _circuit = new(); // Kết quả chu trình / đường đi Euler
    private List<Edge> _activeEdges = new(); // H: cạnh đang được xem xét
    private Dictionary<string, List<Edge>> _adjEdges = new(); // Danh sách kề theo CẠNH (có thể xóa)
    private Dictionary<string, int> _degree = new(); // Bậc của từng đỉnh
    private List<Edge> _usedEdges = new(); // Cạnh đã đi qua (để highlight)
    private string _startNode = "";
    private int _step = 0;
    private EulerType _eulerType = EulerType.None;

    private enum EulerType { Circuit, Path, None }

    // ============================================================
    //  ENTRY POINT
    // ============================================================
    public List<StepDto> Run(Guid id, string start)
    {
        if (!_graphs.TryGetValue(id, out var graph))
            throw new InvalidOperationException("Graph not found");

        InitializeState(graph, start);
        RecordInitialization(start);

        // Kiểm tra điều kiện tồn tại Euler trước khi chạy
        if (_eulerType == EulerType.None)
        {
            RecordNoEuler();
            return _steps;
        }

        // Thuật toán Hierholzer
        while (_stack.Count > 0)
        {
            _step++;
            ProcessCurrentNode();
        }

        RecordFinalStep();
        return _steps;
    }

    // ============================================================
    //  LAYER 1 — ALGORITHM LOGIC
    // ============================================================

    /// <summary>
    /// Reset state, build adjacency edge-list, tính bậc, xác định loại Euler.
    /// </summary>
    private void InitializeState(GraphRequest graph, string start)
    {
        _steps = new();
        _stack = new();
        _circuit = new();
        _activeEdges = new();
        _usedEdges = new();
        _adjEdges = new();
        _degree = new();
        _step = 1;

        // 1. Chỉ khởi tạo một lần duy nhất từ danh sách Nodes và IN HOA
        foreach (var node in graph.Nodes)
        {
            var upperNode = node.ToUpper();
            _adjEdges[upperNode] = new();
            _degree[upperNode] = 0;
        }

        // 2. Cập nhật cạnh và bậc (Sử dụng các khóa đã in hoa ở trên)
        foreach (var edge in graph.Edges)
        {
            var from = edge.From.ToUpper();
            var to = edge.To.ToUpper();

            // Thêm cạnh vô hướng
            _adjEdges[from].Add(new Edge { From = from, To = to, Weight = edge.Weight });
            _adjEdges[to].Add(new Edge { From = to, To = from, Weight = edge.Weight });

            // Tăng bậc cho các đỉnh đã tồn tại
            if (_degree.ContainsKey(from)) _degree[from]++;
            if (_degree.ContainsKey(to)) _degree[to]++;
        }

        // Xác định loại Euler
        var oddDegreeNodes = _degree.Where(kv => kv.Value % 2 != 0).Select(kv => kv.Key).ToList();
        _eulerType = oddDegreeNodes.Count switch
        {
            0 => EulerType.Circuit,
            2 => EulerType.Path,
            _ => EulerType.None
        };

        // Đảm bảo startNode in hoa
        _startNode = start.ToUpper();
        if (_eulerType == EulerType.Path && !oddDegreeNodes.Contains(_startNode))
            _startNode = oddDegreeNodes.First();

        _stack.Push(_startNode);
    }

    /// <summary>
    /// Một bước Hierholzer: nhìn vào đỉnh trên đỉnh Stack.
    ///   - Còn cạnh → đi tiếp (push đỉnh kia, xóa cạnh).
    ///   - Hết cạnh → quay lui (pop, prepend vào Circuit).
    /// </summary>
    private void ProcessCurrentNode()
    {
        int subStep = 1;
        string current = _stack.Peek();

        RecordPeek(current, ref subStep);

        var availableEdges = _adjEdges.ContainsKey(current)
            ? _adjEdges[current]
            : new List<Edge>();

        _activeEdges = availableEdges.ToList();

        if (availableEdges.Count > 0)
        {
            // Còn cạnh chưa đi → chọn cạnh đầu tiên và đi
            var chosenEdge = availableEdges.First();
            string next = chosenEdge.To;

            RecordHasEdges(current, availableEdges, ref subStep);
            RecordChooseEdge(current, chosenEdge, ref subStep);

            // Xóa cạnh theo cả hai chiều để không đi lại
            RemoveEdge(current, next);
            RecordRemoveEdge(current, next, ref subStep);

            _usedEdges.Add(chosenEdge);
            _stack.Push(next);
            RecordPushNext(next, ref subStep);
        }
        else
        {
            // Hết cạnh → quay lui: pop và thêm vào đầu Circuit
            _stack.Pop();
            _circuit.Insert(0, current);

            RecordBacktrack(current, ref subStep);
            RecordAddToCircuit(current, ref subStep);
        }
    }

    /// <summary>
    /// Xóa cạnh (u, v) theo cả hai chiều khỏi danh sách kề.
    /// Đây là điểm mấu chốt của Euler: mỗi cạnh chỉ đi đúng một lần.
    /// </summary>
    private void RemoveEdge(string u, string v)
    {
        var edgeUV = _adjEdges[u].FirstOrDefault(e => e.To == v);
        if (edgeUV != null) _adjEdges[u].Remove(edgeUV);

        var edgeVU = _adjEdges[v].FirstOrDefault(e => e.To == u);
        if (edgeVU != null) _adjEdges[v].Remove(edgeVU);
    }

    /// <summary>
    /// Kiểm tra điều kiện Euler và trả về mô tả bậc của từng đỉnh.
    /// </summary>
    private (bool isConnected, List<string> oddNodes) CheckEulerian()
    {
        var oddNodes = _degree.Where(kv => kv.Value % 2 != 0).Select(kv => kv.Key).ToList();
        return (true, oddNodes); // Giả sử đồ thị liên thông (frontend đã kiểm tra)
    }

    // ============================================================
    //  LAYER 2 — STEP RECORDING
    // ============================================================

    private void RecordInitialization(string start)
    {
        var oddNodes = _degree.Where(kv => kv.Value % 2 != 0).Select(kv => kv.Key).ToList();
        var degreeStr = string.Join(", ", _degree.Select(kv => $"({kv.Key})={kv.Value}"));

        // Bước 1: Hiển thị bậc của các đỉnh
        RecordStep($"{_step}.1",
            pseudo: $"Tính bậc các đỉnh: {degreeStr}",
            explain: $"Trước khi chạy thuật toán, ta cần kiểm tra điều kiện tồn tại chu trình / đường đi eo lơ. " +
                     $"Bậc của một đỉnh là số cạnh nối với nó. " +
                     $"Bậc của các đỉnh: {degreeStr}.",
            highlight: new HighlightDto { Nodes = _degree.Keys.ToList() });

        // Bước 2: Kiểm tra điều kiện Euler
        string conditionPseudo;
        string conditionExplain;

        if (_eulerType == EulerType.Circuit)
        {
            conditionPseudo = "Mọi đỉnh có bậc chẵn → Tồn tại CHU TRÌNH EULER";
            conditionExplain = "Tất cả các đỉnh đều có bậc chẵn. " +
                               "Theo định lý eo lơ, đây là điều kiện cần và đủ để đồ thị tồn tại chu trình Euler — " +
                               "tức là một đường đi qua tất cả các cạnh đúng một lần và quay lại đỉnh xuất phát.";
        }
        else if (_eulerType == EulerType.Path)
        {
            conditionPseudo = $"Đúng 2 đỉnh bậc lẻ ({string.Join(", ", oddNodes)}) → Tồn tại ĐƯỜNG ĐI EULER";
            conditionExplain = $"Có đúng hai đỉnh bậc lẻ là {string.Join(" và ", oddNodes)}. " +
                               $"Theo định lý eo lơ, đây là điều kiện cần và đủ để tồn tại đường đi eo lơ — " +
                               $"tức là một đường đi qua tất cả các cạnh đúng một lần nhưng không cần quay về điểm xuất phát. " +
                               $"Đường đi phải bắt đầu và kết thúc tại hai đỉnh bậc lẻ này.";
        }
        else
        {
            conditionPseudo = $"Có {oddNodes.Count} đỉnh bậc lẻ → Không tồn tại Euler";
            conditionExplain = $"Có tới {oddNodes.Count} đỉnh bậc lẻ. " +
                               $"eo lơ chỉ tồn tại khi số đỉnh bậc lẻ là 0 (chu trình) hoặc 2 (đường đi). " +
                               $"Thuật toán dừng lại.";
        }

        RecordStep($"{_step}.2",
            pseudo: conditionPseudo,
            explain: conditionExplain,
            highlight: new HighlightDto { Nodes = oddNodes });

        // Bước 3: Khởi tạo Stack và Circuit
        RecordStep($"{_step}.3",
            pseudo: $"Circuit := []  |  Stack := []  |  Push(Stack, {_startNode})",
            explain: $"Khởi tạo danh sách Circuit rỗng — đây sẽ là chu trình / đường đi eo lơ cuối cùng. " +
                     $"Đẩy đỉnh xuất phát {_startNode} vào Stack để bắt đầu thuật toán Hierholzer. " +
                     $"Thuật toán sẽ đi dọc theo các cạnh cho đến khi không còn cạnh nào, " +
                     $"sau đó quay lui và xây dựng chu trình từng bước.",
            highlight: new HighlightDto { Nodes = new List<string> { _startNode } });

        // Bước 4: H := ∅
        RecordStep($"{_step}.4",
            pseudo: "H := ∅",
            explain: "Danh sách H ghi lại các cạnh đang sẵn sàng để đi từ đỉnh hiện tại. " +
                     "H sẽ thu hẹp dần khi các cạnh bị xóa khỏi đồ thị sau khi được sử dụng.");
    }

    private void RecordNoEuler()
    {
        var oddNodes = _degree.Where(kv => kv.Value % 2 != 0).Select(kv => kv.Key).ToList();
        RecordStep($"{_step}.1",
            pseudo: $"Có {oddNodes.Count} đỉnh bậc lẻ → Không tồn tại Euler. Dừng thuật toán.",
            explain: $"Đồ thị có {oddNodes.Count} đỉnh bậc lẻ ({string.Join(", ", oddNodes)}). " +
                     $"eo lơ chỉ tồn tại khi số đỉnh bậc lẻ là 0 (chu trình eo lơ) hoặc 2 (đường đi eo lơ). " +
                     $"Vì không thỏa điều kiện, thuật toán dừng lại ngay tại đây.",
            highlight: new HighlightDto { Nodes = oddNodes });
    }

    private void RecordPeek(string current, ref int subStep) =>
        RecordStep($"{_step}.{subStep++}",
            pseudo: $"current := Peek(Stack) := {current}",
            explain: $"Nhìn vào đỉnh trên đỉnh Stack: đó là {current}. " +
                     $"Khác với Pop, Peek không lấy đỉnh ra — ta chỉ quan sát để quyết định đi tiếp hay quay lui. " +
                     $"Nếu {current} còn cạnh chưa đi, ta sẽ tiến. " +
                     $"Nếu không còn cạnh nào, ta sẽ pop và ghi vào Circuit.",
            highlight: new HighlightDto
            {
                Nodes = new List<string> { current },
                Edges = _usedEdges.Select(e => $"{e.From}-{e.To}").ToList()
            });

    private void RecordHasEdges(string current, List<Edge> available, ref int subStep) =>
        RecordStep($"{_step}.{subStep++}",
            pseudo: $"{current} còn {available.Count} cạnh chưa đi: {{ {string.Join(", ", available.Select(e => $"{e.From}-{e.To}"))} }}",
            explain: $"Đỉnh {current} vẫn còn {available.Count} cạnh chưa được sử dụng. " +
                     $"Đây là điểm mấu chốt của eo lơ — ta không theo dõi đỉnh đã thăm mà theo dõi CẠNH đã đi. " +
                     $"Còn cạnh nghĩa là ta có thể tiếp tục tiến, chưa cần quay lui.",
            highlight: new HighlightDto
            {
                Nodes = new List<string> { current },
                Edges = available.Select(e => $"{e.From}-{e.To}").ToList()
            });

    private void RecordChooseEdge(string current, Edge edge, ref int subStep) =>
        RecordStep($"{_step}.{subStep++}",
            pseudo: $"Chọn cạnh {edge.From.ToUpper()}-{edge.To.ToUpper()}",
            explain: $"Chọn cạnh đầu tiên trong danh sách: ({edge.From}, {edge.To}). " +
                     $"Thuật toán Hierholzer không cần chọn cạnh thông minh — " +
                     $"bất kỳ cạnh nào cũng được, vì ta sẽ quay lui và sửa lại thứ tự về sau. " +
                     $"Điều này làm cho Hierholzer đơn giản và hiệu quả hơn các thuật toán eo lơ khác.",
            highlight: new HighlightDto
            {
                Nodes = new List<string> { current, edge.To },
                Edges = new List<string> { $"{edge.From.ToUpper()}{edge.To.ToUpper()}" }
            });

    private void RecordRemoveEdge(string from, string to, ref int subStep) =>
        RecordStep($"{_step}.{subStep++}",
            pseudo: $"Xóa cạnh {from}-{to} khỏi đồ thị (cả hai chiều)",
            explain: $"Xóa cạnh ({from}, {to}) khỏi danh sách kề của cả {from} lẫn {to}. " +
                     $"Đây là nguyên tắc cốt lõi của thuật toán eo lơ: " +
                     $"mỗi cạnh chỉ được đi qua đúng MỘT lần. " +
                     $"Bằng cách xóa ngay sau khi dùng, ta đảm bảo không bao giờ đi lại cạnh đã qua.",
            highlight: new HighlightDto
            {
                Nodes = new List<string> { from, to },
                Edges = new List<string> { $"{from}-{to}" }
            });

    private void RecordPushNext(string next, ref int subStep) =>
        RecordStep($"{_step}.{subStep++}",
            pseudo: $"Push {next} vào Stack",
            explain: $"Đẩy đỉnh {next} lên Stack và tiếp tục đi từ {next}. " +
                     $"Stack giúp ta ghi nhớ hành trình đã đi qua. " +
                     $"Khi đến ngõ cụt (hết cạnh), ta sẽ lần lượt pop các đỉnh ra và thu thập vào Circuit.",
            highlight: new HighlightDto { Nodes = new List<string> { next } });

    private void RecordBacktrack(string current, ref int subStep) =>
        RecordStep($"{_step}.{subStep++}",
            pseudo: $"{current} hết cạnh → Pop(Stack) = {current}",
            explain: $"Đỉnh {current} không còn cạnh nào chưa đi. " +
                     $"Đây là lúc Hierholzer thực hiện bước quay lui đặc trưng: " +
                     $"pop {current} ra khỏi Stack. " +
                     $"Việc pop theo thứ tự ngược lại chính là cơ chế xây dựng chu trình đúng thứ tự.",
            highlight: new HighlightDto { Nodes = new List<string> { current } });

    private void RecordAddToCircuit(string current, ref int subStep) =>
        RecordStep($"{_step}.{subStep++}",
            pseudo: $"Circuit.prepend({current})  →  Circuit = [{string.Join(" → ", _circuit)}]",
            explain: $"Thêm {current} vào ĐẦU danh sách Circuit. " +
                     $"Lý do dùng prepend (thêm vào đầu) thay vì append (thêm vào cuối): " +
                     $"vì ta đang đi ngược lại hành trình, nên các đỉnh được pop ra phải được đặt " +
                     $"theo thứ tự ngược để tạo thành chu trình đúng chiều. " +
                     $"Circuit hiện tại: [{string.Join(" → ", _circuit)}].",
            highlight: new HighlightDto
            {
                Nodes = _circuit.ToList(),
                Edges = _usedEdges.Select(e => $"{e.From}-{e.To}").ToList()
            });

    private void RecordFinalStep()
    {
        string circuitStr = string.Join(" → ", _circuit);
        string typeLabel = _eulerType == EulerType.Circuit ? "Chu trình Euler" : "Đường đi Euler";

        // Tạo danh sách cạnh trong Circuit để highlight
        var circuitEdges = _circuit
            .Zip(_circuit.Skip(1), (a, b) => $"{a}-{b}")
            .ToList();

        RecordStep($"{_step + 1}",
            pseudo: $"{typeLabel}: {circuitStr}",
            explain: $"Thuật toán Hierholzer đã hoàn tất. " +
                     $"{typeLabel} tìm được là: {circuitStr}. " +
                     $"Đây là hành trình đi qua tất cả {_usedEdges.Count} cạnh của đồ thị đúng một lần. " +
                     (_eulerType == EulerType.Circuit
                         ? $"Đỉnh xuất phát và kết thúc đều là {_startNode} — đây là chu trình khép kín."
                         : $"Đường đi bắt đầu và kết thúc tại hai đỉnh bậc lẻ."),
            highlight: new HighlightDto
            {
                Nodes = _circuit.Distinct().ToList(),
                Edges = circuitEdges
            },
            acceptedNodes: _circuit.Distinct().ToList(),
            acceptedEdges: circuitEdges);
    }

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
            AcceptedNodes = acceptedNodes ?? _circuit.Distinct().ToList(),
            AcceptedEdges = acceptedEdges ?? _usedEdges.Select(e => $"{e.From}-{e.To}").ToList(),
            StateT = FormatCircuit(_circuit),      // Circuit đang xây dựng
            StateQ = FormatStack(_stack),           // Stack Hierholzer
            StateH = FormatEdgeList(_activeEdges),  // Cạnh còn lại tại đỉnh hiện tại
            StateDist = FormatDegree(_degree),         // Bậc đỉnh (thay cho Dist)
            StatePre = FormatUsedEdges(_usedEdges)    // Cạnh đã đi qua (thay cho Pre)
        });
    }

    // ============================================================
    //  LAYER 3 — STATE FORMATTING
    // ============================================================

    private string FormatCircuit(List<string> circuit)
        => circuit.Count == 0
            ? "[]"
            : "[" + string.Join(" → ", circuit) + "]";

    private string FormatStack(Stack<string> stack)
        => "[" + string.Join(", ", stack) + "]";

    private string FormatEdgeList(List<Edge> edges)
        => "[" + string.Join(", ", edges.Select(e => $"{e.From}-{e.To}")) + "]";

    private string FormatDegree(Dictionary<string, int> degree)
    {
        // Lọc bỏ các đỉnh rác (nếu có) và sắp xếp theo bảng chữ cái để hiển thị ổn định
        return string.Join(", ", degree
            .OrderBy(kv => kv.Key)
            .Select(kv => $"({kv.Key})={kv.Value}"));
    }

    private string FormatUsedEdges(List<Edge> used)
        => "[" + string.Join(", ", used.Select(e => $"{e.From}-{e.To}")) + "]";
}
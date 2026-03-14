
using GraphApi.Models;
using System;
using System.Collections.Generic;
using System.Linq;

namespace GraphApi.Services;

public class PrimService
{
    private readonly Dictionary<Guid, GraphRequest> _graphs = new();

    public void CreateGraphWithId(Guid id, GraphRequest request)
    {
        _graphs[id] = request;
    }

    // Giữ lại hàm cũ nếu frontend vẫn dùng, nhưng đổi logic một chút
    public Guid CreateGraph(GraphRequest request)
    {
        var id = Guid.NewGuid();
        _graphs[id] = request;
        return id;
    }

    public List<StepDto> RunPrim(Guid id, string start)
    {
        if (!_graphs.TryGetValue(id, out var graph))
            throw new InvalidOperationException("Graph not found");

        var V = graph.Nodes.ToList();
        var E = graph.Edges.ToList();

        if (!V.Contains(start))
            throw new ArgumentException($"Start node '{start}' không tồn tại");

        // ===== STATE =====
        HashSet<string> T = new();                 // MST nodes
        List<string> Q = new();                    // candidate nodes
        List<Edge> H = new();                      // cut edges (optional, để hiển thị)
        Dictionary<string, double> Dist = new();   // min edge weight
        Dictionary<string, string> Pre = new();    // parent in MST

        foreach (var v in V)
        {
            Dist[v] = double.PositiveInfinity;
            Pre[v] = "None";
        }

        var steps = new List<StepDto>();
        int buoc = 1;

        // ===== BƯỚC 1: KHỞI TẠO =====
        AddStep(steps, $"{buoc}.1",
            "T := ∅",
            "Khởi tạo tập T rỗng (các đỉnh thuộc cây khung)",
            T, Q, H, Dist, Pre);

        AddStep(steps, $"{buoc}.2",
            "For v ∈ V: Dist[v] := ∞; Pre[v] := None",
            "Khởi tạo trọng số nhỏ nhất và đỉnh cha cho tất cả các đỉnh",
            T, Q, H, Dist, Pre);

        Dist[start] = 0;
        Q.Add(start);

        AddStep(steps, $"{buoc}.3",
            $"Dist[{start}] = 0; Q = {{{start}}}",
            $"Chọn đỉnh bắt đầu {start}",
            T, Q, H, Dist, Pre,
            highlight: new HighlightDto
            {
                Nodes = new List<string> { start }
            });

        // ===== VÒNG LẶP CHÍNH =====
        while (Q.Count > 0)
        {
            buoc++;
            int sub = 1;

            string t = Q.OrderBy(x => Dist[x]).First();
            Q.Remove(t);

            AddStep(steps, $"{buoc}.{sub++}",
                $"t := get(min(Dist[Q])) = {t}",
                $"Chọn đỉnh {t} có cạnh nối nhỏ nhất vào cây",
                T, Q, H, Dist, Pre,
                highlight: new HighlightDto
                {
                    Nodes = new List<string> { t }
                });

            T.Add(t);

            AddStep(steps, $"{buoc}.{sub++}",
                $"Append(T, {t})",
                $"Thêm đỉnh {t} vào cây khung",
                T, Q, H, Dist, Pre,
                highlight: new HighlightDto
                {
                    Edges = Pre[t] != "None"
                        ? new List<string> { $"{Pre[t]}-{t}" }
                        : new List<string>()
                });

            // Lấy các cạnh kề
            var adjEdges = E
                .Where(e => e.From == t || e.To == t)
                .Select(e => new Edge
                {
                    From = t,
                    To = e.From == t ? e.To : e.From,
                    Weight = e.Weight
                })
                .ToList();

            foreach (var e in adjEdges)
            {
                string v = e.To;
                double w = e.Weight;

                if (T.Contains(v))
                    continue;

                AddStep(steps, $"{buoc}.{sub++}",
                    $"Xét cạnh ({t},{v},{w})",
                    $"Xét cạnh nối từ {t} đến {v}",
                    T, Q, H, Dist, Pre,
                    highlight: new HighlightDto
                    {
                        Edges = new List<string> { $"{t}-{v}" },
                        Nodes = new List<string> { v }
                    });

                if (w < Dist[v])
                {
                    Dist[v] = w;
                    Pre[v] = t;

                    if (!Q.Contains(v))
                        Q.Add(v);

                    AddStep(steps, $"{buoc}.{sub++}",
                        $"Dist[{v}] = {w}; Pre[{v}] = {t}",
                        $"Cập nhật cạnh nhỏ nhất nối {v} vào cây",
                        T, Q, H, Dist, Pre,
                        highlight: new HighlightDto
                        {
                            Edges = new List<string> { $"{t}-{v}" },
                            Nodes = new List<string> { v }
                        });
                }
                else
                {
                    AddStep(steps, $"{buoc}.{sub++}",
                        $"Dist[{v}] ≤ {w}",
                        $"Không cập nhật vì cạnh hiện tại không tốt hơn",
                        T, Q, H, Dist, Pre);
                }
            }
        }



        // ===== KẾT QUẢ =====
        var totalWeight = CalculateMstTotalWeight(Pre, E);

        AddStep(steps, $"{buoc + 1}",
            $"Kết quả: Tổng trọng số MST = {totalWeight}",
            $"Tổng trọng số của cây khung nhỏ nhất là {totalWeight}",
            T, Q, H, Dist, Pre,
            highlight: new HighlightDto
            {
                Edges = BuildAcceptedEdges(Pre),
                Nodes = BuildAcceptedNodes(Pre)
            },
            acceptedNodes: BuildAcceptedNodes(Pre),
            acceptedEdges: BuildAcceptedEdges(Pre));

        return steps;
    }


    private double CalculateMstTotalWeight(
    Dictionary<string, string> pre,
    List<Edge> edges)
    {
        double total = 0;

        foreach (var kv in pre)
        {
            var u = kv.Value;
            var v = kv.Key;

            if (string.IsNullOrEmpty(u) || u == "None")
                continue;

            var edge = edges.FirstOrDefault(e =>
                (e.From == u && e.To == v) ||
                (e.From == v && e.To == u));

            if (edge != null)
                total += edge.Weight;
        }

        return total;
    }


    // ===================== HELPER =====================

    private void AddStep(
        List<StepDto> steps,
        string step,
        string pseudo,
        string explain,
        HashSet<string> T,
        List<string> Q,
        List<Edge> H,
        Dictionary<string, double> Dist,
        Dictionary<string, string> Pre,
        HighlightDto? highlight = null,
        List<string>? acceptedNodes = null,
        List<string>? acceptedEdges = null)
    {
        steps.Add(new StepDto
        {
            Step = step,
            Pseudo = pseudo,
            Explain = explain,
            Highlight = highlight ?? new HighlightDto(),
            AcceptedNodes = acceptedNodes ?? BuildAcceptedNodes(Pre),
            AcceptedEdges = acceptedEdges ?? BuildAcceptedEdges(Pre),
            StateT = PrintSet(T),
            StateQ = PrintList(Q),
            StateH = PrintEdgeList(H),
            StateDist = PrintDict(Dist),
            StatePre = PrintPre(Pre)
        });
    }

    private List<string> BuildAcceptedEdges(Dictionary<string, string> pre)
    {
        var list = new List<string>();
        foreach (var kv in pre)
        {
            if (!string.IsNullOrEmpty(kv.Value) && kv.Value != "None")
                list.Add($"{kv.Value}-{kv.Key}");
        }
        return list;
    }

    private List<string> BuildAcceptedNodes(Dictionary<string, string> pre)
    {
        var set = new HashSet<string>();
        foreach (var kv in pre)
        {
            if (!string.IsNullOrEmpty(kv.Value) && kv.Value != "None")
            {
                set.Add(kv.Key);
                set.Add(kv.Value);
            }
        }
        return set.ToList();
    }

    private string PrintDict(Dictionary<string, double> dict)
    {
        return string.Join(", ", dict.Select(kv =>
            $"{kv.Key}:{(double.IsInfinity(kv.Value) ? "∞" : kv.Value.ToString())}"));
    }

    private string PrintPre(Dictionary<string, string> dict)
    {
        return string.Join(", ", dict.Select(kv => $"{kv.Key}:{kv.Value}"));
    }

    private string PrintSet(HashSet<string> set)
    {
        return "{" + string.Join(", ", set) + "}";
    }

    private string PrintList(List<string> list)
    {
        return "[" + string.Join(", ", list) + "]";
    }

    private string PrintEdgeList(List<Edge> edges)
    {
        return "[" + string.Join(", ",
            edges.Select(e => $"({e.From},{e.To},{e.Weight})")) + "]";
    }
}

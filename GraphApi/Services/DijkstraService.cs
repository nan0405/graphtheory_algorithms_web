using GraphApi.Models;
using System;
using System.Collections.Generic;
using System.Linq;

namespace GraphApi.Services;

public class DijkstraService
{
    private readonly Dictionary<Guid, GraphRequest> _graphs = new();
    private readonly VoiceService _voiceService;

    public DijkstraService()
    {
        _voiceService = new VoiceService();
    }

    public Guid CreateGraph(GraphRequest request)
    {
        var id = Guid.NewGuid();
        _graphs[id] = request;
        return id;
    }

    public List<StepDto> Run(Guid id, string start)
    {
        if (!_graphs.TryGetValue(id, out var graph))
            throw new InvalidOperationException("Graph not found");

        HashSet<string> T = new();
        List<Edge> E = graph.Edges.ToList();
        List<string> Q = new();
        List<Edge> H = new();
        Dictionary<string, double> Dist = new();
        Dictionary<string, string> Pre = new();
        List<string> V = graph.Nodes.ToList();

        var adj = new Dictionary<string, List<(string To, double W)>>();
        foreach (var v in V) adj[v] = new List<(string, double)>();
        foreach (var e in E)
        {
            if (!adj.ContainsKey(e.From)) adj[e.From] = new();
            if (!adj.ContainsKey(e.To)) adj[e.To] = new();

            if (!adj[e.From].Any(x => x.To == e.To)) adj[e.From].Add((e.To, e.Weight));
            if (!adj[e.To].Any(x => x.To == e.From)) adj[e.To].Add((e.From, e.Weight));
        }

        var steps = new List<StepDto>();
        int buoc = 1;
        T.Clear();
        AddStep(steps, $"{buoc}.1",
            "Close := {}",
            "Khởi tạo danh sách Close rỗng để lưu các đỉnh được chốt",
            T, Q, H, Dist, Pre, start);

        foreach (var v in V)
        {
            Dist[v] = double.PositiveInfinity;
            Pre[v] = "None";
        }

        AddStep(steps, $"{buoc}.2",
            "For t ∈ V: Prev[t] := None; Dist[t] := ∞; ",
            "Đặt toàn bộ giá trị khoảng cách của các đỉnh bằng vô cực và giá trị đỉnh trước của các đỉnh thành rỗng",
            T, Q, H, Dist, Pre, start);

        if (!Dist.ContainsKey(start))
            throw new ArgumentException($"Start node '{start}' không tồn tại trong graph.");

        Dist[start] = 0;
        AddStep(steps, $"{buoc}.3",
            $"Dist[{start}] = 0",
            $"Đặt giá trị khoảng cách của đỉnh {start} bằng không",
            T, Q, H, Dist, Pre, start,
            highlight: new HighlightDto { Nodes = new List<string> { start } });

        Q.Add(start);
        AddStep(steps, $"{buoc}.4",
            $"Open := ∅; put({start}, Open)",
            $"Khởi tạo tập Open bằng {{{start}}} là đỉnh đang xét",
            T, Q, H, Dist, Pre, start,
            highlight: new HighlightDto { Nodes = new List<string> { start } });

        H.Clear();
        AddStep(steps, $"{buoc}.5",
            "H := ∅",
            "Khởi tạo danh sách H gồm các cạnh xuất phát từ đỉnh đang xét",
            T, Q, H, Dist, Pre, start);
        while (Q.Count > 0)
        {
            buoc++;
            int buocnho = 1;

            string t = Q.OrderBy(x => Dist.ContainsKey(x) ? Dist[x] : double.PositiveInfinity).First();
            Q.Remove(t);

            AddStep(steps, $"{buoc}.{buocnho++}",
                $"t := get(min(Dist[Open])) := {t}",
                $"Lấy đỉnh {t} ra khỏi Open vì đỉnh {t} có giá trị khoảng cách nhỏ nhất trong Q",
                T, Q, H, Dist, Pre, start,
                highlight: new HighlightDto { Nodes = new List<string> { t } });

            var oldEdges = E.Where(e => e.To == t && Pre[t] != e.From).ToList();

            T.Add(t);
            AddStep(steps, $"{buoc}.{buocnho++}",
                $"Append(Close, {t})",
                $"Duyệt đỉnh {t} và thêm vào Close",
                T, Q, H, Dist, Pre, start,
                highlight: new HighlightDto
                {
                    Edges = new List<string> { $"{Pre[t]}-{t}" },
                    RemovedEdges = oldEdges.Select(e => $"{e.From}-{e.To}").ToList()
                });

            if (T.Count == V.Count)
            {

                buoc++;
                AddStep(steps, $"{buoc}.1",
                    "Kết thúc Dijkstra",
                    "Thuật toán đã hoàn tất.",
                    T, Q, H, Dist, Pre, start);

                break;
            }

            var newEdges = adj[t]
                .Select(nb => new Edge { From = t, To = nb.To, Weight = (int)nb.W })
                .ToList();

            foreach (var ne in newEdges)
            {
                bool exists = H.Any(h =>
                    (h.From == ne.From && h.To == ne.To) ||
                    (h.From == ne.To && h.To == ne.From));
                if (!exists)
                {
                    H.Add(ne);
                    if (!Q.Contains(ne.To) && !T.Contains(ne.To))
                        Q.Add(ne.To);
                    }
            }



            string hEdges = string.Join(", ", H.Select(e => $"({e.From},{e.To},{e.Weight})"));

            AddStep(steps, $"{buoc}.{buocnho++}",
                $"For e ∈ E if e.From = {t} → thêm vào Open",
                $"Tìm các cạnh xuất phát từ {t} gồm {hEdges} và thêm vào danh sách Open",
                T, Q, H, Dist, Pre, start,
                highlight: new HighlightDto { Edges = H.Select(e => $"{e.From}-{e.To}").ToList() });

            AddStep(steps, $"{buoc}.{buocnho++}",
                "For e ∈ Open",
                "Xét từng cạnh trong danh sách Open",
                T, Q, H, Dist, Pre, start,
                highlight: new HighlightDto { Edges = H.Select(e => $"{e.From}-{e.To}").ToList() });

            var edgesFromT = H.Where(x => x.From == t).ToList();

            foreach (var e in edgesFromT)
            {
                string u = e.From;
                string v = e.To;
                double w = e.Weight;

                if (T.Contains(v))
                {
                    H.RemoveAll(h => (h.From == e.From && h.To == e.To) || (h.From == e.To && h.To == e.From));
                    continue;
                }

                AddStep(steps, $"{buoc}.{buocnho++}",
                    $"Xét đỉnh {v}",
                    $"Xét đỉnh {v}",
                    T, Q, H, Dist, Pre, start,
                    highlight: new HighlightDto
                    {
                        Edges = new List<string> { $"{u}-{v}" },
                        Nodes = new List<string> { v }
                    });

                double du = Dist.ContainsKey(u) ? Dist[u] : double.PositiveInfinity;
                double dv = Dist.ContainsKey(v) ? Dist[v] : double.PositiveInfinity;
                double alt = double.IsInfinity(du) ? double.PositiveInfinity : du + w;

                if (alt < dv)
                {
                    Dist[v] = alt;
                    Pre[v] = u;

                    if (!Q.Contains(v)) Q.Add(v);

                    AddStep(steps, $"{buoc}.{buocnho++}",
                        $"Append(Open,{v})",
                        $"Thêm đỉnh {v} vào tập Open",
                        T, Q, H, Dist, Pre, start,
                        highlight: new HighlightDto
                        {
                            Edges = new List<string> { $"{u}-{v}" },
                            Nodes = new List<string> { v }
                        });

                    AddStep(steps, $"{buoc}.{buocnho++}",
                        $"Dist[{v}] = min({(double.IsInfinity(dv) ? "∞" : dv.ToString())}, {du} + {w}) = {Dist[v]}",
                        $"Cập nhật giá trị khoảng cách của đỉnh {v} bằng {Dist[v]} được tính bằng khoảng cách hiện tại của đỉnh {u} cộng với trọng số của cạnh {u} {v}",
                        T, Q, H, Dist, Pre, start,
                        highlight: new HighlightDto
                        {
                            Edges = new List<string> { $"{u}-{v}" },
                            Nodes = new List<string> { v }
                        });
                    
                    AddStep(steps, $"{buoc}.{buocnho++}",
                        $"Prev[{v}] = {u}",
                        $"Cập nhật đỉnh trước của {v} là {u}",
                        T, Q, H, Dist, Pre, start,
                        highlight: new HighlightDto
                        {
                            Edges = new List<string> { $"{u}-{v}" },
                            Nodes = new List<string> { v }
                        });
                }
                else
                {
                    AddStep(steps, $"{buoc}.{buocnho++}",
                        $"Dist[{v}] ≤ Dist[{u}] + {w}",
                        $"Không cập nhật khoảng cách của đỉnh {v}",
                        T, Q, H, Dist, Pre, start,
                        highlight: null);
                }

                H.RemoveAll(h => (h.From == e.From && h.To == e.To) || (h.From == e.To && h.To == e.From));
            }

            // AddStep(steps, $"{buoc}.{buocnho++}",
            //     "H := current",
            //     "Danh sách H hiện tại là " + PrintEdgeList(H),
            //     T, Q, H, Dist, Pre, start,
            //     highlight: null);

        }
        if (T.Count == V.Count)
        {
            AddStep(steps, $"{buoc}.1",
                "Kết thúc Dijkstra",
                "Thuật toán hoàn tất. Tất cả đỉnh đã được duyệt.",
                T, Q, H, Dist, Pre, start,
                highlight: new HighlightDto());
        }
        foreach (var v in V.Where(x => x != start))
        {
            if (double.IsInfinity(Dist[v])) continue;

            var path = new List<string>();
            string cur = v;

            while (cur != "None" && cur != start)
            {
                path.Add(cur);
                cur = Pre.ContainsKey(cur) ? Pre[cur] : "None";
            }
            if (cur == start) path.Add(start);
            path.Reverse();

            string pathStr = string.Join("-", path);
            string explain = $"Đường đi ngắn nhất từ {start} đến {v} là {pathStr} với tổng trọng số bằng {Dist[v]})";

            AddStep(steps, $"{buoc + 1}.{v}",
                $"{pathStr} ({Dist[v]})",
                explain,
                T, Q, H, Dist, Pre, start,
                highlight: new HighlightDto
                {
                    Edges = path.Zip(path.Skip(1), (a, b) => $"{a}-{b}").ToList(),
                    Nodes = path
                },
                acceptedNodes: path,
                acceptedEdges: path.Zip(path.Skip(1), (a, b) => $"{a}-{b}").ToList());
        }

        AddStep(steps, $"{buoc + 1}",
            "Kết quả: đường đi ngắn nhất",
            "Hiển thị đường đi ngắn nhất bằng màu xanh dương.",
            T, Q, H, Dist, Pre, start,
            highlight: new HighlightDto
            {
                Edges = BuildAcceptedEdges(Pre),
                Nodes = BuildAcceptedNodes(Pre, start)
            },
            acceptedNodes: BuildAcceptedNodes(Pre, start),
            acceptedEdges: BuildAcceptedEdges(Pre));

        return steps;
    }

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
        string start,
        HighlightDto? highlight = null,
        List<string>? acceptedNodes = null,
        List<string>? acceptedEdges = null)
    {

        var dto = new StepDto
        {
            Step = step,
            Pseudo = pseudo,
            Explain = explain,
            Color = "",
            VoiceUrl = null,
            Highlight = highlight ?? new HighlightDto(),
            AcceptedNodes = acceptedNodes ?? BuildAcceptedNodes(Pre, start),
            AcceptedEdges = acceptedEdges ?? BuildAcceptedEdges(Pre),
            StateT = PrintSet(T),
            StateQ = PrintList(Q),
            StateH = PrintEdgeList(H),
            StateDist = PrintDict(Dist),
            StatePre = PrintPre(Pre)
        };

        steps.Add(dto);
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

    private List<string> BuildAcceptedNodes(Dictionary<string, string> pre, string start)
    {
        var set = new HashSet<string> { start };

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

    private string PrintEdgeList(List<Edge> list)
    {
        return "[" + string.Join(", ", list.Select(e => $"{e.From}-{e.To}({e.Weight})")) + "]";
    }
}
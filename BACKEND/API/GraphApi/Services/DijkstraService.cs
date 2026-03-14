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

    public List<StepDto> Run(Guid id, string start, string end)
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
            "Khởi tạo tập đóng rỗng để lưu các đỉnh được chốt",
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
            $"Khởi tạo tập mở bằng {{{start}}} là đỉnh đang xét",
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

            // 1. Chọn đỉnh t có Dist nhỏ nhất trong Q
            string t = Q.OrderBy(x => Dist.ContainsKey(x) ? Dist[x] : double.PositiveInfinity).First();
            Q.Remove(t);

            AddStep(steps, $"{buoc}.{buocnho++}",
                $"t := get(min(Dist[Open])) := {t}",
                $"Lấy đỉnh {t} ra khỏi mở vì có khoảng cách Dist nhỏ nhất",
                T, Q, H, Dist, Pre, start,
                highlight: new HighlightDto { Nodes = new List<string> { t } });



            // Lấy cạnh dẫn đến đỉnh t từ danh sách Pre để tô màu xanh dương
            var edgesToHighlight = new List<string>();
            if (Pre.ContainsKey(t) && Pre[t] != "None")
            {
                edgesToHighlight.Add($"{Pre[t]}-{t}");
            }

            AddStep(steps, $"{buoc}.{buocnho++}",
                $"Append(Close, {t})",
                $"Chốt đỉnh {t} vào tập đóng",
                T, Q, H, Dist, Pre, start,
                highlight: new HighlightDto
                {
                    Nodes = new List<string> { t },
                    Edges = edgesToHighlight // THÊM DÒNG NÀY: Để frontend biết cạnh nào cần tô xanh
                });

            if (!string.IsNullOrEmpty(end) && t == end)
            {
                AddStep(steps,
                    $"{buoc}.{buocnho}",
                    $"Đã tìm thấy đỉnh đích {end}",
                    $"Dừng thuật toán vì đã tìm được đường đi ngắn nhất từ {start} đến {end}",
                    T, Q, H, Dist, Pre, start,
                    highlight: new HighlightDto { Nodes = new List<string> { end } }
                );
                break;
            }

            T.Add(t);
            // 3. Tìm các lân cận của t (Chỉ lấy các cạnh xuất phát từ t)
            var neighbors = adj[t].ToList();
            H.Clear();

            foreach (var nb in neighbors)
            {
                // Chỉ thêm vào danh sách xét nếu đỉnh đích chưa bị chốt (không nằm trong T)
                if (!T.Contains(nb.To))
                {
                    H.Add(new Edge { From = t, To = nb.To, Weight = (int)nb.W });
                }
            }

            // CẬP NHẬT ĐOẠN NÀY:
            AddStep(steps, $"{buoc}.{buocnho++}",
                $"Xét các lân cận của {t}",
                $"Tìm các cạnh xuất phát từ {t} để kiểm tra việc cập nhật khoảng cách",
                T, Q, H, Dist, Pre, start,
                highlight: new HighlightDto
                {
                    // Lấy danh sách ID các cạnh để tô vàng cạnh
                    Edges = H.Select(e => $"{e.From}-{e.To}").ToList(),
                    // Lấy danh sách ID các đỉnh đích để tô vàng đỉnh
                    Nodes = H.Select(e => e.To).ToList()
                });
            // 4. Duyệt từng lân cận v
            foreach (var e in H.ToList())
            {
                string u = e.From;
                string v = e.To;
                double w = e.Weight;

                // Nếu v đã chốt (trong T) thì bỏ qua
                if (T.Contains(v)) continue;

                AddStep(steps, $"{buoc}.{buocnho++}",
                    $"Xét đỉnh {v}",
                    $"Kiểm tra chi phí đi từ {start} qua {u} đến {v}",
                    T, Q, H, Dist, Pre, start,
                    highlight: new HighlightDto
                    {
                        Edges = new List<string> { $"{u}-{v}" },
                        Nodes = new List<string> { v }
                    });

                double du = Dist[u];
                double dv = Dist[v];
                double alt = du + w;

                if (alt < dv)
                {
                    // CẬP NHẬT KHOẢNG CÁCH
                    Dist[v] = alt;
                    Pre[v] = u;

                    // CHỈ THÊM VÀO Q KHI ĐƯỢC CẬP NHẬT (Theo ý bạn)
                    if (!Q.Contains(v))
                    {
                        Q.Add(v);
                        AddStep(steps, $"{buoc}.{buocnho++}",
                            $"Append(Open, {v})",
                            $"Vì tìm thấy đường đi ngắn hơn, thêm {v} vào tập mở để xét tiếp",
                            T, Q, H, Dist, Pre, start,
                            highlight: new HighlightDto { Nodes = new List<string> { v } });
                    }

                    AddStep(steps, $"{buoc}.{buocnho++}",
                        $"Dist[{v}] = {alt}",
                        $"Cập nhật khoảng cách mới cho {v} là {alt} (qua {u})",
                        T, Q, H, Dist, Pre, start,
                        highlight: new HighlightDto
                        {
                            Edges = new List<string> { $"{u}-{v}" },
                            Nodes = new List<string> { v }
                        });

                    AddStep(steps, $"{buoc}.{buocnho++}",
                        $"Prev[{v}] = {u}",
                        $"Ghi nhận đỉnh trước của {v} là {u}",
                        T, Q, H, Dist, Pre, start,
                        highlight: new HighlightDto { Nodes = new List<string> { v } });
                }
                else
                {
                    AddStep(steps, $"{buoc}.{buocnho++}",

              $"Dist[{v}] ≤ Dist[{u}] + {w}",
                        $"Không cập nhật vì đường đi hiện tại đến {v} đã tối ưu hơn",
                        T, Q, H, Dist, Pre, start,
                        highlight: null);
                }
            }
        }
        // ... (Các phần còn lại giữ nguyên)
        if (T.Count == V.Count)
        {
            AddStep(steps, $"{buoc}.1",
                "Kết thúc Dijkstra",
                "Thuật toán hoàn tất. Tất cả đỉnh đã được duyệt.",
                T, Q, H, Dist, Pre, start,
                highlight: new HighlightDto());
        }


        if (!string.IsNullOrEmpty(end))
        {
            if (Pre.ContainsKey(end) && Pre[end] != "None")
            {
                var path = new List<string>();
                string cur = end;

                // Truy vết ngược từ đích về đầu
                while (cur != "None" && cur != start)
                {
                    path.Add(cur);
                    cur = Pre.ContainsKey(cur) ? Pre[cur] : "None";
                }
                if (cur == start) path.Add(start);
                path.Reverse();

                string pathStr = string.Join(" → ", path);
                double cost = Dist[end];

                AddStep(
                    steps,
                    $"{buoc + 1}",
                    $"Kết quả: {pathStr} ({cost})",
                    $"Đường đi ngắn nhất từ {start} đến {end} là {pathStr} với tổng trọng số {cost}",
                    T, Q, H, Dist, Pre, start,
                    highlight: new HighlightDto
                    {
                        Nodes = path,
                        Edges = path.Zip(path.Skip(1), (a, b) => $"{a}-{b}").ToList()
                    },
                    acceptedNodes: path,
                    acceptedEdges: path.Zip(path.Skip(1), (a, b) => $"{a}-{b}").ToList()
                );

            }

            else
            {
                AddStep(steps, $"{buoc + 1}",
                    "Không tìm thấy đường đi",
                    $"Không có đường đi từ {start} đến {end}",
                    T, Q, H, Dist, Pre, start);
            }
        }

        if (string.IsNullOrEmpty(end))
        {
            foreach (var v in V.Where(x => x != start))
            {
                if (!Dist.ContainsKey(v) || double.IsInfinity(Dist[v]))
                {
                    AddStep(steps,
                        $"{buoc + 1}",
                        $"Không có đường đi tới {v}",
                        $"Không tồn tại đường đi từ {start} đến {v}",
                        T, Q, H, Dist, Pre, start);
                    continue;
                }


                var (path, cost) = BuildPath(start, v, Pre, Dist);
                string pathStr = string.Join(" → ", path);

                AddStep(
                    steps,
                    $"{buoc + 1}",
                    $"Kết quả: {pathStr} ({cost})",
                    $"Đường đi ngắn nhất từ {start} đến {v} là {pathStr} với tổng trọng số {cost}",
                    T, Q, H, Dist, Pre, start,
                    highlight: new HighlightDto
                    {
                        Nodes = path,
                        Edges = path.Zip(path.Skip(1), (a, b) => $"{a}-{b}").ToList()
                    },
                    acceptedNodes: path,
                    acceptedEdges: path.Zip(path.Skip(1), (a, b) => $"{a}-{b}").ToList()
                );

            }
        }


        return steps;
    }


    private (List<string> Path, double Cost) BuildPath(
    string start,
    string end,
    Dictionary<string, string> Pre,
    Dictionary<string, double> Dist
)
    {
        var path = new List<string>();
        string cur = end;

        while (cur != "None" && cur != start)
        {
            path.Add(cur);
            cur = Pre.ContainsKey(cur) ? Pre[cur] : "None";
        }

        if (cur == start)
            path.Add(start);

        path.Reverse();
        return (path, Dist[end]);
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
using GraphApi.Models;
using System;
using System.Collections.Generic;
using System.Linq;

namespace GraphApi.Services;

public class HamiltonService
{
    private readonly Dictionary<Guid, GraphRequest> _graphs = new();

    public void CreateGraphWithId(Guid id, GraphRequest request)
    {
        _graphs[id] = request;
    }

    public Guid CreateGraph(GraphRequest request)
    {
        var id = Guid.NewGuid();
        _graphs[id] = request;
        return id;
    }

    public List<StepDto> RunHamilton(Guid id, string start)
    {
        if (!_graphs.TryGetValue(id, out var graph))
            throw new InvalidOperationException("Graph not found");

        var V = graph.Nodes.ToList();
        var E = graph.Edges.ToList();

        if (!V.Contains(start))
            throw new ArgumentException($"Start node '{start}' không tồn tại");

        // ===== XÂY DỰNG DANH SÁCH KỀ =====
        var adj = new Dictionary<string, List<string>>();
        foreach (var v in V)
            adj[v] = new List<string>();

        foreach (var e in E)
        {
            if (!adj.ContainsKey(e.From)) adj[e.From] = new();
            if (!adj.ContainsKey(e.To)) adj[e.To] = new();

            if (!adj[e.From].Contains(e.To)) adj[e.From].Add(e.To);
            if (!adj[e.To].Contains(e.From)) adj[e.To].Add(e.From);
        }

        // Sort để consistent
        foreach (var v in V)
            adj[v] = adj[v].OrderBy(x => x).ToList();

        // ===== STATE =====
        var path = new List<string>();
        var visited = new HashSet<string>();
        var steps = new List<StepDto>();
        int buoc = 1;

        // ===== BƯỚC 1: KHỞI TẠO =====
        AddStep(steps, $"{buoc}.1",
            $"Path = [{start.ToUpper()}]",
            $"Bắt đầu chu trình Hamilton từ đỉnh {start.ToUpper()}",
            path, visited, start, 0,
            highlight: new HighlightDto { Nodes = new List<string>() });

        path.Add(start);
        visited.Add(start);

        AddStep(steps, $"{buoc}.2",
            $"Thêm {start.ToUpper()} vào Path",
            $"Đưa đỉnh {start.ToUpper()} vào chu trình ban đầu",
            path, visited, start, 1,
            highlight: new HighlightDto { Nodes = new List<string> { start } });



        // ===== GỌI BACKTRACK =====
        var foundCycles = new List<List<string>>();
        int stepCounter = 2;
        Backtrack(steps, adj, V, path, visited, start, ref stepCounter, ref buoc, foundCycles);

        // ===== KẾT QUẢ =====
        buoc++;
        if (foundCycles.Count > 0)
        {
            var cycle = foundCycles[0];
            AddStep(steps, $"{buoc}",
                $"Kết quả: Tìm thấy chu trình Hamilton",
                $"Hoàn thành! Chu trình Hamilton tìm được: {FormatPath(cycle)}",
                cycle, new HashSet<string>(cycle), start, V.Count,
                highlight: new HighlightDto
                {
                    Nodes = cycle,
                    Edges = BuildEdgesFromPath(cycle)
                },
                acceptedNodes: cycle,
                acceptedEdges: BuildEdgesFromPath(cycle));
        }
        else
        {
            AddStep(steps, $"{buoc}",
                $"Kết quả: Không tìm thấy chu trình Hamilton",
                $"Không tồn tại chu trình Hamilton từ đỉnh {start.ToUpper()}",
                path, visited, start, 0);
        }

        return steps;
    }

    private void Backtrack(
        List<StepDto> steps,
        Dictionary<string, List<string>> adj,
        List<string> V,
        List<string> path,
        HashSet<string> visited,
        string start,
        ref int stepCounter,
        ref int buoc,
        List<List<string>> foundCycles)
    {

        if (foundCycles.Count > 0)
            return;
        int n = V.Count;
        string current = path[path.Count - 1];
        int k = path.Count;

        var neighbors = adj[current];
        string neighborList = string.Join(", ", neighbors.Select(x => x.ToUpper()));

        buoc++;
        int sub = 1;

        AddStep(steps, $"{buoc}.{sub++}",
            $"Đang tại {current.ToUpper()}, xét các đỉnh kề",
            $"Hiện tại ta đang ở đỉnh {current.ToUpper()} (vị trí thứ {k} trong chu trình). " +
            $"Các đỉnh kề với {current.ToUpper()} là: {neighborList}. " +
            $"Ta sẽ lần lượt xét từng đỉnh xuất phát từ {current.ToUpper()}",
            path, visited, current, k,
            highlight: new HighlightDto
            {
                Nodes = new List<string> { current },
                Edges = neighbors.Select(nb => $"{current}-{nb}").ToList()
            });

        // ═══ DUYỆT TỪNG CẠNH KỀ ═══
        foreach (var next in neighbors)
        {
            // 🔥 Bỏ qua cạnh ngược của cạnh vừa đi
            if (path.Count >= 2)
            {
                string previous = path[path.Count - 2];

                if (next == previous)
                {
                    continue;
                }
            }
            bool isVisited = visited.Contains(next);
            bool canClose = (next == start && path.Count == n);

            // ═══ XÉT CẠNH CURRENT → NEXT ═══
            AddStep(steps, $"{buoc}.{sub++}",
                $"Xét đỉnh {next.ToUpper()}",
                $"Xem xét đỉnh {next.ToUpper()}. " +
                $"Kiểm tra: {next.ToUpper()} đã trong Path chưa?",
                path, visited, current, k,
                highlight: new HighlightDto
                {
                    Nodes = new List<string> { current, next },
                    Edges = new List<string> { $"{current}-{next}" }
                });

            if (isVisited)
            {
                // ═══ ĐỈNH ĐÃ THĂM ═══
                if (canClose)
                {
                    // ═══ HOÀN THÀNH CHU TRÌNH ═══
                    AddStep(steps, $"{buoc}.{sub++}",
                        $"Đỉnh {next.ToUpper()} = START và đã đủ {n} đỉnh",
                        $"Đỉnh {next.ToUpper()} chính là điểm bắt đầu {start.ToUpper()}! " +
                        $"Và ta đã thăm đủ {n} đỉnh. Đây là cơ hội hoàn thành chu trình Hamilton",
                        path, visited, next, k,
                        highlight: new HighlightDto
                        {
                            Nodes = new List<string> { current, next },
                            Edges = new List<string> { $"{current}-{next}" }
                        });

                    path.Add(next);

                    AddStep(steps, $"{buoc}.{sub++}",
                        $"Thêm {next.ToUpper()} vào Path để đóng chu trình",
                        $"Nối {current.ToUpper()} với {next.ToUpper()} để hoàn thành chu trình: {FormatPath(path)}. " +
                        $"Đây là một chu trình Hamilton hợp lệ!",
                        path, visited, next, n,
                        highlight: new HighlightDto
                        {
                            Nodes = path.ToList(),
                            Edges = BuildEdgesFromPath(path)
                        },
                        acceptedNodes: path.ToList(),
                        acceptedEdges: BuildEdgesFromPath(path));

                    foundCycles.Add(path.ToList());
                    return;   // 🔥 dừng ngay

                    // ═══ QUAY LUI ĐỂ TÌM CHU TRÌNH KHÁC ═══
                    path.RemoveAt(path.Count - 1);

                    AddStep(steps, $"{buoc}.{sub++}",
                        $"Loại bỏ {next.ToUpper()} để tìm chu trình khác",
                        $"Đã ghi nhận chu trình này. Giờ ta quay lui bằng cách loại {next.ToUpper()} " +
                        $"khỏi Path để tiếp tục tìm kiếm các chu trình khác (nếu có)",
                        path, visited, current, k,
                        highlight: new HighlightDto
                        {
                            Nodes = path.ToList(),
                            Edges = BuildEdgesFromPath(path)
                        });

                    continue;
                }
                else
                {
                    // ═══ BỎ QUA ĐỈNH ĐÃ THĂM ═══
                    string reason = next == start
                        ? $"hiện tại chưa đi được hết các đỉnh trong đồ thị nên không thể quay về đỉnh ban đầu là {start.ToUpper()} được"
                        : $"{next.ToUpper()} đã có trong Path, nếu thêm sẽ tạo chu trình nhỏ";

                    AddStep(steps, $"{buoc}.{sub++}",
                        $"Bỏ qua {next.ToUpper()}",
                        $"Không thể chọn {next.ToUpper()} vì {reason}. " +
                        $"Ta bỏ qua đỉnh này và tiếp tục xét các đỉnh kề còn lại",
                        path, visited, current, k,
                        highlight: new HighlightDto
                        {
                            Nodes = new List<string> { next },
                            Edges = new List<string> { $"{current}-{next}" }
                        });

                    continue;
                }
            }

            // ═══ ĐỈNH CHƯA THĂM - THỬ THÊM VÀO PATH ═══
            AddStep(steps, $"{buoc}.{sub++}",
                $"Đỉnh {next.ToUpper()} chưa thăm",
                $"Đỉnh {next.ToUpper()} chưa có trong Path. " +
                $"Ta thử mở rộng chu trình bằng cách thêm {next.ToUpper()} vào cuối Path",
                path, visited, current, k,
                highlight: new HighlightDto
                {
                    Nodes = new List<string> { current, next },
                    Edges = new List<string> { $"{current}-{next}" }
                });

            // ═══ THÊM VÀO PATH ═══
            path.Add(next);
            visited.Add(next);

            AddStep(steps, $"{buoc}.{sub++}",
                $"Thêm {next.ToUpper()} vào Path",
                $"Path bây giờ: {FormatPath(path)}. " +
                $"Tiếp tục tìm kiếm từ {next.ToUpper()} (đệ quy)",
                path, visited, next, k + 1,
                highlight: new HighlightDto
                {
                    Nodes = path.ToList(),
                    Edges = BuildEdgesFromPath(path)
                });


            // ═══ GỌI ĐỆ QUY ═══
            Backtrack(steps, adj, V, path, visited, start, ref stepCounter, ref buoc, foundCycles);
            if (foundCycles.Count > 0)
                return;

            // ═══ QUAY LUI SAU ĐỆ QUY ═══
            buoc++;
            sub = 1;

            AddStep(steps, $"{buoc}.{sub++}",
                $"Quay lui từ {next.ToUpper()}",
                $"Kết thúc tìm kiếm từ nhánh {next.ToUpper()}. " +
                $"Ta quay lui bằng cách loại bỏ {next.ToUpper()} khỏi Path",
                path, visited, next, k + 1,
                highlight: new HighlightDto
                {
                    Nodes = new List<string> { next },
                    Edges = new List<string> { $"{current}-{next}" }
                });

            path.RemoveAt(path.Count - 1);
            visited.Remove(next);

            AddStep(steps, $"{buoc}.{sub++}",
                $"Đã loại {next.ToUpper()}, Path = {FormatPath(path)}",
                $"Đã loại bỏ {next.ToUpper()} khỏi Path và Visited. " +
                $"Path hiện tại: {FormatPath(path)}. Tiếp tục thử các đỉnh kề khác của {current.ToUpper()}",
                path, visited, current, k,
                highlight: new HighlightDto
                {
                    Nodes = path.ToList(),
                    Edges = BuildEdgesFromPath(path)
                });
        }
    }

    // ===================== HELPER FUNCTIONS =====================

    private void AddStep(
        List<StepDto> steps,
        string step,
        string pseudo,
        string explain,
        List<string> path,
        HashSet<string> visited,
        string current,
        int k,
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
            AcceptedNodes = acceptedNodes ?? path.ToList(),
            AcceptedEdges = acceptedEdges ?? BuildEdgesFromPath(path),
            StateQ = $"{FormatPath(path)}",
            StateT = $"{{{string.Join(", ", visited.OrderBy(x => x).Select(x => x.ToUpper()))}}}",
            // StateH = $"Vị trí k = {k}",
            StateDist = $"{current.ToUpper()}"
        });
    }

    private string FormatPath(List<string> path)
    {
        if (path.Count == 0) return "[]";
        return "[" + string.Join(" → ", path.Select(x => x.ToUpper())) + "]";
    }

    private List<string> BuildEdgesFromPath(List<string> path)
    {
        var edges = new List<string>();
        for (int i = 0; i < path.Count - 1; i++)
        {
            edges.Add($"{path[i]}-{path[i + 1]}");
        }
        return edges;
    }
}


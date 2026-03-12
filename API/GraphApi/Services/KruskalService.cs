using GraphApi.Models;
using System;
using System.Collections.Generic;
using System.Linq;

namespace GraphApi.Services;

public class KruskalService
{
    private readonly Dictionary<Guid, GraphRequest> _graphs = new();

    public void CreateGraphWithId(Guid id, GraphRequest request) => _graphs[id] = request;

    public List<StepDto> RunKruskal(Guid id)
    {
        if (!_graphs.TryGetValue(id, out var graph))
            throw new InvalidOperationException("Graph not found");

        var steps = new List<StepDto>();
        var nodes = graph.Nodes.ToList();
        var allEdges = graph.Edges.OrderBy(e => e.Weight).ToList();

        var parent = nodes.ToDictionary(n => n, n => n);
        string Find(string i) => parent[i] == i ? i : (parent[i] = Find(parent[i]));
        void Union(string root1, string root2) => parent[root1] = root2;

        // Format lại cách hiển thị tập hợp cho StateT (giống hình 2)
        string GetCurrentSetsDisplay()
        {
            var groups = nodes.GroupBy(n => Find(n))
                              .Select(g => "{" + string.Join(",", g) + "}");
            return string.Join(", ", groups);
        }

        var mstEdges = new List<string>();
        var mstNodes = new HashSet<string>();

        // --- BƯỚC 1: KHỞI TẠO ---
        // Đây là bước tiêu đề lớn
        AddStep(steps, "BƯỚC 1: KHỞI TẠO TẬP HỢP", "init",
            "Coi mỗi đỉnh là một tập hợp riêng biệt và sắp xếp cạnh.",
            mstNodes, mstEdges, "yellow", null, GetCurrentSetsDisplay(), 0);


        AddStep(steps, "SẮP XẾP CẠNH", "sort",
            $"Sắp xếp {allEdges.Count} cạnh theo trọng số tăng dần.",
            mstNodes, mstEdges, "orange", null, GetCurrentSetsDisplay(), 0);


        // --- BƯỚC 2: DUYỆT CẠNH ---
        int edgeIdx = 1;
        double currentTotalWeight = 0;

        foreach (var edge in allEdges)
        {
            string eId = $"{edge.From}-{edge.To}";
            string root1 = Find(edge.From);
            string root2 = Find(edge.To);

            var currentHighlight = new HighlightDto
            {
                Edges = new List<string> { eId },
                Nodes = new List<string> { edge.From, edge.To },
                Color = "orange"
            };

            // 2.1. Xét cạnh (Tạo header cho mỗi vòng lặp cạnh)
            AddStep(steps, $"BƯỚC 2.{edgeIdx}: XÉT CẠNH ({edge.From}, {edge.To})", "loop",
                $"Lấy cạnh có trọng số nhỏ nhất tiếp theo: ({edge.From}, {edge.To}) = {edge.Weight}",
                mstNodes, mstEdges, "white", currentHighlight, GetCurrentSetsDisplay(), currentTotalWeight);

            if (root1 != root2)
            {
                // 2.2. Chấp nhận
                Union(root1, root2);
                mstEdges.Add(eId);
                mstNodes.Add(edge.From);
                mstNodes.Add(edge.To);
                currentTotalWeight += edge.Weight;

                AddStep(steps, $"Step 2.{edgeIdx}.1: Chấp nhận cạnh", "accept",
                    $"Vì {edge.From} và {edge.To} thuộc 2 tập khác nhau -> Không tạo chu trình. Thêm vào MST.",
                    mstNodes, mstEdges, "#4CAF50", currentHighlight, GetCurrentSetsDisplay(), currentTotalWeight);
            }
            else
            {
                // 2.3. Loại bỏ
                AddStep(steps, $"Step 2.{edgeIdx}.1: Loại bỏ (Chu trình)", "reject",
                    $"Cả {edge.From} và {edge.To} đều thuộc gốc {root1}. Bỏ qua để tránh chu trình.",
                    mstNodes, mstEdges, "#F44336", currentHighlight, GetCurrentSetsDisplay(), currentTotalWeight);
            }
            edgeIdx++;
        }

        // --- BƯỚC 3: KẾT THÚC ---
        AddStep(steps, "BƯỚC 3: KẾT THÚC", "end",
            $"Thuật toán hoàn tất. Cây khung nhỏ nhất có tổng trọng số là {currentTotalWeight}",
            mstNodes, mstEdges, "cyan", null, GetCurrentSetsDisplay(), currentTotalWeight);

        return steps;
    }

    private void AddStep(List<StepDto> steps, string step, string pseudo, string explain,
                        HashSet<string> nodes, List<string> edges, string color,
                        HighlightDto? high, string stateSets, double totalWeight)
    {
        steps.Add(new StepDto
        {
            Step = step,
            Pseudo = pseudo, // Mã này dùng để Frontend highlight dòng code tương ứng
            Explain = explain,
            Color = color,
            Highlight = high ?? new HighlightDto(),
            AcceptedNodes = nodes.ToList(),
            AcceptedEdges = edges.ToList(),
            // Map các biến vào đúng ô hiển thị như hình 2
            StateT = stateSets,
            StatePre = $"{{{string.Join(", ", edges)}}}",
            StateDist = $"{totalWeight}",
            StateH = $" {high?.Edges?.FirstOrDefault() ?? "None"}"
        });
    }
}
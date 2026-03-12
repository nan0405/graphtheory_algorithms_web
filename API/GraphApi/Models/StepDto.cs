using System.Data;

namespace GraphApi.Models;

public class StepDto
{
    public string Step { get; set; } = "";
    public string Pseudo { get; set; } = "";
    public string Explain { get; set; } = "";
    public string Color { get; set; } = "";

    public string? StateT { get; set; }
    public string? StateQ { get; set; }
    public string? StateH { get; set; }
    public string? StateDist { get; set; }
    public string? StatePre { get; set; }
    public HighlightDto Highlight { get; set; } = new HighlightDto();

    public List<string> AcceptedNodes { get; set; } = new();
    public List<string> AcceptedEdges { get; set; } = new();

    public string? VoiceUrl { get; set; }
}
public class HighlightDto
{
    public List<string>? Nodes { get; set; } = new();
    public List<string>? Edges { get; set; } = new();
    public List<string>? RemovedEdges { get; set; } = new(); 
    public string Color { get; set; } = "yellow";
}

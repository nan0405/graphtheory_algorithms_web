using System.ComponentModel.DataAnnotations;

namespace AlgoApi.Models;

public class Graph
{
    public int Id { get; set; }

    [Required]
    public string Name { get; set; } = "";

    [Required]
    public string Nodes { get; set; } = ""; // JSON

    [Required]
    public string Links { get; set; } = ""; // JSON

    public DateTime CreatedAt { get; set; } = DateTime.Now;
}

using System.ComponentModel.DataAnnotations;

namespace AlgoApi.Models;

public class Theory
{
    public int Id { get; set; }

    [Required]
    public string Title { get; set; } = "";

    [Required]
    public string Content { get; set; } = "";

    public DateTime CreatedAt { get; set; } = DateTime.Now;
}

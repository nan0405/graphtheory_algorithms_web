using System.ComponentModel.DataAnnotations;

namespace AlgoApi.Models;

public class Quiz
{
    public int Id { get; set; }

    [Required]
    public string Title { get; set; } = "";

    [Required]
    public string Question { get; set; } = "";

    public List<QuizOption> Options { get; set; } = new();
}

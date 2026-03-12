using System.ComponentModel.DataAnnotations;

namespace AlgoApi.Models;

public class QuizOption
{
    public int Id { get; set; }

    [Required]
    public string OptionText { get; set; } = "";

    public bool IsCorrect { get; set; }

    public int QuizId { get; set; }
}

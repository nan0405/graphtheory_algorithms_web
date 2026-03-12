using System.ComponentModel.DataAnnotations;

namespace AlgoApi.Models;

public class User
{
    public int Id { get; set; }

    [Required]
    public string Name { get; set; } = "";

    [Required, EmailAddress]
    public string Email { get; set; } = "";

    public string Role { get; set; } = "User";
    public string Status { get; set; } = "Active";

    public DateTime CreatedAt { get; set; } = DateTime.Now;
}

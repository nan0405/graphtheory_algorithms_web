using AlgoApi.Data;
using AlgoApi.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AlgoApi.Controllers;

[ApiController]
[Route("api/users")]
public class UsersController : ControllerBase
{
    private readonly AlgoDbContext _db;

    public UsersController(AlgoDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
        => Ok(await _db.Users.ToListAsync());

    [HttpPost]
    public async Task<IActionResult> Create(User user)
    {
        _db.Users.Add(user);
        await _db.SaveChangesAsync();
        return Ok(user);
    }
}

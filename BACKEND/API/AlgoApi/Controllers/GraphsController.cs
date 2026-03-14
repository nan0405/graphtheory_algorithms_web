using AlgoApi.Data;
using AlgoApi.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AlgoApi.Controllers;

[ApiController]
[Route("api/graphs")]
public class GraphsController : ControllerBase
{
    private readonly AlgoDbContext _db;

    public GraphsController(AlgoDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
        => Ok(await _db.Graphs.ToListAsync());

    [HttpPost]
    public async Task<IActionResult> Save(Graph graph)
    {
        // C# sẽ tự động map các trường từ JSON payload vào object Graph
        graph.CreatedAt = DateTime.Now; // Đảm bảo thời gian tạo được cập nhật

        _db.Graphs.Add(graph);
        await _db.SaveChangesAsync();

        return Ok(graph);
    }
}

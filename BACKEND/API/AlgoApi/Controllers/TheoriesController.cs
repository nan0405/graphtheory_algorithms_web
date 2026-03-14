using AlgoApi.Data;
using AlgoApi.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AlgoApi.Controllers;

[ApiController]
[Route("api/theories")]
public class TheoriesController : ControllerBase
{
    private readonly AlgoDbContext _db;

    public TheoriesController(AlgoDbContext db) { _db = db; }

    [HttpGet]
    public async Task<IActionResult> GetAll() => Ok(await _db.Theories.ToListAsync());

    [HttpPost]
    public async Task<IActionResult> Create(Theory theory)
    {
        _db.Theories.Add(theory);
        await _db.SaveChangesAsync();
        return Ok(theory);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var item = await _db.Theories.FindAsync(id);
        if (item == null) return NotFound();
        _db.Theories.Remove(item);
        await _db.SaveChangesAsync();
        return Ok();
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, Theory theory)
    {
        if (id != theory.Id) return BadRequest("ID không khớp");

        _db.Entry(theory).State = EntityState.Modified;

        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            if (!_db.Theories.Any(e => e.Id == id)) return NotFound();
            throw;
        }
        return Ok(theory);
    }
}
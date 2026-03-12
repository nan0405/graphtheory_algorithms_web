using AlgoApi.Data;
using AlgoApi.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AlgoApi.Controllers;

[ApiController]
[Route("api/quizzes")]
public class QuizzesController : ControllerBase
{
    private readonly AlgoDbContext _db;
    public QuizzesController(AlgoDbContext db) { _db = db; }

    [HttpGet]
    public async Task<IActionResult> GetAll()
        => Ok(await _db.Quizzes.Include(q => q.Options).ToListAsync());

    [HttpPost]
    public async Task<IActionResult> Create(Quiz quiz)
    {
        _db.Quizzes.Add(quiz);
        await _db.SaveChangesAsync();
        return Ok(quiz);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var quiz = await _db.Quizzes.FindAsync(id);
        if (quiz == null) return NotFound();
        _db.Quizzes.Remove(quiz);
        await _db.SaveChangesAsync();
        return Ok();
    }


    [HttpGet("random")]
    public async Task<IActionResult> GetRandomQuiz()
    {
        var quiz = await _db.Quizzes
            .Include(q => q.Options)
            .OrderBy(q => Guid.NewGuid())
            .Select(q => new
            {
                q.Id,
                q.Question,
                Options = q.Options.Select(o => new
                {
                    o.OptionText,
                    o.IsCorrect
                })
            })
            .FirstOrDefaultAsync();

        return Ok(quiz);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, Quiz quiz)
    {
        if (id != quiz.Id) return BadRequest();

        var existingQuiz = await _db.Quizzes.Include(q => q.Options).FirstOrDefaultAsync(q => q.Id == id);
        if (existingQuiz == null) return NotFound();

        // Cập nhật thông tin chính
        existingQuiz.Title = quiz.Title;
        existingQuiz.Question = quiz.Question;

        // Cập nhật Options (Xóa cũ thêm mới)
        _db.QuizOptions.RemoveRange(existingQuiz.Options);
        existingQuiz.Options = quiz.Options;

        await _db.SaveChangesAsync();
        return Ok(existingQuiz);
    }
}

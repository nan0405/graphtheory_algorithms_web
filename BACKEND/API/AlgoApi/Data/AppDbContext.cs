using AlgoApi.Models;
using Microsoft.EntityFrameworkCore;

namespace AlgoApi.Data;

public class AlgoDbContext : DbContext
{
    public AlgoDbContext(DbContextOptions<AlgoDbContext> options)
        : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Theory> Theories => Set<Theory>();
    public DbSet<Quiz> Quizzes => Set<Quiz>();
    public DbSet<QuizOption> QuizOptions => Set<QuizOption>();
    public DbSet<Graph> Graphs => Set<Graph>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Cấu hình quan hệ 1-n cho Quiz và QuizOption
        modelBuilder.Entity<Quiz>()
            .HasMany(q => q.Options)
            .WithOne()
            .HasForeignKey(o => o.QuizId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
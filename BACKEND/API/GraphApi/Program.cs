using GraphApi.Services;

var builder = WebApplication.CreateBuilder(args);

// register service
builder.Services.AddSingleton<DijkstraService>();
builder.Services.AddSingleton<PrimService>();
builder.Services.AddSingleton<HamiltonService>();
builder.Services.AddSingleton<KruskalService>();
builder.Services.AddSingleton<DfsService>();
builder.Services.AddSingleton<BfsService>();
builder.Services.AddSingleton<EulerService>();


builder.Services.AddControllers()
    .AddJsonOptions(opt =>
    {
        opt.JsonSerializerOptions.PropertyNamingPolicy = null; // giữ nguyên PascalCase
    });

var app = builder.Build();

app.UseRouting();
app.UseCors(c => c.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod());
app.MapControllers();
app.UseStaticFiles();

app.Run();

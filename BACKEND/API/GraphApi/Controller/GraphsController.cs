using GraphApi.Models;
using GraphApi.Services;
using Microsoft.AspNetCore.Mvc;

namespace GraphApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class GraphsController : ControllerBase
{
    private readonly DijkstraService _dijkstraService;
    private readonly PrimService _primService;
    private readonly HamiltonService _hamiltonService;
    private readonly KruskalService _kruskalService;
    private readonly DfsService _dfsService;
    private readonly BfsService _bfsService;
    private readonly EulerService _eulerService;

    public GraphsController(
        DijkstraService dijkstraService,
        PrimService primService,
        HamiltonService hamiltonService,
        KruskalService kruskalService,
        DfsService dfsService,
        BfsService bfsService,
        EulerService eulerService)
    {
        _dijkstraService = dijkstraService;
        _primService = primService;
        _hamiltonService = hamiltonService;
        _kruskalService = kruskalService;
        _bfsService = bfsService;
        _dfsService = dfsService;
        _eulerService = eulerService;
    }

    // =============================
    // CREATE GRAPH
    // =============================
    [HttpPost]
    public IActionResult Create([FromBody] GraphRequest request)
    {
        var id = Guid.NewGuid();

        _dijkstraService.CreateGraphWithId(id, request);
        _primService.CreateGraphWithId(id, request);
        _hamiltonService.CreateGraphWithId(id, request);
        _kruskalService.CreateGraphWithId(id, request);
        _dfsService.CreateGraphWithId(id, request);
        _bfsService.CreateGraphWithId(id, request);
        _eulerService.CreateGraphWithId(id, request);

        return Ok(new { id });
    }

    // =============================
    // KRUSKAL
    // =============================
    [HttpGet("{id}/kruskal")]
    public IActionResult TeachKruskal(Guid id)
    {
        try
        {
            var steps = _kruskalService.RunKruskal(id);
            return Ok(new { pages = Paginate(steps) });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // =============================
    // DIJKSTRA
    // =============================
    [HttpGet("{id}/teach")]
    public IActionResult TeachDijkstra(Guid id, [FromQuery] string start, [FromQuery] string? end)
    {
        try
        {
            var steps = _dijkstraService.Run(id, start, end);
            return Ok(new { pages = Paginate(steps) });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // =============================
    // EULER
    // =============================
    [HttpGet("{id}/euler")]
    public IActionResult TeachEuler(Guid id, [FromQuery] string? start)
    {
        try
        {
            var steps = _eulerService.Run(id, start);
            return Ok(new { pages = Paginate(steps) });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // =============================
    // HAMILTON
    // =============================
    [HttpGet("{id}/hamilton")]
    public IActionResult TeachHamilton(Guid id, [FromQuery] string start)
    {
        try
        {
            var steps = _hamiltonService.RunHamilton(id, start);
            return Ok(new { pages = Paginate(steps) });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // =============================
    // DFS
    // =============================
    [HttpGet("{id}/dfs")]
    public IActionResult TeachDfs(Guid id, [FromQuery] string start)
    {
        try
        {
            var steps = _dfsService.Run(id, start);
            return Ok(new { pages = Paginate(steps) });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("{id}/bfs")]
    public IActionResult TeachBfs(Guid id, [FromQuery] string start)
    {
        try
        {
            var steps = _bfsService.Run(id, start);
            return Ok(new { pages = Paginate(steps) });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // =============================
    // PRIM
    // =============================
    [HttpGet("{id}/prim")]
    public IActionResult TeachPrim(Guid id, [FromQuery] string start)
    {
        try
        {
            var steps = _primService.RunPrim(id, start);
            return Ok(new { pages = Paginate(steps) });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // =============================
    // PAGINATION (6 STEP / PAGE)
    // =============================
    private List<List<StepDto>> Paginate(List<StepDto> steps)
    {
        return steps
            .Select((s, i) => new { s, i })
            .GroupBy(x => x.i / 6)
            .Select(g => g.Select(x => x.s).ToList())
            .ToList();
    }
}
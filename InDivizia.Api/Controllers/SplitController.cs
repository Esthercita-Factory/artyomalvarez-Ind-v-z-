using Microsoft.AspNetCore.Mvc;
using InDivizia.Application.Interfaces;
using InDivizia.Domain.Entities;

namespace InDivizia.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SplitController : ControllerBase
{
    private readonly ISplitService _splitService;

    // Inyectamos al Chef (Servicio) a través del constructor
    public SplitController(ISplitService splitService)
    {
        _splitService = splitService;
    }

    // Método POST para recibir los gastos y calcular la división
    [HttpPost]
    public ActionResult<SplitResult> Calculate([FromBody] List<Expense>? expenses)
    {
        if (expenses is null)
        {
            return BadRequest(new { error = "El cuerpo de la solicitud es obligatorio." });
        }

        try
        {
            var result = _splitService.CalculateSplit(expenses);
            return Ok(result);
        }
        catch (ArgumentException exception)
        {
            return BadRequest(new { error = exception.Message });
        }
    }
}
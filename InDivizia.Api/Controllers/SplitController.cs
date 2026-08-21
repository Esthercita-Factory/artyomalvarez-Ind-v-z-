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
    public ActionResult<SplitResult> Calculate([FromBody] List<Expense> expenses)
    {
        // 1. Enviamos el pedido al Chef (Servicio de Aplicación)
        var result = _splitService.CalculateSplit(expenses);

        // 2. Retornamos la respuesta 200 OK con el plato preparado (SplitResult)
        return Ok(result);
    }
}
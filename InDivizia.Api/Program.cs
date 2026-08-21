using InDivizia.Application.Interfaces;
using InDivizia.Application.Services;

var builder = WebApplication.CreateBuilder(args);

// 1. PREPARAR MESEROS: Habilitar el uso de Controllers
builder.Services.AddControllers();

// 2. CONTRATAR AL CHEF: Inyección de Dependencias de tu servicio
builder.Services.AddScoped<ISplitService, SplitService>();

// Configurar Swagger / OpenAPI
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "InDivizia API V1");
        c.RoutePrefix = string.Empty; // Para que Swagger cargue directamente al abrir http://localhost:5059/
    });
}

app.UseHttpsRedirection();

// 3. ACTIVAR MESEROS: Mapear las rutas de los controladores
app.MapControllers();

app.Run();


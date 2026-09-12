using InDivizia.Application.Interfaces;
using InDivizia.Application.Services;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

// 1. PREPARAR MESEROS: Habilitar el uso de Controllers
builder.Services
    .AddControllers()
    .AddJsonOptions(options =>
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));

// 2. CONTRATAR AL CHEF: Inyección de Dependencias de tu servicio
builder.Services.AddScoped<ISplitService, SplitService>();

// Configurar Swagger / OpenAPI
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseDefaultFiles();
app.UseStaticFiles();

// 3. ACTIVAR MESEROS: Mapear las rutas de los controladores
app.MapControllers();

app.Run();


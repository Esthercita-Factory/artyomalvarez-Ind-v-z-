using InDivizia.Application.Interfaces;
using InDivizia.Domain.Entities;

namespace InDivizia.Application.Services;

public class SplitService : ISplitService
{
    public SplitResult CalculateSplit(List<Expense> expenses)
    {
        
        // 1. Calcular el total de todos los gastos
        decimal total = expenses.Sum(expense => expense.Amount);
        // 2. Agrupar los gastos por PaidBy para saber cuánto pagó cada persona (PersonSummary)
        var gastosAgrupados = expenses.GroupBy(expense => expense.PaidBy);
        // 3. Calcular el FairShare (lo que le toca pagar a cada uno)
        int cantidadPersonas = gastosAgrupados.Count();
        decimal fairShare = total / cantidadPersonas;
        // 4. Calcular los Balances (TotalPaid - FairShare)
        List<PersonSummary> resumenes = gastosAgrupados.Select(grupo => new PersonSummary
        {
            Name = grupo.Key,
            TotalPaid = grupo.Sum(gasto =>gasto.Amount),
            FairShare = fairShare, 
            Balance = grupo.Sum(gasto =>gasto.Amount) - fairShare
        }).ToList();
        // 5. Algoritmo Greedy para calcular las Transferencias (quién le paga a quién)
        var deudores = resumenes
            .Where(persona => persona.Balance < 0)
            .OrderBy(persona => persona.Balance)
            .ToList();
            
        var acreedores = resumenes
            .Where(persona => persona.Balance > 0)
            .OrderByDescending(persona => persona.Balance)
            .ToList();
        
        // PASO 5.4: El ciclo de transferencias
        List<Transfer> transferencias = new List<Transfer>();

// Mientras haya deudores Y acreedores en las filas...
        while (deudores.Any() && acreedores.Any()) //[cite: 9]
        {
            // 1. Tomamos a los primeros de cada fila
            var deudor = deudores.First(); //[cite: 9]
            var acreedor = acreedores.First(); //[cite: 9]

            // 2. Necesitamos el valor absoluto de la deuda para hacer matemática fácil
            decimal deudaAbsoluta = Math.Abs(deudor.Balance);

            // 👉 TU RETO 1: Calcula el monto exacto a transferir.
            // Usa Math.Min() para sacar el valor mínimo entre 'deudaAbsoluta' y 'acreedor.Balance'
            decimal monto = // Escribe tu código aquí

                // 3. Registramos la transferencia (¡Esto ya te lo regalo!)
                transferencias.Add(new Transfer
                {
                    From = deudor.Name,
                    To = acreedor.Name,
                    Amount = monto
                });

            // 👉 TU RETO 2: Actualizar los balances de ambas personas
            // Al deudor.Balance tienes que SUMARLE el 'monto' (para que se acerque a 0).
            // Al acreedor.Balance tienes que RESTARLE el 'monto' (para que baje hacia 0).
    
            // 👉 TU RETO 3: Sacar a las personas de la fila si ya quedaron a mano
            // Escribe un 'if' comprobando si deudor.Balance es igual a 0. Si es así, sácalo de la lista usando deudores.Remove(deudor);
            // Haz otro 'if' igual para el acreedor y sácalo de la lista 'acreedores' si su balance llegó a 0.
        }

// PASO FINAL: Armar el objeto de respuesta
        return new SplitResult
        {
            Total = total,
            People = resumenes, // Usamos la lista de resúmenes que hicimos en el Paso 4
            Transfers = transferencias
        };
        return new SplitResult();
        
    }
}
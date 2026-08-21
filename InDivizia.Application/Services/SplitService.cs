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
            
            
            decimal monto = Math.Min(deudaAbsoluta, acreedor.Balance);

                // 3. Registramos la transferencia (¡Esto ya te lo regalo!)
                transferencias.Add(new Transfer
                {
                    From = deudor.Name,
                    To = acreedor.Name,
                    Amount = monto
                });


            deudor.Balance += monto;
            acreedor.Balance -= monto;
    

            if (deudor.Balance == 0)
            {
                deudores.Remove(deudor);
            }
            // Haz otro 'if' igual para el acreedor y sácalo de la lista 'acreedores' si su balance llegó a 0.
            if (acreedor.Balance == 0)
            {
                acreedores.Remove(acreedor);
            }
        }

// PASO FINAL: Armar el objeto de respuesta
        return new SplitResult
        {
            Total = total,
            People = resumenes, 
            Transfers = transferencias
        };
        
    }
}
using InDivizia.Application.Interfaces;
using InDivizia.Domain.Entities;

namespace InDivizia.Application.Services;

public class SplitService : ISplitService
{
    public SplitResult CalculateSplit(List<Expense> expenses)
    {
        ArgumentNullException.ThrowIfNull(expenses);

        if (expenses.Count == 0)
        {
            throw new ArgumentException("Debe existir al menos un gasto.", nameof(expenses));
        }

        if (expenses.Any(expense => string.IsNullOrWhiteSpace(expense.PaidBy)))
        {
            throw new ArgumentException("Todos los gastos deben indicar quién pagó.", nameof(expenses));
        }

        if (expenses.Any(expense => expense.Amount < 0))
        {
            throw new ArgumentException("Los montos no pueden ser negativos.", nameof(expenses));
        }

        if (expenses.Any(expense => decimal.Round(expense.Amount, 2) != expense.Amount))
        {
            throw new ArgumentException("Los montos pueden tener como máximo dos decimales.", nameof(expenses));
        }

        decimal total = expenses.Sum(expense => expense.Amount);
        var gastosAgrupados = expenses
            .GroupBy(expense => expense.PaidBy.Trim(), StringComparer.OrdinalIgnoreCase)
            .OrderBy(grupo => grupo.Key, StringComparer.OrdinalIgnoreCase)
            .ToList();

        int cantidadPersonas = gastosAgrupados.Count;

        // Cuando el total no se puede dividir en centavos iguales, el sobrante se
        // distribuye de a un centavo para que las cuotas sumen exactamente el total.
        decimal cuotaBase = Math.Floor(total / cantidadPersonas * 100) / 100;
        int centavosRestantes = (int)decimal.Round(
            (total - cuotaBase * cantidadPersonas) * 100,
            0,
            MidpointRounding.AwayFromZero);

        List<PersonSummary> resumenes = gastosAgrupados
            .Select((grupo, indice) =>
            {
                decimal fairShare = cuotaBase + (indice < centavosRestantes ? 0.01m : 0m);
                decimal totalPaid = grupo.Sum(gasto => gasto.Amount);

                return new PersonSummary
                {
                    Name = grupo.Key,
                    TotalPaid = totalPaid,
                    FairShare = fairShare,
                    Balance = totalPaid - fairShare
                };
            })
            .ToList();

        // Se usan cuentas auxiliares para no modificar los balances que se devuelven.
        var deudores = resumenes
            .Where(persona => persona.Balance < 0)
            .OrderBy(persona => persona.Balance)
            .Select(persona => new SettlementAccount(persona.Name, Math.Abs(persona.Balance)))
            .ToList();

        var acreedores = resumenes
            .Where(persona => persona.Balance > 0)
            .OrderByDescending(persona => persona.Balance)
            .Select(persona => new SettlementAccount(persona.Name, persona.Balance))
            .ToList();

        List<Transfer> transferencias = new();
        int indiceDeudor = 0;
        int indiceAcreedor = 0;

        while (indiceDeudor < deudores.Count && indiceAcreedor < acreedores.Count)
        {
            var deudor = deudores[indiceDeudor];
            var acreedor = acreedores[indiceAcreedor];
            decimal monto = Math.Min(deudor.Remaining, acreedor.Remaining);

            transferencias.Add(new Transfer
            {
                From = deudor.Name,
                To = acreedor.Name,
                Amount = monto
            });

            deudor.Remaining -= monto;
            acreedor.Remaining -= monto;

            if (deudor.Remaining == 0)
            {
                indiceDeudor++;
            }

            if (acreedor.Remaining == 0)
            {
                indiceAcreedor++;
            }
        }

        return new SplitResult
        {
            Total = total,
            People = resumenes,
            Transfers = transferencias
        };
    }

    private sealed class SettlementAccount
    {
        public SettlementAccount(string name, decimal remaining)
        {
            Name = name;
            Remaining = remaining;
        }

        public string Name { get; }
        public decimal Remaining { get; set; }
    }
}
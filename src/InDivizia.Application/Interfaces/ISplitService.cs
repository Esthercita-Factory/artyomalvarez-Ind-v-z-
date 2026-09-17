using InDivizia.Domain.Entities;

namespace InDivizia.Application.Interfaces;

public interface ISplitService
{
    SplitResult CalculateSplit (List<Expense> expenses);
}
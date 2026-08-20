namespace InDivizia.Domain.Entities;

public class SplitResult
{
    public decimal Total { get; set; }
    public List<PersonSummary> People { get; set; } = new();
    public List<Transfer> Transfers { get; set; } = new();
}
namespace InDivizia.Domain.Entities;

public class PersonSummary
{
    public string Name { get; set; } = string.Empty;
    public decimal TotalPaid { get; set; }
    public decimal FairShare { get; set; }
    public decimal Balance { get; set; }
}
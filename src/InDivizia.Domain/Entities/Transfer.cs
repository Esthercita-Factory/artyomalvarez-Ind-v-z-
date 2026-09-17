namespace InDivizia.Domain.Entities;

public class Transfer
{
    public string From { get; set; } = string.Empty;
    public string To { get; set; } = string.Empty;
    public decimal Amount { get; set; }
}
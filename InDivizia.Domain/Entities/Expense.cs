namespace InDivizia.Domain.Entities;

public class Expense
{
    public string Description { get; set; } = string.Empty;
    public Category Category { get; set; }
    public decimal Amount { get; set; }
    public string PaidBy { get; set; } = string.Empty;
}
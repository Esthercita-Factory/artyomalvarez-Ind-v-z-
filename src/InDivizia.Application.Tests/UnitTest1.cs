using InDivizia.Application.Services;
using InDivizia.Domain.Entities;

namespace InDivizia.Application.Tests;

public class SplitServiceTests
{
    private readonly SplitService _service = new();

    [Fact]
    public void CalculateSplit_WithEmptyList_ThrowsArgumentException()
    {
        Assert.Throws<ArgumentException>(() => _service.CalculateSplit([]));
    }

    [Fact]
    public void CalculateSplit_WithNegativeAmount_ThrowsArgumentException()
    {
        List<Expense> expenses =
        [
            Expense("Ana", -1m)
        ];

        Assert.Throws<ArgumentException>(() => _service.CalculateSplit(expenses));
    }

    [Fact]
    public void CalculateSplit_WhenEveryonePaidZero_ReturnsNoTransfers()
    {
        List<Expense> expenses =
        [
            Expense("Ana", 0m),
            Expense("Beto", 0m),
            Expense("Carla", 0m)
        ];

        var result = _service.CalculateSplit(expenses);

        Assert.Equal(0m, result.Total);
        Assert.Equal(3, result.People.Count);
        Assert.All(result.People, person =>
        {
            Assert.Equal(0m, person.FairShare);
            Assert.Equal(0m, person.Balance);
        });
        Assert.Empty(result.Transfers);
    }

    [Fact]
    public void CalculateSplit_WithOnePayerAndTwoConsumers_CreatesTwoTransfers()
    {
        List<Expense> expenses =
        [
            Expense("Ana", 90m),
            Expense("Beto", 0m),
            Expense("Carla", 0m)
        ];

        var result = _service.CalculateSplit(expenses);

        Assert.Equal(30m, result.People.Single(person => person.Name == "Ana").FairShare);
        Assert.Equal(60m, result.People.Single(person => person.Name == "Ana").Balance);
        Assert.Equal(2, result.Transfers.Count);
        Assert.Equal(60m, result.Transfers.Sum(transfer => transfer.Amount));
    }

    [Fact]
    public void CalculateSplit_WithDifferentNameCasing_GroupsTheSamePerson()
    {
        List<Expense> expenses =
        [
            Expense("Lucas", 60m),
            Expense("lucas", 40m),
            Expense("Ana", 0m)
        ];

        var result = _service.CalculateSplit(expenses);

        Assert.Equal(2, result.People.Count);
        var lucas = Assert.Single(
            result.People,
            person => person.Name.Equals("Lucas", StringComparison.OrdinalIgnoreCase));
        Assert.Equal(100m, lucas.TotalPaid);
        Assert.Equal(50m, lucas.Balance);
    }

    [Fact]
    public void CalculateSplit_WhenShareHasRepeatingDecimals_ClosesEveryCent()
    {
        List<Expense> expenses =
        [
            Expense("Ana", 100m),
            Expense("Beto", 0m),
            Expense("Carla", 0m)
        ];

        var result = _service.CalculateSplit(expenses);

        Assert.Equal(100m, result.People.Sum(person => person.FairShare));
        Assert.Equal(0m, result.People.Sum(person => person.Balance));
        Assert.Equal(66.66m, result.Transfers.Sum(transfer => transfer.Amount));
        Assert.Contains(result.People, person => person.FairShare == 33.34m);
        Assert.Equal(2, result.People.Count(person => person.FairShare == 33.33m));
    }

    private static Expense Expense(string paidBy, decimal amount)
    {
        return new Expense
        {
            PaidBy = paidBy,
            Description = "Prueba",
            Category = Category.Otros,
            Amount = amount
        };
    }
}

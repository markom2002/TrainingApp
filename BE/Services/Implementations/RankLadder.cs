using BE.DTOs;
namespace BE.Services.Implementations;

public static class RankLadder
{
    public static readonly IReadOnlyList<RankTier> Tiers = Array.AsReadOnly(new[]
    {
        new RankTier("iron", 0, "Iron", "Every legend starts somewhere.", 0, "#9baec7", "#5c708c"),
        new RankTier("bronze", 1, "Bronze", "Effort becomes a habit.", 400, "#e9a875", "#a65b40"),
        new RankTier("silver", 2, "Silver", "Consistency looks good on you.", 1200, "#d6e4f7", "#879cbd"),
        new RankTier("gold", 3, "Gold", "Discipline. In its finest form.", 2500, "#f8cf75", "#b98336"),
        new RankTier("platinum", 4, "Platinum", "Built through the work.", 4500, "#a4efd7", "#4faaa9"),
        new RankTier("diamond", 5, "Diamond", "Pressure made you stronger.", 7500, "#8ce4ff", "#677deb"),
        new RankTier("elite", 6, "Elite", "A standard of your own.", 11500, "#c8a0ff", "#8956ec"),
        new RankTier("master", 7, "Master", "Your dedication is the difference.", 17000, "#ffa9cc", "#c85c9a"),
        new RankTier("legend", 8, "Legend", "You didn't find your limits. You rewrote them.", 25000, "#ffe0a0", "#d596fb")
    });

    public static RankProgress FromXp(int xp)
    {
        xp = Math.Max(0, xp);
        var current = Tiers.Last(t => xp >= t.MinXp);
        var next = Tiers.FirstOrDefault(t => t.Index > current.Index);
        var earned = xp - current.MinXp;
        var span = next == null ? 0 : next.MinXp - current.MinXp;
        return new RankProgress(current, next, earned, span, next == null ? 0 : next.MinXp - xp,
            next == null ? 100 : Math.Round(earned * 100m / span, 1));
    }
}

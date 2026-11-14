using BE.Services.Implementations;
using Xunit;
namespace BE.Tests;
public class RankTests
{
    [Theory]
    [InlineData(0,"iron",0)] [InlineData(399,"iron",399)] [InlineData(400,"bronze",0)]
    [InlineData(1199,"bronze",799)] [InlineData(1200,"silver",0)] [InlineData(2500,"gold",0)]
    [InlineData(4500,"platinum",0)] [InlineData(7500,"diamond",0)] [InlineData(11500,"elite",0)]
    [InlineData(17000,"master",0)] [InlineData(25000,"legend",0)] [InlineData(30000,"legend",5000)]
    public void RankUsesExactBoundaries(int xp,string expected,int inRank)
    {
        var result=RankLadder.FromXp(xp);Assert.Equal(expected,result.Current.Id);Assert.Equal(inRank,result.XpInRank);
        Assert.InRange(result.Percent,0m,100m);
        if(result.Next!=null){Assert.Equal(result.Next.MinXp-xp,result.XpToNext);Assert.Equal(result.Next.MinXp-result.Current.MinXp,result.RankSpan);}
        else{Assert.Equal(100m,result.Percent);Assert.Equal(0,result.XpToNext);}
    }
    [Fact] public void LadderHasStrictlyIncreasingThresholdsAndStableUniqueIds()
    {
        Assert.Equal(9,RankLadder.Tiers.Count);Assert.Equal(9,RankLadder.Tiers.Select(t=>t.Id).Distinct().Count());
        Assert.Equal(Enumerable.Range(0,9),RankLadder.Tiers.Select(t=>t.Index));
        Assert.True(RankLadder.Tiers.Zip(RankLadder.Tiers.Skip(1)).All(pair=>pair.First.MinXp<pair.Second.MinXp));
        Assert.Equal("iron",RankLadder.FromXp(-100).Current.Id);
    }
}

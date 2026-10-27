using Microsoft.EntityFrameworkCore;
using BE.Models;
using System.Collections.Generic;

namespace BE.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options)
            : base(options)
        {
        }
        public DbSet<RefreshToken> RefreshTokens { get; set; }
        public DbSet<User> Users { get; set; }
        public DbSet<Training> Trainings { get; set; }
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<User>().Property(u => u.Role).HasMaxLength(20).HasDefaultValue(Roles.User);
            modelBuilder.Entity<RefreshToken>().HasIndex(t => t.TokenHash).IsUnique();
        }
    }
}

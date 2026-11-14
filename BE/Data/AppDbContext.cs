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
        public DbSet<BodyMeasurement> BodyMeasurements { get; set; }
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<Training>().HasIndex(t => new { t.UserId, t.ClientId }).IsUnique().HasFilter("[ClientId] IS NOT NULL");
            modelBuilder.Entity<Training>().Property(t => t.TrainingVariant).HasDefaultValue("Unisex");
            modelBuilder.Entity<TrainingExercise>().Property(e => e.WeightKg).HasPrecision(6, 2);
            modelBuilder.Entity<TrainingSet>().Property(e => e.WeightKg).HasPrecision(6, 2);
            modelBuilder.Entity<TrainingExercise>().Property(e => e.WeightValue).HasPrecision(7, 2);
            modelBuilder.Entity<TrainingSet>().Property(e => e.WeightValue).HasPrecision(7, 2);
            modelBuilder.Entity<TrainingSet>().HasIndex(e => new { e.TrainingExerciseId, e.Position }).IsUnique();
            modelBuilder.Entity<BodyMeasurement>().Property(e => e.WeightKg).HasPrecision(5, 2);
            modelBuilder.Entity<BodyMeasurement>().HasIndex(e => new { e.UserId, e.MeasuredOn }).IsUnique();
            modelBuilder.Entity<User>().Property(u => u.BodyGoal).HasDefaultValue("Track");
            modelBuilder.Entity<User>().Property(u => u.StartingWeightKg).HasPrecision(5,2);
            modelBuilder.Entity<User>().Property(u => u.TargetWeightKg).HasPrecision(5,2);
            modelBuilder.Entity<TrainingExercise>().HasIndex(e => new { e.TrainingId, e.ExerciseId }).IsUnique();
            modelBuilder.Entity<User>().Property(u => u.WeeklyGoal).HasDefaultValue(3);
            modelBuilder.Entity<User>().Property(u => u.Goal).HasDefaultValue("Stay consistent");
            modelBuilder.Entity<User>().Property(u => u.Experience).HasDefaultValue("Beginner");
            modelBuilder.Entity<User>().Property(u => u.Role).HasMaxLength(20).HasDefaultValue(Roles.User);
            modelBuilder.Entity<RefreshToken>().HasIndex(t => t.TokenHash).IsUnique();
        }
    }
}

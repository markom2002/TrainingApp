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
        public DbSet<User> Users { get; set; }
        public DbSet<Training> Trainings { get; set; }
    }
}

using Microsoft.EntityFrameworkCore;

namespace Appy.Domain
{
    public class MainDbContext : DbContext
    {
        public DbSet<User> Users { get; set; }
        public DbSet<Facility> Facilities { get; set; }

        public MainDbContext(DbContextOptions<MainDbContext> options) : base(options)
        {
        }

        protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
        {
            optionsBuilder
                .UseLoggerFactory(LoggerFactory.Create(b => b.AddConsole()))
                .EnableSensitiveDataLogging()
                .UseNpgsql();
        }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
        }

        public void UpdateDatabase()
        {
            Console.WriteLine("Updating database!");
            Database.Migrate();
        }
    }
}

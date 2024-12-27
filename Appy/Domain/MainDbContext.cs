using EntityFramework.Exceptions.PostgreSQL;
using Microsoft.EntityFrameworkCore;

namespace Appy.Domain
{
    public class MainDbContext : DbContext
    {
        public virtual DbSet<User> Users { get; set; }
        public virtual DbSet<LoginSession> LoginSessions { get; set; }
        public virtual DbSet<Facility> Facilities { get; set; }
        public virtual DbSet<Service> Services { get; set; }
        public virtual DbSet<Appointment> Appointments { get; set; }
        public virtual DbSet<WorkingHour> WorkingHours { get; set; }
        public virtual DbSet<Client> Clients { get; set; }
        public virtual DbSet<DashboardSettings> DashboardSettings { get; set; }
        
        public MainDbContext()
        {
        }

        public MainDbContext(DbContextOptions<MainDbContext> options) : base(options)
        {
        }

        protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
        {
            optionsBuilder.UseLoggerFactory(LoggerFactory.Create(b => b.AddFilter((category, level) => level > LogLevel.Information)));
            optionsBuilder.UseExceptionProcessor();
            optionsBuilder.UseNpgsql();
        }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            Appointment.OnModelCreating(modelBuilder);
            Client.OnModelCreating(modelBuilder);
        }

        public void UpdateDatabase()
        {
            Console.WriteLine("Updating database!");
            Database.Migrate();
        }
    }
}

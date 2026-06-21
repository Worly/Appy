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
            // Do NOT call UseLoggerFactory here: when the context is registered via AddDbContext,
            // EF Core automatically uses the application's ILoggerFactory, so EF logs flow through
            // the configured console/JSON providers and honor the Microsoft.EntityFrameworkCore
            // log level from appsettings. Creating a per-instance LoggerFactory would leak memory
            // (a new factory per context instance) and bypass that pipeline.
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

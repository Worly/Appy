using CronScheduler.Extensions.Scheduler;

namespace Appy.Services
{
    public class HolidayImportScheduledJob : IScheduledJob
    {
        public string Name => nameof(HolidayImportScheduledJob);

        private readonly IServiceProvider serviceProvider;

        public HolidayImportScheduledJob(IServiceProvider serviceProvider)
        {
            this.serviceProvider = serviceProvider;
        }

        public async Task ExecuteAsync(CancellationToken cancellationToken)
        {
            using var scope = serviceProvider.CreateScope();
            var holidayService = scope.ServiceProvider.GetRequiredService<IHolidayService>();
            await holidayService.MaterializeForAllFacilities(DateOnly.FromDateTime(DateTime.Today));
        }
    }
}

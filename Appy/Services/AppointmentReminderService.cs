using Appy.Domain;
using CronScheduler.Extensions.Scheduler;
using Microsoft.EntityFrameworkCore;
using System.Globalization;

namespace Appy.Services
{
    public class AppointmentReminderScheduledJob : IScheduledJob
    {
        public string Name => nameof(AppointmentReminderScheduledJob);

        private IServiceProvider serviceProvider;

        public AppointmentReminderScheduledJob(IServiceProvider serviceProvider)
        {
            this.serviceProvider = serviceProvider;
        }

        public async Task ExecuteAsync(CancellationToken cancellationToken)
        {
            using var scope = serviceProvider.CreateScope();

            var appointmentReminderService = scope.ServiceProvider.GetRequiredService<IAppointmentReminderService>();

            var tomorrow = DateOnly.FromDateTime(DateTime.Today.AddDays(1));
            await appointmentReminderService.RemindFor(tomorrow, DateTime.Now);
        }
    }

    public interface IAppointmentReminderService
    {
        Task RemindFor(DateOnly date, DateTime now);
    }

    public class AppointmentReminderService : IAppointmentReminderService
    {
        //TODO: Add i18n to each client separately
        private readonly CultureInfo cultureInfo = new("hr");

        private ILogger<AppointmentReminderService> logger;
        private MainDbContext dbContext;
        private IClientNotificationsService clientNotificationsService;

        public AppointmentReminderService(
            ILogger<AppointmentReminderService> logger,
            MainDbContext mainDbContext,
            IClientNotificationsService clientNotificationsService)
        {
            this.logger = logger;
            this.dbContext = mainDbContext;
            this.clientNotificationsService = clientNotificationsService;
        }

        public async Task RemindFor(DateOnly date, DateTime now)
        {
            var facilities = await dbContext.Facilities.Include(f => f.ClientNotificationsSettings).ToListAsync();

            foreach (var facility in facilities)
            {
                var settings = facility.ClientNotificationsSettings;

                if (settings == null ||
                    string.IsNullOrEmpty(settings.AppointmentReminderMessageTemplate) ||
                    settings.AppointmentReminderTime == null)
                {
                    continue;
                }

                if (now.ToUniversalTime().TimeOfDay < settings.AppointmentReminderTime.Value.ToUniversalTime().TimeOfDay)
                {
                    continue;
                }

                await RemindForFacility(facility.Id, settings, date);
            }
        }

        private async Task RemindForFacility(int facilityId, ClientNotificationsSettings settings, DateOnly date)
        {
            var appointments = await dbContext.Appointments
                .Include(a => a.Client)
                .Include(a => a.Service)
                .Where(a => a.Date == date && a.FacilityId == facilityId)
                .ToListAsync();

            foreach (var appointment in appointments)
            {
                if (appointment.Status != AppointmentStatus.Confirmed)
                {
                    continue;
                }

                if (appointment.WasReminded)
                {
                    continue;
                }

                try
                {
                    await this.clientNotificationsService.SendAppointmentReminderMessage(appointment.Client.Id, appointment.ToViewDTO(null), cultureInfo);

                    appointment.WasReminded = true;
                }
                catch (Exception ex)
                {
                    logger.LogError("Failed to send appointment reminder for appointmentId: {appointmentId} to clientId: {clientId} because: {exceptionMessage}",
                        appointment.Id, appointment.Client.Id, ex.Message);
                }
            }

            await dbContext.SaveChangesAsync();
        }
    }
}
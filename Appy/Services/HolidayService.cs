using Appy.Domain;
using Appy.DTOs;
using Appy.Exceptions;
using Appy.Services.Holidays;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Appy.Services
{
    public interface IHolidayService
    {
        Task<HolidayImportSettings> GetSettings(int facilityId);
        Task<HolidayImportSettings> SaveSettings(int facilityId, string? countryCode, DateOnly today);
        Task Materialize(int facilityId, string countryCode, DateOnly today);
        Task MaterializeForAllFacilities(DateOnly today);
        Task<List<ProviderCountry>> GetSupportedCountries();
        Task<List<HolidayListDTO>> GetList(TimeOffScope scope, int skip, int take, DateOnly today, int facilityId);
        Task<HolidayDTO?> GetById(int importedHolidayId, int facilityId);
        Task Revert(int importedHolidayId, int facilityId);
        Task Restore(int importedHolidayId, int facilityId);
    }

    public class HolidayService : IHolidayService
    {
        private readonly MainDbContext context;
        private readonly IHolidayProvider provider;
        private readonly ILogger<HolidayService> logger;

        public HolidayService(MainDbContext context, IHolidayProvider provider, ILogger<HolidayService> logger)
        {
            this.context = context;
            this.provider = provider;
            this.logger = logger;
        }

        public async Task<HolidayImportSettings> GetSettings(int facilityId)
        {
            var settings = await context.HolidayImportSettings.FirstOrDefaultAsync(s => s.FacilityId == facilityId);
            return settings ?? new HolidayImportSettings { FacilityId = facilityId };
        }

        public async Task<HolidayImportSettings> SaveSettings(int facilityId, string? countryCode, DateOnly today)
        {
            var settings = await context.HolidayImportSettings.FirstOrDefaultAsync(s => s.FacilityId == facilityId);
            if (settings != null && settings.CountryCode == countryCode)
                return settings; // no change → nothing to do

            if (settings == null)
            {
                settings = new HolidayImportSettings { FacilityId = facilityId };
                context.HolidayImportSettings.Add(settings);
            }
            settings.CountryCode = countryCode;

            // Reset only FUTURE imported holidays (and their TimeOffs); past ones stay as history. The new
            // country has no future rows yet (changing TO a country means it wasn't the current one), so
            // staging below never re-adds anything we're deleting here.
            var futureHolidays = await context.ImportedHolidays
                .Include(h => h.LinkedTimeOff)
                .Where(h => h.FacilityId == facilityId && h.Date >= today)
                .ToListAsync();
            context.TimeOffs.RemoveRange(futureHolidays.Where(h => h.LinkedTimeOff != null).Select(h => h.LinkedTimeOff!));
            context.ImportedHolidays.RemoveRange(futureHolidays);

            // Stage the new country's window BEFORE the single SaveChanges. A provider outage throws here,
            // so nothing (not even the removals above) is persisted and the controller surfaces the error.
            if (countryCode != null)
                await StageWindow(facilityId, countryCode, today);

            await context.SaveChangesAsync();

            logger.LogInformation("Holiday import settings saved (country {CountryCode})", countryCode);
            return settings;
        }

        public async Task MaterializeForAllFacilities(DateOnly today)
        {
            var configured = await context.HolidayImportSettings
                .Where(s => s.CountryCode != null)
                .Select(s => new { s.FacilityId, s.CountryCode })
                .ToListAsync();

            foreach (var s in configured)
            {
                try
                {
                    await Materialize(s.FacilityId, s.CountryCode!, today);
                }
                catch (Exception e)
                {
                    logger.LogWarning(e, "Holiday materialization failed for facility {FacilityId}", s.FacilityId);
                }
            }
        }

        public async Task Materialize(int facilityId, string countryCode, DateOnly today)
        {
            if (await StageWindow(facilityId, countryCode, today) > 0)
                await context.SaveChangesAsync();
        }

        // Fetches the provider's window and stages an ImportedHoliday + linked one-off TimeOff for each
        // in-window date not already present for this facility+country; returns how many were staged.
        // Shared by Materialize and SaveSettings, so both fetch and dedupe identically. No SaveChanges —
        // the caller owns the unit of work. Throws HolidayProviderException (before staging anything) if
        // the provider is unreachable, so a caller that hasn't saved yet persists nothing.
        private async Task<int> StageWindow(int facilityId, string countryCode, DateOnly today)
        {
            var inWindow = await FetchWindow(countryCode, today);

            var existingDates = (await context.ImportedHolidays
                .Where(h => h.FacilityId == facilityId && h.CountryCode == countryCode)
                .Select(h => h.Date)
                .ToListAsync())
                .ToHashSet();

            var added = 0;
            foreach (var h in inWindow)
            {
                if (!existingDates.Add(h.Date)) // already present (also dedups within the provider payload)
                    continue;

                var imported = new ImportedHoliday
                {
                    FacilityId = facilityId,
                    CountryCode = countryCode,
                    Name = h.LocalName,
                    Date = h.Date,
                };
                context.ImportedHolidays.Add(imported);
                context.TimeOffs.Add(imported.ToTimeOff());
                added++;
            }
            return added;
        }

        // Fetches the provider's holidays for [today, today + 1yr]. Throws HolidayProviderException if the
        // provider is unreachable — callers decide whether to abort (SaveSettings) or skip (the daily job).
        private async Task<List<ProviderHoliday>> FetchWindow(string countryCode, DateOnly today)
        {
            var to = today.AddYears(1);
            var holidays = new List<ProviderHoliday>();
            for (var year = today.Year; year <= to.Year; year++)
                holidays.AddRange(await provider.GetPublicHolidays(year, countryCode));
            return holidays.Where(h => h.Date >= today && h.Date <= to).ToList();
        }

        public Task<List<ProviderCountry>> GetSupportedCountries() => provider.GetAvailableCountries();

        public async Task<List<HolidayListDTO>> GetList(TimeOffScope scope, int skip, int take, DateOnly today, int facilityId)
        {
            var holidays = await context.ImportedHolidays
                .Where(h => h.FacilityId == facilityId)
                .Include(h => h.LinkedTimeOff)
                .ToListAsync();

            var dtos = holidays.Select(h => h.GetListDTO());

            dtos = scope == TimeOffScope.Active
                ? dtos.Where(d => d.Date >= today).OrderBy(d => d.Date)
                : dtos.Where(d => d.Date < today).OrderByDescending(d => d.Date);

            return dtos.Skip(skip).Take(take).ToList();
        }

        // Returns the original provider snapshot. Consumed by the removed-holiday view, which needs only
        // the immutable data — an active holiday's edited state travels with its TimeOff, not here.
        public async Task<HolidayDTO?> GetById(int importedHolidayId, int facilityId)
        {
            var holiday = await context.ImportedHolidays
                .FirstOrDefaultAsync(h => h.Id == importedHolidayId && h.FacilityId == facilityId);
            return holiday?.GetDTO();
        }

        public async Task Revert(int importedHolidayId, int facilityId)
        {
            var holiday = await FindHoliday(importedHolidayId, facilityId)
                ?? throw new NotFoundException();
            var timeOff = await FindLinkedTimeOff(importedHolidayId, facilityId)
                ?? throw new NotFoundException();

            timeOff.StartDate = holiday.Date;
            timeOff.EndDate = holiday.Date;
            timeOff.IsAllDay = true;
            timeOff.TimeFrom = null;
            timeOff.TimeTo = null;
            // Notes are intentionally preserved.

            await context.SaveChangesAsync();
        }

        public async Task Restore(int importedHolidayId, int facilityId)
        {
            var holiday = await FindHoliday(importedHolidayId, facilityId)
                ?? throw new NotFoundException();
            var existing = await FindLinkedTimeOff(importedHolidayId, facilityId);
            if (existing != null)
                return;

            context.TimeOffs.Add(holiday.ToTimeOff());

            await context.SaveChangesAsync();
        }

        private Task<ImportedHoliday?> FindHoliday(int importedHolidayId, int facilityId)
            => context.ImportedHolidays.FirstOrDefaultAsync(h => h.Id == importedHolidayId && h.FacilityId == facilityId);

        private Task<TimeOff?> FindLinkedTimeOff(int importedHolidayId, int facilityId)
            => context.TimeOffs.FirstOrDefaultAsync(t => t.ImportedHolidayId == importedHolidayId && t.FacilityId == facilityId);
    }
}

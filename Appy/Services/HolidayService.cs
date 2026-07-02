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
        Task<List<HolidayDTO>> GetList(TimeOffScope scope, int skip, int take, DateOnly today, int facilityId);
        Task<HolidayDTO?> GetById(int importedHolidayId, int facilityId);
        Task Edit(int importedHolidayId, HolidayEditDTO dto, int facilityId);
        Task Remove(int importedHolidayId, int facilityId);
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

            // Pre-fetch the new country's window BEFORE any DB mutation. If the provider is down this throws
            // (HolidayProviderException) and we persist NOTHING — the controller surfaces the error.
            List<ProviderHoliday> inWindow = new();
            if (countryCode != null)
                inWindow = await FetchWindow(countryCode, today);

            if (settings == null)
            {
                settings = new HolidayImportSettings { FacilityId = facilityId };
                context.HolidayImportSettings.Add(settings);
            }
            settings.CountryCode = countryCode;

            // Remove only FUTURE imported holidays (and their TimeOffs); past ones stay as history.
            var futureHolidays = await context.ImportedHolidays
                .Where(h => h.FacilityId == facilityId && h.Date >= today)
                .ToListAsync();
            var futureIds = futureHolidays.Select(h => h.Id).ToList();
            var futureTimeOffs = await context.TimeOffs
                .Where(t => t.ImportedHolidayId != null && futureIds.Contains(t.ImportedHolidayId.Value))
                .ToListAsync();
            context.TimeOffs.RemoveRange(futureTimeOffs);
            context.ImportedHolidays.RemoveRange(futureHolidays);

            // Seed existing dates from the SURVIVING (past) rows of the new country, then add the window.
            var existingDates = (await context.ImportedHolidays
                .Where(h => h.FacilityId == facilityId && h.CountryCode == countryCode)
                .Select(h => h.Date)
                .ToListAsync())
                .Except(futureHolidays.Select(h => h.Date))
                .ToHashSet();
            if (countryCode != null)
                AddNewHolidays(facilityId, countryCode, inWindow, existingDates);

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
            var inWindow = await FetchWindow(countryCode, today);

            var existingDates = (await context.ImportedHolidays
                .Where(h => h.FacilityId == facilityId && h.CountryCode == countryCode)
                .Select(h => h.Date)
                .ToListAsync())
                .ToHashSet();

            var before = existingDates.Count;
            AddNewHolidays(facilityId, countryCode, inWindow, existingDates);
            if (existingDates.Count != before)
                await context.SaveChangesAsync();
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

        // Adds an ImportedHoliday + linked one-off TimeOff for each in-window date not already present.
        // existingDates is mutated so repeats within the payload are also skipped. No SaveChanges here.
        private void AddNewHolidays(int facilityId, string countryCode, IEnumerable<ProviderHoliday> inWindow, HashSet<DateOnly> existingDates)
        {
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
                context.TimeOffs.Add(new TimeOff
                {
                    FacilityId = facilityId,
                    Label = h.LocalName,
                    Recurrence = TimeOffRecurrence.OneOff,
                    StartDate = h.Date,
                    EndDate = h.Date,
                    IsAllDay = true,
                    ImportedHoliday = imported,
                });
            }
        }

        public Task<List<ProviderCountry>> GetSupportedCountries() => provider.GetAvailableCountries();

        public async Task<List<HolidayDTO>> GetList(TimeOffScope scope, int skip, int take, DateOnly today, int facilityId)
        {
            var holidays = await context.ImportedHolidays
                .Where(h => h.FacilityId == facilityId)
                .ToListAsync();

            var linkedTimeOffs = await context.TimeOffs
                .Where(t => t.FacilityId == facilityId && t.ImportedHolidayId != null)
                .ToListAsync();
            var timeOffByHolidayId = linkedTimeOffs.ToDictionary(t => t.ImportedHolidayId!.Value, t => t);

            var dtos = holidays.Select(h =>
            {
                timeOffByHolidayId.TryGetValue(h.Id, out var t);
                return BuildHolidayDTO(h, t);
            });

            dtos = scope == TimeOffScope.Active
                ? dtos.Where(d => d.Date >= today).OrderBy(d => d.Date)
                : dtos.Where(d => d.Date < today).OrderByDescending(d => d.Date);

            return dtos.Skip(skip).Take(take).ToList();
        }

        public async Task<HolidayDTO?> GetById(int importedHolidayId, int facilityId)
        {
            var holiday = await context.ImportedHolidays
                .FirstOrDefaultAsync(h => h.Id == importedHolidayId && h.FacilityId == facilityId);
            if (holiday == null)
                return null;

            var timeOff = await context.TimeOffs
                .FirstOrDefaultAsync(t => t.ImportedHolidayId == importedHolidayId && t.FacilityId == facilityId);

            return BuildHolidayDTO(holiday, timeOff);
        }

        private static HolidayDTO BuildHolidayDTO(ImportedHoliday h, TimeOff? t)
        {
            return new HolidayDTO
            {
                Id = h.Id,
                Name = h.Name,
                CountryCode = h.CountryCode,
                Date = t?.StartDate ?? h.Date,
                OriginalDate = h.Date,
                IsAllDay = t?.IsAllDay ?? true,
                TimeFrom = t?.TimeFrom,
                TimeTo = t?.TimeTo,
                Notes = t?.Notes,
                IsEdited = t != null && (t.StartDate != h.Date || !t.IsAllDay),
                IsRemoved = t == null,
            };
        }

        public async Task Edit(int importedHolidayId, HolidayEditDTO dto, int facilityId)
        {
            var timeOff = await FindLinkedTimeOff(importedHolidayId, facilityId)
                ?? throw new NotFoundException();

            timeOff.StartDate = dto.Date;
            timeOff.EndDate = dto.Date;
            timeOff.IsAllDay = dto.IsAllDay;
            timeOff.TimeFrom = dto.IsAllDay ? null : dto.TimeFrom;
            timeOff.TimeTo = dto.IsAllDay ? null : dto.TimeTo;
            timeOff.Notes = dto.Notes;

            await context.SaveChangesAsync();
        }

        public async Task Remove(int importedHolidayId, int facilityId)
        {
            var timeOff = await FindLinkedTimeOff(importedHolidayId, facilityId)
                ?? throw new NotFoundException();

            context.TimeOffs.Remove(timeOff);
            await context.SaveChangesAsync();
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

            context.TimeOffs.Add(new TimeOff
            {
                FacilityId = facilityId,
                Label = holiday.Name,
                Recurrence = TimeOffRecurrence.OneOff,
                StartDate = holiday.Date,
                EndDate = holiday.Date,
                IsAllDay = true,
                ImportedHolidayId = holiday.Id,
            });

            await context.SaveChangesAsync();
        }

        private Task<ImportedHoliday?> FindHoliday(int importedHolidayId, int facilityId)
            => context.ImportedHolidays.FirstOrDefaultAsync(h => h.Id == importedHolidayId && h.FacilityId == facilityId);

        private Task<TimeOff?> FindLinkedTimeOff(int importedHolidayId, int facilityId)
            => context.TimeOffs.FirstOrDefaultAsync(t => t.ImportedHolidayId == importedHolidayId && t.FacilityId == facilityId);
    }
}

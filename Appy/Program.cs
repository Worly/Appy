using Appy.Domain;
using Appy.Exceptions;
using Appy.Services;
using Appy.Services.Facilities;
using Appy.Services.Holidays;
using Appy.Services.MessagingServices;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;
var builder = WebApplication.CreateBuilder(args);

builder.Logging.ClearProviders();
if (builder.Environment.IsDevelopment())
{
    builder.Logging.AddSimpleConsole(o =>
    {
        o.IncludeScopes = true;
        o.SingleLine = true;
    });
    builder.Logging.AddDebug();
}
else
{
    builder.Logging.AddJsonConsole(o => o.IncludeScopes = true);
}

var jwtSecret = builder.Configuration["JwtSecret"];
if (string.IsNullOrEmpty(jwtSecret))
    throw new InvalidOperationException(
        "JwtSecret is not configured. Set it via User Secrets (dev) or the JwtSecret environment variable (CI/prod).");

var spaPath = "Appy-frontend/build";

// Add services to the container.
builder.Services.AddDbContext<MainDbContext>(options =>
{
    options.UseNpgsql(builder.Configuration.GetConnectionString("Main"));

    if (builder.Environment.IsDevelopment())
    {
        // Dev-only EF diagnostics. EnableSensitiveDataLogging includes SQL parameter values
        // in logs, so it must never run in production. These take effect when the
        // Microsoft.EntityFrameworkCore log level is raised to Information in appsettings.Development.json.
        options.EnableSensitiveDataLogging();
        options.EnableDetailedErrors();
    }
});
builder.Services.AddSingleton<IJwtService, JwtService>();

builder.Services.AddHttpClient<InstagramMessagingService>(client =>
{
    client.BaseAddress = new Uri("https://graph.instagram.com/v21.0");
});
builder.Services.AddHttpClient<IHolidayProvider, NagerDateHolidayProvider>(client =>
{
    client.BaseAddress = new Uri("https://date.nager.at");
});
builder.Services.AddScoped<IMessagingServiceManager, MessagingServiceManager>();

builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IFacilityService, FacilityService>();
builder.Services.AddScoped<IServiceService, ServiceService>();
builder.Services.AddScoped<IClientService, ClientService>();
builder.Services.AddScoped<IAppointmentService, AppointmentService>();
builder.Services.AddScoped<IWorkingHourService, WorkingHourService>();
builder.Services.AddScoped<ITimeOffService, TimeOffService>();
builder.Services.AddScoped<IHolidayService, HolidayService>();
builder.Services.AddScoped<IDashboardService, DashboardService>();
builder.Services.AddScoped<IClientNotificationsService, ClientNotificationsService>();
builder.Services.AddScoped<IAppointmentReminderService, AppointmentReminderService>();
builder.Services.AddScoped<ITestingService, TestingService>();

builder.Services
    .AddControllers(opts => opts.UseDateOnlyTimeOnlyStringConverters())
    .AddJsonOptions(opts =>
    {
        opts.UseDateOnlyTimeOnlyStringConverters();
        opts.JsonSerializerOptions.Converters.Add(new Appy.Utils.TrimmingStringConverter());
    });

builder.Services.AddScheduler(config =>
{
    config.AddJob<AppointmentReminderScheduledJob>(configure: c =>
    {
        // Run every 5 minutes
        c.CronSchedule = "*/5 * * * *";
        c.CronTimeZone = "utc";
        c.RunImmediately = true;
    });
    config.AddJob<HolidayImportScheduledJob>(configure: c =>
    {
        c.CronSchedule = "0 3 * * *"; // daily at 03:00 UTC
        c.CronTimeZone = "utc";
        // Also run on startup: materialization is idempotent and cheap, and this guarantees a server
        // that's never up at 03:00 UTC still fills the window.
        c.RunImmediately = true;
    });

    config.AddUnobservedTaskExceptionHandler(sp =>
    {
        var logger = sp.GetRequiredService<ILoggerFactory>().CreateLogger("CronJobs");
        return (sender, args) =>
        {
            logger?.LogError(args.Exception, "Unobserved task exception in scheduled job");
            args.SetObserved();
        };
    });
});

builder.Services.AddSpaStaticFiles(configuration =>
{
    configuration.RootPath = spaPath;
});

builder.Services.AddHealthChecks().AddCheck("self", () => HealthCheckResult.Healthy());

var app = builder.Build();

// In development the frontend is run manually by the developer (npx ng serve) and the
// backend does not serve it at all. In production the backend serves the pre-built frontend.
var serveFrontend = !app.Environment.IsDevelopment();

app.UseHttpsRedirection();

if (serveFrontend)
{
    app.UseStaticFiles();
    app.UseSpaStaticFiles();
}

app.UseRouting();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseCors(x => x
        .AllowAnyMethod()
        .AllowAnyHeader()
        .WithOrigins("http://localhost:4200"));
}

app.UseMiddleware<Appy.Middleware.RequestLoggingMiddleware>();
app.UseMiddleware<ExceptionMiddleware>();
app.UseMiddleware<Appy.Auth.JwtMiddleware>();
app.UseMiddleware<FacilityMiddleware>();

app.UseAuthorization();

app.UseEndpoints(endpoints =>
{
    endpoints.MapControllers();
    endpoints.MapHealthChecks("/health");

    if (serveFrontend)
    {
        // Explicit Fallback to index.html in SpaStaticFiles directory
        endpoints.MapFallback(async context =>
        {
            var indexFilePath = Path.Combine(app.Environment.ContentRootPath, $"{spaPath}/index.html");

            if (File.Exists(indexFilePath))
            {
                context.Response.ContentType = "text/html";
                await context.Response.SendFileAsync(indexFilePath);
            }
            else
            {
                // Log if index.html is not found
                app.Logger.LogWarning("Fallback file index.html not found at path: {indexFilePath}", indexFilePath);
                context.Response.StatusCode = 404;
            }
        });
    }
});

using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<MainDbContext>();
        context.UpdateDatabase();
    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "An error occurred while seeding the database.");
    }
}

app.Run();

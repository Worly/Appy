using Appy.Domain;
using Appy.Exceptions;
using Appy.Services;
using Appy.Services.Facilities;
using Appy.Services.MessagingServices;
using Microsoft.AspNetCore.SpaServices.AngularCli;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using WappChatAnalyzer.Services;

var builder = WebApplication.CreateBuilder(args);

var spaPath = "Appy-frontend/build";

// Add services to the container.

builder.Services.AddDbContext<MainDbContext>(options =>
{
    var connectionString = builder.Configuration.GetConnectionString("Main");
    if (builder.Environment.IsProduction() && Environment.GetEnvironmentVariable("POSTGRES_HOSTNAME") != null)
    {
        var hostname = Environment.GetEnvironmentVariable("POSTGRES_HOSTNAME");
        var port = Environment.GetEnvironmentVariable("POSTGRES_PORT");
        if (port == null)
            throw new ArgumentNullException("POSTGRES_PORT");

        var user = Environment.GetEnvironmentVariable("POSTGRES_USER");
        if (user == null)
            throw new ArgumentNullException("POSTGRES_USER");

        var password = Environment.GetEnvironmentVariable("POSTGRES_PASSWORD");
        if (password == null)
            throw new ArgumentNullException("POSTGRES_PASSWORD");

        connectionString = $"Server={hostname};Port={port};Database=Appy;Userid={user};Password={password}";
    }

    options.UseNpgsql(connectionString);
});

builder.Services.AddSingleton<IConfigurationService, ConfigurationService>();
builder.Services.AddSingleton<IJwtService, JwtService>();

builder.Services.AddSingleton<InstagramMessagingService>();
builder.Services.AddScoped<IMessagingServiceManager, MessagingServiceManager>();

builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IFacilityService, FacilityService>();
builder.Services.AddScoped<IServiceService, ServiceService>();
builder.Services.AddScoped<IClientService, ClientService>();
builder.Services.AddScoped<IAppointmentService, AppointmentService>();
builder.Services.AddScoped<IWorkingHourService, WorkingHourService>();
builder.Services.AddScoped<IDashboardService, DashboardService>();
builder.Services.AddScoped<IClientNotificationsService, ClientNotificationsService>();
builder.Services.AddScoped<IAppointmentReminderService, AppointmentReminderService>();

builder.Services
    .AddControllers(opts => opts.UseDateOnlyTimeOnlyStringConverters())
    .AddJsonOptions(opts => opts.UseDateOnlyTimeOnlyStringConverters());

builder.Services.AddScheduler(config =>
{
    config.AddJob<AppointmentReminderScheduledJob>(configure: c =>
    {
        // Run every 5 minutes
        c.CronSchedule = "*/5 * * * *";
        c.CronTimeZone = "utc";
        c.RunImmediately = true;
    }); 

    config.AddUnobservedTaskExceptionHandler(sp =>
    {
        var logger = sp.GetRequiredService<ILoggerFactory>().CreateLogger("CronJobs");
        return (sender, args) =>
        {
            logger?.LogError(args.Exception?.Message);
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

var useLocalSPA = app.Environment.IsDevelopment() && Environment.GetEnvironmentVariable("NO_FRONTEND") != "true";

app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseSpaStaticFiles();

app.UseRouting();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseCors(x => x
        .AllowAnyMethod()
        .AllowAnyHeader()
        .SetIsOriginAllowed(origin => true) // allow any origin
        .AllowCredentials()); // allow credentials
}

app.UseMiddleware<ExceptionMiddleware>();
app.UseMiddleware<Appy.Auth.JwtMiddleware>();
app.UseMiddleware<FacilityMiddleware>();

app.UseAuthorization();

app.UseEndpoints(endpoints =>
{
    endpoints.MapControllers();
    endpoints.MapHealthChecks("/health");

    if (!useLocalSPA)
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

if (useLocalSPA)
{
    app.UseSpa(spa =>
    {
        spa.Options.SourcePath = "Appy-frontend";

        spa.UseAngularCliServer(npmScript: "start");
    });
}

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

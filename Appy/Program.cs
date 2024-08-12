using Appy.Domain;
using Appy.Exceptions;
using Appy.Services;
using Appy.Services.Facilities;
using Microsoft.AspNetCore.SpaServices.AngularCli;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using WappChatAnalyzer.Services;

var builder = WebApplication.CreateBuilder(args);

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
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IFacilityService, FacilityService>();
builder.Services.AddScoped<IServiceService, ServiceService>();
builder.Services.AddScoped<IClientService, ClientService>();
builder.Services.AddScoped<IAppointmentService, AppointmentService>();
builder.Services.AddScoped<IWorkingHourService, WorkingHourService>();

builder.Services
    .AddControllers(opts => opts.UseDateOnlyTimeOnlyStringConverters())
    .AddJsonOptions(opts => opts.UseDateOnlyTimeOnlyStringConverters());

builder.Services.AddSpaStaticFiles(configuration =>
{
    configuration.RootPath = "Appy-frontend/build";
});

builder.Services.AddHealthChecks().AddCheck("self", () => HealthCheckResult.Healthy());

var app = builder.Build();

app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseSpaStaticFiles();

app.UseRouting();

app.UseMiddleware<ExceptionMiddleware>();
app.UseMiddleware<Appy.Auth.JwtMiddleware>();
app.UseMiddleware<FacilityMiddleware>();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseCors(x => x
        .AllowAnyMethod()
        .AllowAnyHeader()
        .SetIsOriginAllowed(origin => true) // allow any origin
        .AllowCredentials()); // allow credentials
}

app.UseAuthorization();

app.UseEndpoints(endpoints =>
{
    endpoints.MapControllers();
    endpoints.MapHealthChecks("/health");
});

app.UseSpa(spa =>
{
    spa.Options.SourcePath = "Appy-frontend";

    if (app.Environment.IsDevelopment() && Environment.GetEnvironmentVariable("NO_FRONTEND") != "true")
    {
        spa.UseAngularCliServer(npmScript: "start");
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

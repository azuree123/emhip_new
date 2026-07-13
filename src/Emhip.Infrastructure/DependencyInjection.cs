using Emhip.Application.Abstractions;
using Emhip.Application.Dashboards;
using Emhip.Application.FollowUps;
using Emhip.Application.Guests;
using Emhip.Application.Reports;
using Emhip.Application.UrgentCases;
using Emhip.Infrastructure.Persistence;
using Emhip.Infrastructure.Persistence.Interceptors;
using Emhip.Infrastructure.Reads;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Emhip.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("Emhip")
            ?? throw new InvalidOperationException("Missing ConnectionStrings:Emhip.");

        services.Configure<EmhipConnectionOptions>(o => o.ConnectionString = connectionString);
        services.AddSingleton<ISqlConnectionFactory, SqlConnectionFactory>();

        services.AddScoped<AuditSaveChangesInterceptor>();
        services.AddSingleton<OutboxSaveChangesInterceptor>();

        services.AddDbContext<EmhipDbContext>((sp, options) =>
        {
            options.UseSqlServer(connectionString, sql => sql.EnableRetryOnFailure(maxRetryCount: 3));
            options.AddInterceptors(
                sp.GetRequiredService<AuditSaveChangesInterceptor>(),
                sp.GetRequiredService<OutboxSaveChangesInterceptor>());
        });

        services.AddScoped<Application.Abstractions.IAppDbContext>(sp => sp.GetRequiredService<EmhipDbContext>());

        services.AddScoped<IGuestReadService, GuestReadService>();
        services.AddScoped<IFollowUpReadService, FollowUpReadService>();
        services.AddScoped<IUrgentCaseReadService, UrgentCaseReadService>();
        services.AddScoped<IDashboardReadService, DashboardReadService>();
        services.AddScoped<IReportReadService, ReportReadService>();

        services.AddSingleton<IDateTimeProvider, SystemDateTimeProvider>();

        return services;
    }
}

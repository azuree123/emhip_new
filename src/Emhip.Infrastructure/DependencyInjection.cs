using Emhip.Application.Abstractions;
using Emhip.Application.Dashboards;
using Emhip.Application.Documents;
using Emhip.Application.FollowUps;
using Emhip.Application.Guests;
using Emhip.Application.Reports;
using Emhip.Application.UrgentCases;
using Emhip.Infrastructure.Email;
using Emhip.Infrastructure.Persistence;
using Emhip.Infrastructure.Persistence.Interceptors;
using Emhip.Infrastructure.Reads;
using Emhip.Infrastructure.Settings;
using Emhip.Infrastructure.Storage;
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
        services.AddScoped<IDocumentReadService, DocumentReadService>();
        services.AddScoped<IFollowUpReadService, FollowUpReadService>();
        services.AddScoped<IUrgentCaseReadService, UrgentCaseReadService>();
        services.AddScoped<IDashboardReadService, DashboardReadService>();
        services.AddScoped<IReportReadService, ReportReadService>();

        services.AddSingleton<IDateTimeProvider, SystemDateTimeProvider>();

        // Settings + pluggable document storage. The client cache is a singleton because cloud
        // SDK clients own connection pools that shouldn't be rebuilt per request.
        services.AddMemoryCache();
        services.AddScoped<IAppSettingsService, AppSettingsService>();
        services.AddSingleton<DocumentStorageClientCache>();
        services.AddScoped<IDocumentStorageFactory, DocumentStorageFactory>();

        // Transactional email — provider (SMTP/SES/Mailgun) resolved from settings at send time.
        services.AddHttpClient("mailgun");
        services.AddScoped<IEmailProviderFactory, EmailProviderFactory>();
        services.AddScoped<IEmailService, EmailService>();

        return services;
    }
}

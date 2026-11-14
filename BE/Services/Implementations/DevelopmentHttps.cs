using System.Security.Cryptography.X509Certificates;

namespace BE.Services.Implementations;

public static class DevelopmentHttps
{
    public static void Configure(WebApplicationBuilder builder)
    {
        var phonePath = builder.Configuration["Kestrel:Certificates:Default:Path"];
        if (!builder.Environment.IsDevelopment() || string.IsNullOrWhiteSpace(phonePath)) return;

        // Phone setup supplies a private-LAN certificate. Keep the existing ASP.NET
        // development certificate for localhost instead of changing Windows trust.
        using var store = new X509Store(StoreName.My, StoreLocation.CurrentUser);
        store.Open(OpenFlags.ReadOnly);
        var localhost = store.Certificates.Cast<X509Certificate2>()
            .Where(c => c.HasPrivateKey && c.NotAfter > DateTime.Now && c.NotBefore <= DateTime.Now
                && c.Subject == "CN=localhost"
                && c.Extensions.Cast<X509Extension>().Any(e => e.Oid?.Value == "1.3.6.1.4.1.311.84.1.1"))
            .OrderByDescending(c => c.NotAfter).FirstOrDefault();
        if (localhost == null) return;

        var phone = new X509Certificate2(phonePath,
            builder.Configuration["Kestrel:Certificates:Default:Password"]);
        builder.WebHost.ConfigureKestrel(kestrel => kestrel.ConfigureHttpsDefaults(https =>
            https.ServerCertificateSelector = (_, hostname) =>
                string.Equals(hostname, "localhost", StringComparison.OrdinalIgnoreCase) ? localhost : phone));
    }
}

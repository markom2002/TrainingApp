using System.Net;
namespace BE.Services.Implementations;

public static class LocalPreview
{
    public static bool Enabled(IConfiguration configuration, IHostEnvironment? environment) =>
        environment?.IsDevelopment() == true && configuration.GetValue<bool>("LocalPreview:AllowHttp");

    public static bool SecureCookie(IConfiguration configuration, IHostEnvironment? environment, HttpContext context) =>
        !Enabled(configuration, environment) || context.Request.IsHttps || !PrivateAddress(context.Connection.RemoteIpAddress);

    private static bool PrivateAddress(IPAddress? address)
    {
        if (address == null) return false;
        if (IPAddress.IsLoopback(address)) return true;
        if (address.IsIPv4MappedToIPv6) address = address.MapToIPv4();
        var bytes = address.GetAddressBytes();
        return bytes.Length == 4 && (bytes[0] == 10 || bytes[0] == 192 && bytes[1] == 168 || bytes[0] == 172 && bytes[1] >= 16 && bytes[1] <= 31);
    }
}

using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Emhip.Domain.Authorization;
using Emhip.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.IdentityModel.Tokens;

namespace Emhip.Api.Auth;

public sealed class JwtOptions
{
    public const string SectionName = "Jwt";
    public string Key { get; set; } = default!;
    public string Issuer { get; set; } = default!;
    public string Audience { get; set; } = default!;
    public int ExpiryMinutes { get; set; } = 60 * 8;
}

/// <summary>
/// Issues the JWT a signed-in user carries on every request. Flattens the user's roles'
/// permission claims (see Emhip.Domain.Authorization.Permissions) directly onto the token at
/// login time — there's no per-request DB lookup for authorization, everything the
/// [Authorize(Policy = ...)] checks need is already in the validated token.
/// </summary>
public sealed class TokenService(UserManager<ApplicationUser> userManager, RoleManager<ApplicationRole> roleManager, JwtOptions jwtOptions)
{
    public async Task<(string Token, DateTimeOffset ExpiresAt)> GenerateTokenAsync(ApplicationUser user)
    {
        var roles = await userManager.GetRolesAsync(user);

        var permissionClaims = new HashSet<string>();
        foreach (var roleName in roles)
        {
            var role = await roleManager.FindByNameAsync(roleName);
            if (role is null) continue;

            foreach (var claim in await roleManager.GetClaimsAsync(role))
            {
                if (claim.Type == Permissions.ClaimType) permissionClaims.Add(claim.Value);
            }
        }

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Email, user.Email ?? string.Empty),
            new(JwtClaimTypes.DisplayName, user.DisplayName),
            new(JwtClaimTypes.HubId, user.HubId.ToString()),
        };
        claims.AddRange(roles.Select(r => new Claim(ClaimTypes.Role, r)));
        claims.AddRange(permissionClaims.Select(p => new Claim(Permissions.ClaimType, p)));

        var expiresAt = DateTimeOffset.UtcNow.AddMinutes(jwtOptions.ExpiryMinutes);
        var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.Key));
        var credentials = new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: jwtOptions.Issuer,
            audience: jwtOptions.Audience,
            claims: claims,
            expires: expiresAt.UtcDateTime,
            signingCredentials: credentials);

        return (new JwtSecurityTokenHandler().WriteToken(token), expiresAt);
    }
}

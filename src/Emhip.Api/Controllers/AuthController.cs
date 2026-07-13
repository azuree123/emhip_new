using System.Web;
using Emhip.Api.Auth;
using Emhip.Application.Abstractions;
using Emhip.Infrastructure.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace Emhip.Api.Controllers;

/// <summary>Login, password reset, and "who am I" — see ARCHITECTURE.md's original auth note, now implemented with ASP.NET Core Identity + JWT instead of the earlier dev-auth headers.</summary>
[ApiController]
[Route("auth")]
public sealed class AuthController(
    UserManager<ApplicationUser> userManager,
    TokenService tokenService,
    IEmailSender emailSender,
    ICurrentUser currentUser,
    IConfiguration configuration) : ControllerBase
{
    public sealed record LoginRequest(string Email, string Password);
    public sealed record LoginResponse(string Token, DateTimeOffset ExpiresAt, Guid StaffId, string DisplayName, Guid HubId, string[] Roles, string[] Permissions);

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] LoginRequest request, CancellationToken cancellationToken)
    {
        var user = await userManager.FindByEmailAsync(request.Email);
        if (user is null || !user.IsActive || !await userManager.CheckPasswordAsync(user, request.Password))
        {
            return Unauthorized(new { message = "Invalid email or password." });
        }

        var (token, expiresAt) = await tokenService.GenerateTokenAsync(user);
        var roles = await userManager.GetRolesAsync(user);

        return Ok(new LoginResponse(token, expiresAt, user.Id, user.DisplayName, user.HubId, [.. roles], GetPermissionsFromToken(token)));
    }

    public sealed record ForgotPasswordRequest(string Email);

    /// <summary>Always returns 204 regardless of whether the email exists, so callers can't enumerate registered accounts.</summary>
    [HttpPost("forgot-password")]
    [AllowAnonymous]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request, CancellationToken cancellationToken)
    {
        var user = await userManager.FindByEmailAsync(request.Email);
        if (user is not null && user.IsActive)
        {
            var token = await userManager.GeneratePasswordResetTokenAsync(user);
            var encodedToken = HttpUtility.UrlEncode(token);
            var resetUrl = $"{configuration["Frontend:BaseUrl"] ?? "http://localhost:4200"}/reset-password?email={HttpUtility.UrlEncode(user.Email)}&token={encodedToken}";

            await emailSender.SendAsync(
                user.Email!,
                "Reset your EMHIP password",
                $"Reset your password using this link: {resetUrl}\n\nThis link expires shortly and can only be used once.",
                cancellationToken);
        }

        return NoContent();
    }

    public sealed record ResetPasswordRequest(string Email, string Token, string NewPassword);

    [HttpPost("reset-password")]
    [AllowAnonymous]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
    {
        var user = await userManager.FindByEmailAsync(request.Email);
        if (user is null)
        {
            return BadRequest(new { message = "Invalid request." });
        }

        var result = await userManager.ResetPasswordAsync(user, request.Token, request.NewPassword);
        if (!result.Succeeded)
        {
            return BadRequest(new { message = "Invalid or expired reset token.", errors = result.Errors.Select(e => e.Description) });
        }

        return NoContent();
    }

    public sealed record ChangePasswordRequest(string CurrentPassword, string NewPassword);

    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        var user = await userManager.FindByIdAsync(currentUser.StaffId.ToString());
        if (user is null) return Unauthorized();

        var result = await userManager.ChangePasswordAsync(user, request.CurrentPassword, request.NewPassword);
        if (!result.Succeeded)
        {
            return BadRequest(new { message = "Could not change password.", errors = result.Errors.Select(e => e.Description) });
        }

        return NoContent();
    }

    public sealed record MeResponse(Guid StaffId, string DisplayName, Guid HubId, string[] Roles, string[] Permissions);

    [HttpGet("me")]
    public IActionResult Me() =>
        Ok(new MeResponse(currentUser.StaffId, currentUser.DisplayName, currentUser.HubId, [.. currentUser.Roles], [.. currentUser.Permissions]));

    private static string[] GetPermissionsFromToken(string jwt)
    {
        var handler = new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler();
        var token = handler.ReadJwtToken(jwt);
        return [.. token.Claims.Where(c => c.Type == Domain.Authorization.Permissions.ClaimType).Select(c => c.Value)];
    }
}

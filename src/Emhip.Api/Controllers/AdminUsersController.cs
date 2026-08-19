using Emhip.Domain.Authorization;
using Emhip.Infrastructure.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Emhip.Api.Controllers;

/// <summary>
/// Staff/user management — the real "Hub Workers" screen. There's no self-registration by
/// design (clinical-data access is admin-provisioned); admins create accounts here with a
/// temporary password the user should change on first login.
/// </summary>
[ApiController]
[Route("admin/users")]
[Authorize(Policy = Permissions.Admin.ManageUsers)]
public sealed class AdminUsersController(
    UserManager<ApplicationUser> userManager,
    Emhip.Application.Abstractions.IEmailService emailService,
    IConfiguration configuration) : ControllerBase
{
    public sealed record UserSummaryDto(Guid Id, string Email, string DisplayName, Guid HubId, bool IsActive, string[] Roles);

    [HttpGet]
    public async Task<IActionResult> GetUsers(CancellationToken cancellationToken)
    {
        var users = await userManager.Users.OrderBy(u => u.DisplayName).ToListAsync(cancellationToken);
        var results = new List<UserSummaryDto>();

        foreach (var user in users)
        {
            var roles = await userManager.GetRolesAsync(user);
            results.Add(new UserSummaryDto(user.Id, user.Email!, user.DisplayName, user.HubId, user.IsActive, [.. roles]));
        }

        return Ok(results);
    }

    public sealed record CreateUserRequest(string Email, string DisplayName, Guid HubId, string TemporaryPassword, string[] Roles);
    public sealed record CreateUserResponse(Guid Id);

    [HttpPost]
    public async Task<IActionResult> CreateUser([FromBody] CreateUserRequest request)
    {
        var user = new ApplicationUser
        {
            Id = Guid.NewGuid(),
            UserName = request.Email,
            Email = request.Email,
            EmailConfirmed = true,
            DisplayName = request.DisplayName,
            HubId = request.HubId,
            IsActive = true,
        };

        var result = await userManager.CreateAsync(user, request.TemporaryPassword);
        if (!result.Succeeded)
        {
            return BadRequest(new { message = "Could not create user.", errors = result.Errors.Select(e => e.Description) });
        }

        if (request.Roles.Length > 0)
        {
            await userManager.AddToRolesAsync(user, request.Roles);
        }

        // Best-effort welcome email — a delivery failure must not undo the created account.
        await emailService.SendTemplateAsync(
            Emhip.Application.Emails.EmailTemplateCatalog.Keys.AccountCreated,
            user.Email!,
            new Dictionary<string, string?>
            {
                ["recipientName"] = user.DisplayName,
                ["email"] = user.Email,
                ["temporaryPassword"] = request.TemporaryPassword,
                ["portalUrl"] = configuration["Frontend:BaseUrl"] ?? string.Empty,
            },
            user.DisplayName);

        return CreatedAtAction(nameof(GetUsers), new { }, new CreateUserResponse(user.Id));
    }

    public sealed record UpdateUserRequest(string DisplayName, Guid HubId, bool IsActive, string[] Roles);

    [HttpPut("{userId:guid}")]
    public async Task<IActionResult> UpdateUser(Guid userId, [FromBody] UpdateUserRequest request)
    {
        var user = await userManager.FindByIdAsync(userId.ToString());
        if (user is null) return NotFound();

        user.DisplayName = request.DisplayName;
        user.HubId = request.HubId;
        user.IsActive = request.IsActive;
        await userManager.UpdateAsync(user);

        var currentRoles = await userManager.GetRolesAsync(user);
        var rolesToRemove = currentRoles.Except(request.Roles).ToArray();
        var rolesToAdd = request.Roles.Except(currentRoles).ToArray();

        if (rolesToRemove.Length > 0) await userManager.RemoveFromRolesAsync(user, rolesToRemove);
        if (rolesToAdd.Length > 0) await userManager.AddToRolesAsync(user, rolesToAdd);

        return NoContent();
    }

    /// <summary>Soft-deactivate only — never hard-delete a staff account, since their id is referenced all over the audit trail (Contact.CreatedByStaffId, AuditEvent.ActorStaffId, etc.).</summary>
    [HttpDelete("{userId:guid}")]
    public async Task<IActionResult> DeactivateUser(Guid userId)
    {
        var user = await userManager.FindByIdAsync(userId.ToString());
        if (user is null) return NotFound();

        user.IsActive = false;
        await userManager.UpdateAsync(user);
        return NoContent();
    }

    public sealed record ResetPasswordRequest(string NewPassword);

    /// <summary>Admin-triggered password reset (as opposed to the self-service /auth/forgot-password email flow) — for handing a user their very first password, or recovering a locked-out account.</summary>
    [HttpPost("{userId:guid}/reset-password")]
    public async Task<IActionResult> ResetPassword(Guid userId, [FromBody] ResetPasswordRequest request)
    {
        var user = await userManager.FindByIdAsync(userId.ToString());
        if (user is null) return NotFound();

        var token = await userManager.GeneratePasswordResetTokenAsync(user);
        var result = await userManager.ResetPasswordAsync(user, token, request.NewPassword);
        if (!result.Succeeded)
        {
            return BadRequest(new { message = "Could not reset password.", errors = result.Errors.Select(e => e.Description) });
        }

        return NoContent();
    }
}

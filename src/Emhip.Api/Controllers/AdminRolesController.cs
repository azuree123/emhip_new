using System.Security.Claims;
using Emhip.Api.Auth;
using Emhip.Domain.Authorization;
using Emhip.Infrastructure.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace Emhip.Api.Controllers;

/// <summary>Role + permission management. Permissions themselves are a fixed catalog (Emhip.Domain.Authorization.Permissions); roles are editable sets of them.</summary>
[ApiController]
[Route("admin/roles")]
[Authorize(Policy = Permissions.Admin.ManageRoles)]
public sealed class AdminRolesController(RoleManager<ApplicationRole> roleManager) : ControllerBase
{
    public sealed record RoleSummaryDto(Guid Id, string Name, string? Description, string[] Permissions);

    [HttpGet]
    public async Task<IActionResult> GetRoles()
    {
        var results = new List<RoleSummaryDto>();
        foreach (var role in roleManager.Roles.ToList())
        {
            var permissions = (await roleManager.GetClaimsAsync(role))
                .Where(c => c.Type == Domain.Authorization.Permissions.ClaimType)
                .Select(c => c.Value)
                .ToArray();
            results.Add(new RoleSummaryDto(role.Id, role.Name!, role.Description, permissions));
        }

        return Ok(results.OrderBy(r => r.Name));
    }

    /// <summary>Grouped permission catalog for the role-editor UI's checkbox list.</summary>
    [HttpGet("permissions")]
    public IActionResult GetPermissionCatalog() =>
        Ok(Domain.Authorization.Permissions.Groups.Select(g => new { Group = g.Key, Permissions = g.Value }));

    public sealed record CreateRoleRequest(string Name, string? Description, string[] Permissions);
    public sealed record CreateRoleResponse(Guid Id);

    [HttpPost]
    public async Task<IActionResult> CreateRole([FromBody] CreateRoleRequest request)
    {
        if (await roleManager.RoleExistsAsync(request.Name))
        {
            return BadRequest(new { message = $"Role '{request.Name}' already exists." });
        }

        var role = new ApplicationRole(request.Name) { Description = request.Description };
        var result = await roleManager.CreateAsync(role);
        if (!result.Succeeded)
        {
            return BadRequest(new { message = "Could not create role.", errors = result.Errors.Select(e => e.Description) });
        }

        foreach (var permission in request.Permissions.Where(Domain.Authorization.Permissions.All.Contains))
        {
            await roleManager.AddClaimAsync(role, new Claim(Domain.Authorization.Permissions.ClaimType, permission));
        }

        return CreatedAtAction(nameof(GetRoles), new { }, new CreateRoleResponse(role.Id));
    }

    public sealed record UpdateRoleRequest(string? Description, string[] Permissions);

    [HttpPut("{roleId:guid}")]
    public async Task<IActionResult> UpdateRole(Guid roleId, [FromBody] UpdateRoleRequest request)
    {
        var role = await roleManager.FindByIdAsync(roleId.ToString());
        if (role is null) return NotFound();

        role.Description = request.Description;
        await roleManager.UpdateAsync(role);

        var existingClaims = (await roleManager.GetClaimsAsync(role)).Where(c => c.Type == Domain.Authorization.Permissions.ClaimType).ToList();
        var existingPermissions = existingClaims.Select(c => c.Value).ToHashSet();
        var requestedPermissions = request.Permissions.Where(Domain.Authorization.Permissions.All.Contains).ToHashSet();

        foreach (var claim in existingClaims.Where(c => !requestedPermissions.Contains(c.Value)))
        {
            await roleManager.RemoveClaimAsync(role, claim);
        }

        foreach (var permission in requestedPermissions.Where(p => !existingPermissions.Contains(p)))
        {
            await roleManager.AddClaimAsync(role, new Claim(Domain.Authorization.Permissions.ClaimType, permission));
        }

        return NoContent();
    }

    [HttpDelete("{roleId:guid}")]
    public async Task<IActionResult> DeleteRole(Guid roleId)
    {
        var role = await roleManager.FindByIdAsync(roleId.ToString());
        if (role is null) return NotFound();

        if (role.Name is IdentitySeeder.CmhwRole or IdentitySeeder.HubManagerRole or IdentitySeeder.AdminRole)
        {
            return BadRequest(new { message = "Built-in roles cannot be deleted." });
        }

        await roleManager.DeleteAsync(role);
        return NoContent();
    }
}

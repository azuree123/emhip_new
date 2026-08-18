using Emhip.Domain.Entities;
using Emhip.Domain.Enums;
using Xunit;

namespace Emhip.UnitTests.Domain;

public class DocumentTests
{
    private static Document NewDocument() =>
        new(hubId: Guid.NewGuid(), title: "Consent form", category: "consent-form", createdByStaffId: Guid.NewGuid());

    [Fact]
    public void Check_out_blocks_a_second_user_but_is_idempotent_for_the_holder()
    {
        var document = NewDocument();
        var holder = Guid.NewGuid();
        var other = Guid.NewGuid();

        document.CheckOut(holder);
        document.CheckOut(holder); // same user re-checking out is a no-op, not an error

        Assert.False(document.CanEdit(other));
        Assert.Throws<InvalidOperationException>(() => document.CheckOut(other));
    }

    [Fact]
    public void Check_in_requires_the_holder_unless_forced()
    {
        var document = NewDocument();
        var holder = Guid.NewGuid();
        var manager = Guid.NewGuid();

        document.CheckOut(holder);

        Assert.Throws<InvalidOperationException>(() => document.CheckIn(manager));

        document.CheckIn(manager, force: true);
        Assert.True(document.CanEdit(manager));
    }

    [Fact]
    public void Soft_delete_records_who_and_why_and_restore_clears_it()
    {
        var document = NewDocument();
        var staffId = Guid.NewGuid();

        document.SoftDelete(staffId, "Uploaded to the wrong guest");

        Assert.True(document.IsDeleted);
        Assert.Equal(staffId, document.DeletedByStaffId);
        Assert.Equal("Uploaded to the wrong guest", document.DeleteReason);

        document.Restore();

        Assert.False(document.IsDeleted);
        Assert.Null(document.DeletedAt);
        Assert.Null(document.DeleteReason);
    }

    [Fact]
    public void Retention_blocks_purge_until_the_retain_until_date_has_passed()
    {
        var today = new DateOnly(2026, 8, 19);
        var retained = new Document(Guid.NewGuid(), "Care plan", "care-plan", Guid.NewGuid(), retainUntil: today.AddDays(1));
        var expired = new Document(Guid.NewGuid(), "Care plan", "care-plan", Guid.NewGuid(), retainUntil: today.AddDays(-1));
        var unretained = NewDocument();

        Assert.True(retained.IsRetained(today));
        Assert.False(expired.IsRetained(today));
        Assert.False(unretained.IsRetained(today));
    }

    [Fact]
    public void Registering_a_version_moves_the_current_pointer()
    {
        var document = NewDocument();
        Assert.Equal(0, document.CurrentVersionNumber);

        document.RegisterVersion(1);
        document.RegisterVersion(2);

        Assert.Equal(2, document.CurrentVersionNumber);
    }

    [Fact]
    public void Metadata_update_applies_status_and_retention()
    {
        var document = NewDocument();
        var retainUntil = new DateOnly(2030, 1, 1);

        document.UpdateMetadata("Signed consent", "Scanned copy", "consent-form", "consent,signed", DocumentStatus.Archived, retainUntil);

        Assert.Equal("Signed consent", document.Title);
        Assert.Equal(DocumentStatus.Archived, document.Status);
        Assert.Equal(retainUntil, document.RetainUntil);
        Assert.Equal("consent,signed", document.Tags);
    }
}

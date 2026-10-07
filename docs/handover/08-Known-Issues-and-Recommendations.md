# EMHIP Known Issues and Recommendations

_Version 1.0 · 30 September 2026 · For: the customer project team and developers_

This document lists what is known not to work as users might expect at handover, and what we recommend doing about each item. Nothing here stops day-to-day use of EMHIP with one hub. Items are grouped by when we suggest dealing with them. Every item was checked against the code on 30 September 2026, while the user, administrator and technical documents were being written.

## 1. Recommended before full go-live

These are mainly security and operational items. Most are small changes.

| # | Issue | Effect | Recommendation |
| --- | --- | --- | --- |
| 1.1 | There is no separate test environment; acceptance testing happens on the live system | Test records sit alongside real ones, and a tester's mistake reaches the live service | Set up a staging copy (same Docker Compose stack, its own database and address) and point testers at it |
| 1.2 | The latest changes have not been run against a real SQL Server database before production | The new dashboard drill-throughs, guest search, DIALOG demographic filter and export sheets could fail on real data | After deploying, run the deployment checks in document 06, section 4, and the Hub Manager part of the Tester Guide checklist |
| 1.3 | The guest record tabs look a guest up by id without checking the user's hub | Harmless with one hub; with more than one, a user who had another hub's guest id could open that record | Add a hub check to every single-guest query before a second hub is created |
| 1.4 | The internal notification address (`/api/internal/…`) can be reached from the internet, protected only by a shared secret | Low risk while the secret is strong and private | Block `/api/internal/` in the website's nginx configuration; the background service calls the API directly |
| 1.5 | The sign-in rate limit counts every request as coming from the same address, because the proxies' forwarded address is not read | At busy times, such as a training session, staff can be told "Too many sign-in attempts" after 10 sign-ins in a minute across the whole organisation | Read the forwarded address from the proxies, or limit by email address instead |
| 1.6 | Deactivating a user, or changing their role, takes effect only at their next sign-in | A deactivated user can keep working for up to 8 hours | Shorten the session length, or check the account on each request |
| 1.7 | The keys that protect password-reset links are not kept when the system is updated | A reset link sent before a deployment stops working after it | Store the keys on a persistent volume |
| 1.8 | There is no change-password screen, and the account-created email contains the temporary password in plain text | Staff cannot change the password an Admin gave them, except through **Forgot password?** | Add a change-password page and require a change at first sign-in; until then, hand passwords over in person and switch off the Account created email if your policy requires |
| 1.9 | No multi-factor sign-in | A stolen password is enough to reach clinical records; NHS DSPT strongly recommends MFA for clinical systems | Add one-time codes, at least for Admin and Hub Manager accounts |
| 1.10 | Data is not encrypted at rest by the application, and provider passwords and keys in Settings are stored unencrypted in the database | Relies on server and disk security | Enable SQL Server Transparent Data Encryption, encrypt backups, and encrypt stored secrets (see document 09) |

## 2. Recommended for the next release

These affect everyday work or administration.

| # | Issue | Effect on users | Recommendation |
| --- | --- | --- | --- |
| 2.1 | **Save Draft** on Register New Guest does not store anything; it only shows a "Draft saved" time | Leaving the page loses everything entered | Save drafts on the server, or remove the button. Do not keep drafts in the browser, as they hold personal data |
| 2.2 | Recording a contact does not complete the guest's scheduled contact | The scheduled contact stays overdue until someone ticks it in Scheduled contacts or on the dashboard | Complete the matching scheduled contact when a contact is recorded, or ask in the form |
| 2.3 | The Scheduled contacts screen has no menu item; CMHWs and CPNs have no link to it at all | Staff cannot see the full list of their scheduled contacts | Add it to the menu under CASE MANAGEMENT |
| 2.4 | A guest's name, date of birth, phone, email, address and referral cannot be edited after registration, and gender is not shown on the record | Mistakes made at registration cannot be corrected | Add an edit form for personal details (with the change written to the Access Log) |
| 2.5 | **Pin to Overview** notes do not appear on the Overview tab; they only show in the urgent case panel's Crisis Actions Taken | Staff pin notes and cannot find them | Show pinned notes on the Overview tab |
| 2.6 | The Urgent Cases list and details panel always use a 72-hour window, but the episode record, its timeline and the urgent-case email use **Urgent response window** from Settings | If the setting is changed, screens disagree about deadlines | Read the setting everywhere, or remove it |
| 2.7 | **Escalate to CMHT** uses a fixed list of reasons and urgency levels, and the CMHT team is free text, although Settings has option lists for all three | Changes to those option lists have no effect | Load the dialog's options from the option lists |
| 2.8 | **Confirm assign CPN** on the MDT Queue lists every member of staff, not only CPNs | A Hub Manager could assign someone who is not a CPN | Filter the picker to staff with the CPN role |
| 2.9 | Choosing **High risk** in the Add Contact form does not raise the urgent flag; only a risk assessment, or immediate risk at intake, does | Staff may expect a high-risk contact to appear on Urgent Cases | Confirm the intended clinical process; if high risk should escalate, raise the flag when such a contact is submitted |
| 2.10 | The MDT Queue menu count updates only when the page is reloaded | The count stays high after items are handled | Refresh it after each MDT action |
| 2.11 | Some buttons show for every role and are refused only by the server (for example **Actions & Reminders** and **Register New Guest**; **Raise Urgent Flag** is now hidden without the permission) | Only matters for custom roles; the built-in roles have the permissions | Hide these buttons when the permission is missing |
| 2.12 | The guest list, Contact History and Urgent Cases CSV exports are open to anyone who can view guests, and the guest list's "Guest ID" column holds an internal id rather than the G-number | Bulk personal data can be downloaded by every role | Put these exports behind an export permission and use the G-number |
| 2.13 | Data import (Settings → Data migration) problems: the dry run skips the DIALOG score checks and counts updates as new guests; re-running an import adds notes and DIALOG scores again and clears demographics left blank; dates in some columns are read month-first; an unknown referral type is ignored without a warning; an anonymised guest is re-created if imported again | A second import can duplicate or wipe data | Fix before any large import; until then import each file once, check dates are unambiguous (YYYY-MM-DD) and keep a backup first |
| 2.14 | Settings with no effect: **Date format**, **Default contact interval**, **DIALOG review interval** and **Guest list page size**. Ten option lists (for example housing, employment, language, CMHT team) are not used by any screen. Leaving **Allowed file types** blank restores the default list rather than allowing any type, and a **Maximum file size** of 0 refuses every upload | Admins change settings that do nothing | Wire them up or remove them; document 04 lists each one |
| 2.15 | Data Quality's "No contact in the last 90 days" always uses 90 days, even if the inactivity threshold is changed | The two figures can drift apart | Use the inactivity threshold for this check too |
| 2.16 | Changes to a person's roles or permissions reach their screens only after they sign out and back in | An Admin's change seems not to work until then | Tell Admins; see also 1.6 |
| 2.17 | Contact custom fields appear only on the Scheduled contacts "record contact" form, not in Add Contact | Extra questions set up for contacts are mostly never asked | Show them in Add Contact |
| 2.18 | **Send test email** always uses the standard wording, ignoring edits to the Test email template | Admins cannot preview their template | Use the stored template |
| 2.19 | The overdue-contacts email goes to every worker with overdue contacts whenever any contact becomes overdue | Some workers get more emails than they need | Send each worker one email a day, or only about their newly overdue items |
| 2.20 | Anonymising a guest does not remove names or details typed into free-text notes, or the contents of attached files | Personal data can remain in notes after anonymisation | Review free text as part of the anonymisation procedure (document 09), and add a redaction step later |
| 2.21 | "AFA" is expanded two ways: "Advice First Aid" at registration and "Advice, Financial & Advocacy" on the Initial Conversation tab | Confusing wording | Confirm the correct expansion and use it everywhere |

## 3. Later improvements

| # | Issue | Recommendation |
| --- | --- | --- |
| 3.1 | Automated tests cover the domain and application layers (74 unit tests), but the integration tests only check that the API starts, there are no browser tests and there is no continuous integration | Add API tests against a containerised SQL Server, a few browser tests for the main journeys, and a GitHub Actions workflow that must pass before merging to `main` |
| 3.2 | Dashboard counts are recalculated every 5 minutes rather than instantly | Acceptable by design for performance; say so in training |
| 3.3 | The hub-wide Documents page is hidden from the menu but still available at /documents; it is the only place to see documents not linked to a guest, and documents of anonymised guests | Keep it for administrators, or add an Admin-only menu entry |
| 3.4 | Permissions removed from a built-in role are added back when the system restarts | By design, so the built-in roles always work; create a custom role instead of changing a built-in one |
| 3.5 | Operations: the health check does not test the database; the audit log grows without archiving (SQL Server Express databases are limited to 10 GB); there is no screen to add a hub; base images are refreshed only when rebuilt with `--pull`; some background events can be lost if the service stops mid-delivery | See document 05, section 15, and the routine checks in document 06 |
| 3.6 | Stylesheets use the older Sass `@import` syntax, and several screen stylesheets exceed the size budget (warnings only) | Move to Sass `@use` and split the largest stylesheets when those screens are next changed |
| 3.7 | Small wording and display issues: Recommendation is starred in Add Contact but required only for CPN sessions; Contact History's search says it searches notes but matches names and G-numbers; Scheduled contacts' search mentions a reference number but matches an internal id; the Record contact dialog shows raw values such as "NoAnswer"; the greeting always says "Good Morning"; "Next DIALOG assessment due" always says "Not yet scheduled"; the anonymise reason is labelled optional but is required; the guest's "urgent episodes" count actually counts flagged risk assessments; "Full caseload report" opens the Overview tab; registration accepts a next contact date in the past | Fix together in one tidy-up release |
| 3.8 | The repository README is partly out of date | Treat documents 05 and 06 as the current reference, and update the README |

## 4. Fixed in the 30 September release

Found during round 1 testing or while preparing this handover, and fixed. Document 07 has the full list.

- Guest records, urgent cases and dashboard counts could not be opened by clicking.
- Submitting a contact note did not count as activity, so it did not bring an Inactive guest back to Active.
- The guest record header never showed the Urgent badge or the last activity date.
- Overdue scheduled contacts dropped out of the counts after the overnight check.
- The CMHW dashboard showed hub-wide numbers instead of the worker's own.
- Settings such as the sign-out time and upload limits applied only after an Admin saved Settings.
- Clicking outside the Add Contact form closed it and lost the text.
- The CPN role could be deleted; password rules were shown incompletely; the reset page hid the reason a password was refused.
- Links in emails sent by the background service had no website address.
- The Urgent Cases menu count did not go down when a case was resolved; report export buttons showed for roles that cannot export; the guest search matched names only.
- Practical-support categories were shown as pathways, and the three pathways had different names on different screens. Only Mental Wellbeing, Clinical Support and Community Recovery are shown now.

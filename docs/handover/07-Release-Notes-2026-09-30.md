# EMHIP Release Notes: 30 September 2026

_Version 1.0 · 30 September 2026 · For: the customer project team, Hub Managers and administrators_

This release answers the customer's first round of testing feedback (EMHIP EPR Build Feedback, Dashboard Review). All 13 items in the feedback sheet are fixed, and further problems found while preparing the handover are resolved too. There are no database changes and no new settings. One configuration line is added for the background service (see the upgrade notes).

## At a glance

| Area | Change |
| --- | --- |
| Pathways | Only Mental Wellbeing, Clinical Support and Community Recovery, everywhere; practical-support categories removed |
| Must fix (3 items) | Guest records, urgent cases and every dashboard count can now be opened with a click |
| Fixes (5 items) | Documents moved into the guest record; CPN activity separated from AFA & Hospitality; DIALOG scores can be filtered by demographics; exports include demographics and referral sources; the reports tab bar shows when more tabs exist |
| Terminology (5 items) | "Inactive" replaces "On hold"; "Contact" replaces "Follow-up"; menu typo fixed; plain-English activity log; full CMHW names |
| Also fixed | Contacts now count as activity; the Urgent badge and last activity show on the guest record; overdue contacts stay counted; the CMHW dashboard shows the worker's own numbers; settings apply to everyone; wider guest search; clearer password rules; and more (below) |

## Fixes from the feedback sheet

Numbers match the customer's feedback sheet. The copy of the sheet returned with this release (EMHIP\_EPR\_Testing\_Feedback\_Responses.xlsx) marks each item Resolved and says how to retest it.

| # | Feedback | What changed |
| --- | --- | --- |
| 1 | Cannot open individual guest profiles from the guest list | Guest names are now links. Clicking the name, anywhere on the row, or **Open** opens the full record, and Ctrl-click or Cmd-click opens it in a new tab. If a page was left open while the system was updated, clicking now reloads straight into the record instead of doing nothing. |
| 2 | Cannot open urgent cases | Clicking an active urgent case opens **Urgent Case Details**, which now also has **Open full episode record**. Resolved cases could not be clicked at all before; clicking one now opens its episode record. |
| 3 | Dashboard tiles and lists are not clickable | Every count on the Hub Manager dashboard opens the guests behind it: the Active, New and Inactive tiles; the Urgent Cases tile (opens Urgent Cases); pathway rows; clinical complexity tiles such as SMI; demographics bars; CPN tiles and CPN guest rows; each CMHW's caseload row and their Active and Urgent numbers; data quality rows; and the guest named in each staff activity line. The guest list shows a banner naming what was clicked, with **Show all guests** to clear it. The CMHW dashboard's tiles work the same way. |
| 5 | Remove Documents as a standalone menu item | Documents is no longer in the menu. Documents are managed from the guest's **Documents** tab, where an upload is linked to that guest automatically. |
| 6 | Remove CPN sessions from the AFA & Hospitality tile | The tile now counts AFA and hospitality contacts only. A new **CPN activity** section shows CPN contacts, sessions, initial assessments and guests seen by CPN, and **Show CPN contacts only** filters the list. |
| 8 | Cross-filter demographics with DIALOG scores | **Reports → DIALOG Outcomes** has a **Demographics** filter for ethnicity, age group, gender and country of origin. Every figure on the tab recalculates for the chosen group, for example Black African guests only, and the group carries into the Excel export. |
| 9 | Add demographics and referral sources to the Excel export | The Excel workbook has two new sheets, **Demographics** and **Referral sources**, with counts and percentages for all guests and for the reporting period. The CSV export gains ethnicity, age group, gender, country of origin, referral source and referral type columns. |
| 10 | Make it clear the reports tab bar scrolls | Arrow buttons and a faded edge appear on whichever side has more tabs, and the selected tab scrolls into view. |
| 11 | "On hold" to "Inactive" | Changed on status badges, filters, dashboard tiles, reports, exports, data quality and preview panels. |
| 12 | "Follow-up" to "Contact" | Changed throughout, including Contact activity, Total contacts recorded, Overdue contacts, the urgent-case contact window, the Add Contact form (CPN "contact sessions"), the Scheduled contacts screen, settings, lookups and emails. DIALOG "follow-up assessments" are now called **reassessments**, because "contact assessment" would be misleading. |
| 13 | Typo "CASE MANGEMENT" | The menu heading reads CASE MANAGEMENT. |
| 14 | Technical labels in the staff activity log | Activity is described in plain English, for example "Opened guest record" and "Viewed urgent case", with the guest's name and G-number, and the name opens the record. Repeated lines are merged. A guest's **Access Log** uses the same wording. |
| 15 | CMHW names cut off | Full names are shown, wrapping onto a second line, in the guest list, dashboard tables and preview panels; the CMHW filter shows the full name on hover. |

## Pathways

EMHIP has three pathways only: **Mental Wellbeing**, **Clinical Support** and **Community Recovery**.

- The **Pathway** filter and column on the guest list, the dashboard preview panels, the CMHW dashboard and **Reports → Guest Report** now use these three. Before, they showed practical-support categories (Housing Advice, Employment Support, Benefits & Financial Support, Food Essentials, Immigration & Legal Advice, Other Practical Advice).
- The **Support Referrals** card on the guest's **Pathway History** tab is removed from view. Referrals already recorded are kept in the database.
- **Reports → Overview → Pathway distribution** shows how many guests are on each of the three pathways now, instead of referrals by category.
- **Export CSV** now has one row per guest registered in the period, with their pathway, status, demographics and referral source. Before, it had one row per practical-support referral.
- The three names are the same on every screen, export and episode record. Before, some screens said "Wellbeing support", "Additional / Clinical" or "Community & Recovery".
- Opening the guest list from a dashboard count now shows the chosen Pathway or Status in its dropdown.

## Also fixed

Found while fixing the feedback items or while preparing the handover documents.

**Everyday work**

- **Add Contact and the CPN initial assessment now count as activity.** Before, only a contact logged from Scheduled contacts did. So submitting a contact note did not bring an Inactive guest back to Active, and did not restart the 90-day inactivity clock.
- **The guest record header now shows the Urgent badge** (with the date raised) **and the last activity date**, and the Overview's "Days since last activity" is filled in. Before, they were always blank.
- **Overdue scheduled contacts no longer disappear.** An overnight check marks past-due contacts as overdue, and they then dropped out of the overdue counts, banners, the Next Contact column and the caseload report. They are now counted until someone completes them.
- **The CMHW dashboard shows the worker's own numbers.** Active caseload, Due today, Overdue contacts and Actions pending today now count only the signed-in worker's guests and scheduled contacts. Before, they mixed in the whole hub's figures and completed items.
- **Clicking outside the Add Contact form no longer closes it** and throws away what was typed. It closes with the × or Cancel.
- **Guest search** now matches the G-number (for example G-1001), phone number and CMHW name, as the search box says. Before, only names matched.
- **Guest record → Demographics → Next steps** reflects what has been recorded. Before, it always pointed at the initial conversation, even when that was completed during registration. It now ticks off the initial conversation and DIALOG baseline with their dates, and its main button leads to the first step still to do.
- **Register New Guest, step 2:** a detail field (allergy details, family history details, inpatient year and location, diagnosis group and reported diagnosis, and the risk-history comments) is cleared and greyed out when its question is answered **No** or **Unknown**, and opens again for **Yes** or **Unsure**. Before, a detail typed earlier stayed and was saved against a "No".

**Settings and administration**

- **Settings now take effect for every member of staff.** The sign-out-after-inactivity time, the upload size and file-type limits, and the organisation name were loaded only after an Admin saved Settings, so everyone else got the built-in defaults.
- **Setting descriptions match what the settings do**, including the inactivity threshold, the overdue-contacts email, the organisation name and the support email.
- **Password rules are shown in full**: at least 10 characters, with an upper-case letter, a lower-case letter and a number. **Add hub worker** and **Reset password** show the reason a password is refused, and the public **Reset password** page names the rule instead of saying the link is invalid.
- **The CPN role is protected like the other built-in roles** and can no longer be deleted by mistake.
- **Links in emails sent by the background service** (urgent case raised, overdue contacts) now point at the website. Before, they had no address.

**Reports and navigation**

- **Reports → Data Quality**: each issue has **View guests**, which opens the affected guests.
- **Reports**: the export buttons are hidden for roles without export permission (CMHW and CPN). Before, they were shown and then failed.
- **Urgent Cases menu badge**: the count now goes down as soon as a case is resolved. Before, it only updated when a new case was raised or the page was reloaded.
- **After an update**: a browser tab left open while the system was updated could stop responding to clicks. It now reloads itself into the page that was clicked.

## What users will notice

- Wording: "Inactive", "contact", "Scheduled contacts" (the screen formerly called the Follow-up log) and "reassessments".
- Documents is not in the menu. The hub-wide Documents page still exists for administrators at /documents, but staff should use each guest's Documents tab.
- Dashboard numbers are links, and hovering over them shows a pointer.
- CMHWs and CPNs will see smaller numbers on their dashboard than before, because the tiles now count only their own caseload and scheduled contacts.
- Overdue counts may rise straight after the update, because contacts that had silently dropped out of the counts are included again.
- The dashboard's counts are recalculated every 5 minutes, so straight after a change a tile can briefly differ from the list it opens. This is not new, but it is now easier to notice.

## Upgrade notes for administrators

- **Deployment:** no database migration and no new settings. The background service (`workers`) now reads the site address from `PUBLIC_ORIGIN` in `.env`, as the API already does. Check that `PUBLIC_ORIGIN` is `https://emhip.brainshub.co.uk`.
- **Email templates:** the default wording of the overdue-contacts email now says "contact". A template you have already edited in **Settings → Email templates** keeps your wording; use **Restore default** to take the new text.
- **Dashboard labels** such as the data quality issue "Guests automatically moved to Inactive" update at the next 5-minute refresh after deployment.
- **Inactive guests with recent contact notes:** the activity fix applies to contacts recorded after the update. A guest who had a contact note submitted while Inactive stays Inactive until their next contact.
- **Roles:** the permission group shown as "Follow-ups" in Roles & Permissions is now labelled "Scheduled contacts". The permissions themselves are unchanged.

## Retesting

The Tester Guide (document 03 in this pack) has the full list of changes with a column for retest results, every workflow, and an end-to-end checklist. Known issues that are not fixed in this release are listed in document 08, Known Issues and Recommendations.
